import { internalMutation, internalQuery, MutationCtx, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";
import { getCurrentMonth } from "./utils";
import { authMiddleware } from "../middlewares/auth";

export const verifyWorkspaceContactEmail = mutation({
  args: {
    contactEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_contactEmail", (q) => q.eq("contactEmail", args.contactEmail))
      .first();

    return { success: existingWorkspace === null };
  },
});

export const createOrganizationWorkspace = mutation({
  args: {
    clerkOrgId: v.string(),
    contactEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_contactEmail", (q) => q.eq("contactEmail", args.contactEmail))
      .first();

    if (existingWorkspace) {
      throw new Error("A workspace with this contact email already exists. Please use a different email address.");
    }

    const currentMonth = getCurrentMonth();

    const workspaceUsageId = await ctx.db.insert("workspaceUsage", {
      month: currentMonth,
      requests: 0,
    });

    const workspaceId = await ctx.db.insert("workspaces", {
      clerkId: args.clerkOrgId,
      contactEmail: args.contactEmail,
      currentUsage: {
        translationKeys: 0,
      },
      limits: {
        requests: 10000,
        translationKeys: 1000,
      },
      workspaceUsageId,
    });

    // Schedule Polar customer creation asynchronously
    await ctx.scheduler.runAfter(0, internal.polarActions.createPolarCustomer, {
      workspaceId,
      email: args.contactEmail,
    });

    console.log(`Created team workspace for organization ${args.clerkOrgId} by user ${identity.issuer}`);
    return workspaceId;
  },
});


export const deleteOrganizationWorkspace = internalMutation({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkOrgId))
      .first();

    if (!workspace) {
      console.log(`No workspace found for organization ${args.clerkOrgId}`);
      return;
    }

    await deleteWorkspaceAndRelatedData(ctx, workspace._id, workspace.workspaceUsageId);
    console.log(`Deleted workspace for organization ${args.clerkOrgId}`);
  },
});

async function deleteWorkspaceAndRelatedData(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  workspaceUsageId: Id<"workspaceUsage">,
) {
  // Schedule Polar customer deletion asynchronously
  try {
    await ctx.scheduler.runAfter(0, internal.polarActions.deletePolarCustomer, {
      workspaceId,
    });
    console.log(`Scheduled Polar customer deletion for workspace ${workspaceId}`);
  } catch (error) {
    console.warn(`Failed to schedule Polar customer deletion for workspace ${workspaceId}:`, error);
  }

  await ctx.db.delete(workspaceUsageId);

  const projects = await ctx.db
    .query("projects")
    .withIndex("by_workspace_name", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  for (const project of projects) {
    await ctx.db.patch(project._id, { status: -1 });

    await ctx.scheduler.runAfter(0, internal.keys.deleteUnkeyIdentity, {
      projectId: project._id,
      workspaceId,
    });
  }

  for (const project of projects) {
    await ctx.scheduler.runAfter(0, internal.projects.deleteProjectContents, {
      projectId: project._id,
      table: "translationValues",
      cursor: null,
    });
  }

  await ctx.db.delete(workspaceId);
}

export const getWorkspaceInfo = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.org as string))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    return workspace;
  },
});

export const getWorkspaceWithSubscription = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const hasOrgAccess = identity.org === args.clerkId;

    if (!hasOrgAccess) {
      // For race condition during org creation, return null instead of throwing
      return null;
    }

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!workspace) {
      return null;
    }

    try {
      // Get customer for this workspace
      const customer = await ctx.db
        .query("polarCustomers")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .unique();

      if (!customer) {
        return {
          ...workspace,
          isPremium: false,
        };
      }

      // Get active subscription (endedAt is null)
      const currentSubscription = await ctx.db
        .query("polarSubscriptions")
        .withIndex("by_customer_ended_at", (q) =>
          q.eq("customerId", customer._id).eq("endedAt", null)
        )
        .unique();

      const isPremium =
        currentSubscription &&
        currentSubscription.status === "active" &&
        !currentSubscription.customerCancellationReason;

      console.log(
        `Workspace ${workspace._id} premium status: ${isPremium}, subscription: ${currentSubscription?.polarId || "none"}`,
      );

      return {
        ...workspace,
        isPremium: Boolean(isPremium),
      };
    } catch (error) {
      // If Polar query fails, fall back to free tier
      console.warn(`Failed to get subscription for workspace ${workspace._id}:`, error);
      return {
        ...workspace,
        isPremium: false,
      };
    }
  },
});

export const getWorkspaceForAuthMiddlewareAction = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    try {
      const workspace = await authMiddleware(ctx, args.workspaceId);
      return workspace;
    } catch (error) {
      throw new Error("Workspace not found or access denied");
    }
  },
});


export const updateWorkspaceContactEmail = mutation({
  args: {
    clerkId: v.string(),
    contactEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Handle race condition: during org creation, Clerk's token might not have updated yet
    const hasOrgAccess = identity.org === args.clerkId;

    if (!hasOrgAccess) {
      throw new Error("Unauthorized: Can only update organization workspaces - please try again in a moment");
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_contactEmail", (q) => q.eq("contactEmail", args.contactEmail))
      .first();

    if (existingWorkspace) {
      throw new Error("A workspace with this contact email already exists. Please use a different email address.");
    }

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.contactEmail === args.contactEmail) {
      return { success: true };
    }

    await ctx.db.patch(workspace._id, {
      contactEmail: args.contactEmail,
    });

    // Schedule Polar customer email update
    await ctx.scheduler.runAfter(0, internal.polarActions.updatePolarCustomerEmail, {
      workspaceId: workspace._id,
      email: args.contactEmail,
    });

    return { success: true };
  },
});

export const updateWorkspaceLimits = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    tier: v.union(v.literal("starter"), v.literal("hobby"), v.literal("premium")),
    requestLimit: v.optional(v.number()),
    translationKeysLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    let limits;
    switch (args.tier) {
      case "starter":
        limits = {
          requests: 10000,
          translationKeys: 1000,
        };
        break;
      case "hobby":
        limits = {
          requests: 50000,
          translationKeys: 5000,
        };
        break;
      case "premium":
        limits = {
          requests: args.requestLimit || 250000,
          translationKeys: args.translationKeysLimit || 15000,
        };
        break;
      default:
        throw new Error("Invalid tier");
    }

    await ctx.db.patch(workspace._id, { limits });

    console.log(`Updated limits for workspace ${workspace._id}, tier: ${args.tier}`);
    return { success: true };
  },
});

export const getCurrentUsage = query({
  args: {
    clerkId: v.string(),
    workspaceUsageId: v.id("workspaceUsage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Handle race condition: during org creation, Clerk's token might not have updated yet
    const hasOrgAccess = identity.org === args.clerkId;

    if (!hasOrgAccess) {
      return null;
    }

    const currentMonth = getCurrentMonth();
    const usage = await ctx.db.get(args.workspaceUsageId);

    let currentRequests = 0;
    if (usage && usage.month === currentMonth) {
      currentRequests = usage.requests;
    }

    return {
      requests: currentRequests,
      month: currentMonth,
    };
  },
});
