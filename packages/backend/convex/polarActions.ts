import { v } from "convex/values";
import { action, internalAction, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { PolarCore } from "@polar-sh/sdk/core.js";
import { customersCreate } from "@polar-sh/sdk/funcs/customersCreate.js";
import { customersDelete } from "@polar-sh/sdk/funcs/customersDelete.js";
import { customersUpdate } from "@polar-sh/sdk/funcs/customersUpdate.js";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { customerSessionsCreate } from "@polar-sh/sdk/funcs/customerSessionsCreate.js";
import { subscriptionsUpdate } from "@polar-sh/sdk/funcs/subscriptionsUpdate.js";
import { productsList } from "@polar-sh/sdk/funcs/productsList.js";
import { getPolarConfig, convertToDatabaseProduct, getProductIds } from "./polarUtils";

/**
 * Get configured Polar client
 */
const getPolarClient = () => {
  const config = getPolarConfig();
  return new PolarCore({
    accessToken: config.organizationToken,
    server: config.server,
  });
};

// ============================================================================
// CUSTOMER ACTIONS
// ============================================================================

/**
 * Create a Polar customer for a workspace
 * Uses workspaceId as externalId in Polar for easy lookup
 */
export const createPolarCustomer = internalAction({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const polar = getPolarClient();

    // Check if customer already exists in our database
    const existingCustomer = await ctx.runQuery(internal.polarDb.getCustomerByWorkspaceId, {
      workspaceId: args.workspaceId,
    });

    if (existingCustomer) {
      console.log(`Customer already exists for workspace ${args.workspaceId}`);
      return existingCustomer;
    }

    // Create customer in Polar with workspaceId as external ID
    const result = await customersCreate(polar, {
      email: args.email,
      externalId: args.workspaceId,
      metadata: {
        workspaceId: args.workspaceId,
      },
    });

    if (!result.value) {
      console.error("Failed to create Polar customer:", result);
      throw new Error("Failed to create Polar customer");
    }

    // Store customer in our database
    await ctx.runMutation(internal.polarDb.createCustomer, {
      polarId: result.value.id,
      workspaceId: args.workspaceId,
      email: args.email,
      metadata: { workspaceId: args.workspaceId },
    });

    console.log(`Created Polar customer ${result.value.id} for workspace ${args.workspaceId}`);

    return {
      polarId: result.value.id,
      workspaceId: args.workspaceId,
      email: args.email,
    };
  },
});

/**
 * Delete Polar customer when workspace is deleted
 */
export const deletePolarCustomer = internalAction({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const polar = getPolarClient();

    const customer = await ctx.runQuery(internal.polarDb.getCustomerByWorkspaceId, {
      workspaceId: args.workspaceId,
    });

    if (!customer) {
      console.log(`No Polar customer found for workspace ${args.workspaceId}`);
      return;
    }

    try {
      // Delete from Polar
      await customersDelete(polar, {
        id: customer.polarId,
      });
      console.log(`Deleted Polar customer ${customer.polarId}`);
    } catch (error) {
      console.warn(`Failed to delete Polar customer ${customer.polarId}:`, error);
    }

    // Delete from our database (including subscriptions)
    await ctx.runMutation(internal.polarDb.deleteCustomer, {
      workspaceId: args.workspaceId,
    });
  },
});

/**
 * Update Polar customer email
 */
export const updatePolarCustomerEmail = internalAction({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const polar = getPolarClient();

    const customer = await ctx.runQuery(internal.polarDb.getCustomerByWorkspaceId, {
      workspaceId: args.workspaceId,
    });

    if (!customer) {
      console.log(`No Polar customer found for workspace ${args.workspaceId}`);
      return;
    }

    try {
      // Update in Polar
      await customersUpdate(polar, {
        id: customer.polarId,
        customerUpdate: {
          email: args.email,
        },
      });

      // Update in our database
      await ctx.runMutation(internal.polarDb.updateCustomerEmail, {
        workspaceId: args.workspaceId,
        email: args.email,
      });

      console.log(`Updated Polar customer email for workspace ${args.workspaceId}`);
    } catch (error) {
      console.error(`Failed to update Polar customer email:`, error);
      throw error;
    }
  },
});

// ============================================================================
// CHECKOUT & PORTAL ACTIONS
// ============================================================================

/**
 * Generate checkout link for purchasing a subscription
 */
