import type { Id } from "../convex/_generated/dataModel";
import type { MutationCtx, QueryCtx, ActionCtx } from "../convex/_generated/server";
import { internal } from "../convex/_generated/api";

export const authMiddleware = async (
  ctx: MutationCtx | QueryCtx,
  workspaceId: Id<"workspaces">,
  onFail?: () => void,
) => {
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    // Get customer for this workspace
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .unique();

    let isPremium = false;
    if (customer) {
      // Get active subscription (endedAt is null)
      const currentSubscription = await ctx.db
        .query("polarSubscriptions")
        .withIndex("by_customer_ended_at", (q) =>
          q.eq("customerId", customer._id).eq("endedAt", null)
        )
        .unique();

      isPremium =
        currentSubscription !== null &&
        currentSubscription.status === "active" &&
        !currentSubscription.customerCancellationReason;
    }

    if (!isPremium) {
      throw new Error("Workspace not found or access denied");
    }

    return {
      ...workspace,
      isPremium: Boolean(isPremium),
    };
  } catch (error) {
    onFail?.();
    throw new Error("Workspace not found or access denied");
  }
};

export const authMiddlewareAction = async (ctx: ActionCtx, workspaceId: Id<"workspaces">) => {
  try {
    const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceForAuthMiddlewareAction, {
      workspaceId,
    });
    return workspace;
  } catch (error) {
    throw new Error("Workspace not found or access denied");
  }
};