export const generateCheckoutLink = action({
  args: {
    productIds: v.array(v.string()),
    origin: v.string(),
    successUrl: v.string(),
    subscriptionId: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo);
    const polar = getPolarClient();

    // Get or create customer
    let customer = await ctx.runQuery(internal.polarDb.getCustomerByWorkspaceId, {
      workspaceId: workspace._id,
    });

    if (!customer) {
      // Create customer in Polar
      const customerResult = await ctx.runAction(internal.polarActions.createPolarCustomer, {
        workspaceId: workspace._id,
        email: workspace.contactEmail,
      });
      customer = {
        polarId: customerResult.polarId,
        workspaceId: customerResult.workspaceId,
        email: customerResult.email,
      };
    }

    // Create checkout session
    const checkout = await checkoutsCreate(polar, {
      allowDiscountCodes: true,
      customerId: customer.polarId,
      subscriptionId: args.subscriptionId,
      embedOrigin: args.origin,
      successUrl: args.successUrl,
      products: args.productIds,
    });

    if (!checkout.value) {
      console.error("Failed to create checkout:", checkout);
      throw new Error("Failed to create checkout");
    }

    return { url: checkout.value.url };
  },
});

/**
 * Generate customer portal URL
 */
export const generateCustomerPortalUrl = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo);
    const polar = getPolarClient();

    const customer = await ctx.runQuery(internal.polarDb.getCustomerByWorkspaceId, {
      workspaceId: workspace._id,
    });

    if (!customer) {
      throw new Error("Customer not found. Please subscribe first.");
    }

    const session = await customerSessionsCreate(polar, {
      customerId: customer.polarId,
    });

    if (!session.value) {
      console.error("Failed to create customer session:", session);
      throw new Error("Failed to create customer portal session");
    }

    return { url: session.value.customerPortalUrl };
  },
});

// ============================================================================
// SUBSCRIPTION ACTIONS
// ============================================================================

/**
 * Change current subscription to a different product
 */
export const changeCurrentSubscription = action({
  args: {
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo);
    const polar = getPolarClient();

    const subscription = await ctx.runQuery(internal.polarDb.getCurrentSubscriptionInternal, {
      workspaceId: workspace._id,
    });

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    if (subscription.productId === args.productId) {
      throw new Error("Already subscribed to this product");
    }

    const result = await subscriptionsUpdate(polar, {
      id: subscription.polarId,
      subscriptionUpdate: {
        productId: args.productId,
      },
    });

    if (!result.value) {
      console.error("Failed to update subscription:", result);
      throw new Error("Failed to change subscription");
    }

    return result.value;
  },
});

/**
 * Cancel current subscription
 */
export const cancelCurrentSubscription = action({
  args: {
    revokeImmediately: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo);
    const polar = getPolarClient();

    const subscription = await ctx.runQuery(internal.polarDb.getCurrentSubscriptionInternal, {
      workspaceId: workspace._id,
    });

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    if (subscription.status !== "active") {
      throw new Error("Subscription is not active");
    }

    const result = await subscriptionsUpdate(polar, {
      id: subscription.polarId,
      subscriptionUpdate: args.revokeImmediately
        ? { revoke: true }
        : { cancelAtPeriodEnd: true },
    });

    if (!result.value) {
      console.error("Failed to cancel subscription:", result);
      throw new Error("Failed to cancel subscription");
    }

    return result.value;
  },
});

// ============================================================================
// PRODUCT SYNC ACTIONS
// ============================================================================

/**
 * Sync products from Polar
 */
export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    const polar = getPolarClient();

    let page = 1;
    let maxPage;

    do {
      const result = await productsList(polar, {
        page,
        limit: 100,
      });

      if (!result.value) {
        throw new Error("Failed to fetch products from Polar");
      }

      page = page + 1;
      maxPage = result.value.result.pagination.maxPage;

      const products = result.value.result.items.map(convertToDatabaseProduct);

      await ctx.runMutation(internal.polarDb.upsertProducts, {
        products,
      });
    } while (maxPage >= page);

    console.log("Products synced from Polar");
  },
});

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get configured products (products mapped by key)
 */
export const getConfiguredProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.runQuery(api.polarDb.listProducts, {
      includeArchived: false,
    });

    const productIds = getProductIds();

    const result: Record<string, typeof products[number] | undefined> = {};

    for (const [key, id] of Object.entries(productIds)) {
      result[key] = products.find((p) => p.polarId === id);
    }

    return result;
  },
});

/**
 * List all products
 */
export const listAllProducts = query({
  args: {},
  handler: async (ctx) => {
    return ctx.runQuery(api.polarDb.listProducts, {
      includeArchived: false,
    });
  },
});
