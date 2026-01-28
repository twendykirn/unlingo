import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { omitSystemFields } from "./polarUtils";

/**
 * Get customer by workspace ID
 */
export const getCustomerByWorkspaceId = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    return customer ? omitSystemFields(customer) : null;
  },
});

/**
 * Create a new customer
 */
export const createCustomer = internalMutation({
  args: {
    polarId: v.string(),
    workspaceId: v.id("workspaces"),
    email: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const existingCustomer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    if (existingCustomer) {
      throw new Error(`Customer already exists for workspace: ${args.workspaceId}`);
    }

    return ctx.db.insert("polarCustomers", {
      polarId: args.polarId,
      workspaceId: args.workspaceId,
      email: args.email,
      metadata: args.metadata,
    });
  },
});

/**
 * Update customer email
 */
export const updateCustomerEmail = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    if (!customer) {
      return null;
    }

    await ctx.db.patch(customer._id, { email: args.email });
    return customer._id;
  },
});

/**
 * Delete customer
 */
export const deleteCustomer = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    if (!customer) {
      return null;
    }

    // Delete all subscriptions for this customer first
    const subscriptions = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }

    // Delete the customer
    await ctx.db.delete(customer._id);
    return customer._id;
  },
});

/**
 * Get current active subscription for a workspace
 */
export const getCurrentSubscription = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    if (!customer) {
      return null;
    }

    // Find active subscription (endedAt is null)
    const subscription = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_customer_ended_at", (q) => q.eq("customerId", customer._id).eq("endedAt", null))
      .unique();

    if (!subscription) {
      return null;
    }

    // Get the product
    const product = await ctx.db
      .query("polarProducts")
      .withIndex("by_polar_id", (q) => q.eq("polarId", subscription.productId))
      .unique();

    return {
      ...omitSystemFields(subscription),
      product: product ? omitSystemFields(product) : null,
    };
  },
});

/**
 * Internal version of getCurrentSubscription
 */
export const getCurrentSubscriptionInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    if (!customer) {
      return null;
    }

    const subscription = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_customer_ended_at", (q) => q.eq("customerId", customer._id).eq("endedAt", null))
      .unique();

    if (!subscription) {
      return null;
    }

    const product = await ctx.db
      .query("polarProducts")
      .withIndex("by_polar_id", (q) => q.eq("polarId", subscription.productId))
      .unique();

    return {
      ...omitSystemFields(subscription),
      product: product ? omitSystemFields(product) : null,
      customerId: customer._id,
    };
  },
});

/**
 * Create subscription
 */
export const createSubscription = internalMutation({
  args: {
    polarId: v.string(),
    polarCustomerId: v.string(),
    productId: v.string(),
    checkoutId: v.union(v.string(), v.null()),
    createdAt: v.string(),
    modifiedAt: v.union(v.string(), v.null()),
    amount: v.union(v.number(), v.null()),
    currency: v.union(v.string(), v.null()),
    recurringInterval: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.null()),
    status: v.string(),
    currentPeriodStart: v.string(),
    currentPeriodEnd: v.union(v.string(), v.null()),
    cancelAtPeriodEnd: v.boolean(),
    startedAt: v.union(v.string(), v.null()),
    endedAt: v.union(v.string(), v.null()),
    metadata: v.record(v.string(), v.any()),
    customerCancellationReason: v.optional(v.union(v.string(), v.null())),
    customerCancellationComment: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_polar_id", (q) => q.eq("polarId", args.polarId))
      .unique();

    if (existingSubscription) {
      throw new Error(`Subscription already exists: ${args.polarId}`);
    }

    // Find the customer by polar customer ID
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_polar_id", (q) => q.eq("polarId", args.polarCustomerId))
      .unique();

    if (!customer) {
      throw new Error(`Customer not found for Polar ID: ${args.polarCustomerId}`);
    }

    return ctx.db.insert("polarSubscriptions", {
      polarId: args.polarId,
      customerId: customer._id,
      polarCustomerId: args.polarCustomerId,
      productId: args.productId,
      checkoutId: args.checkoutId,
      createdAt: args.createdAt,
      modifiedAt: args.modifiedAt,
      amount: args.amount,
      currency: args.currency,
      recurringInterval: args.recurringInterval,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      metadata: args.metadata,
      customerCancellationReason: args.customerCancellationReason,
      customerCancellationComment: args.customerCancellationComment,
    });
  },
});

/**
 * Update subscription
 */
export const updateSubscription = internalMutation({
  args: {
    polarId: v.string(),
    productId: v.string(),
    modifiedAt: v.union(v.string(), v.null()),
    amount: v.union(v.number(), v.null()),
    currency: v.union(v.string(), v.null()),
    recurringInterval: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.null()),
    status: v.string(),
    currentPeriodStart: v.string(),
    currentPeriodEnd: v.union(v.string(), v.null()),
    cancelAtPeriodEnd: v.boolean(),
    startedAt: v.union(v.string(), v.null()),
    endedAt: v.union(v.string(), v.null()),
    metadata: v.record(v.string(), v.any()),
    customerCancellationReason: v.optional(v.union(v.string(), v.null())),
    customerCancellationComment: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_polar_id", (q) => q.eq("polarId", args.polarId))
      .unique();

    if (!existingSubscription) {
      throw new Error(`Subscription not found: ${args.polarId}`);
    }

    const { polarId, ...updateData } = args;

    await ctx.db.patch(existingSubscription._id, updateData);
    return existingSubscription._id;
  },
});

/**
 * List all products
 */
export const listProducts = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db.query("polarProducts");

    const products = args.includeArchived
      ? await q.collect()
      : await q.withIndex("by_is_archived", (q) => q.lt("isArchived", true)).collect();

    return products.map((p) => omitSystemFields(p));
  },
});

/**
 * Create product
 */
export const createProduct = internalMutation({
  args: {
    polarId: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    isRecurring: v.boolean(),
    isArchived: v.boolean(),
    createdAt: v.string(),
    modifiedAt: v.union(v.string(), v.null()),
    recurringInterval: v.optional(
      v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.null()),
    ),
    metadata: v.optional(v.record(v.string(), v.any())),
    prices: v.array(v.any()),
    medias: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const existingProduct = await ctx.db
      .query("polarProducts")
      .withIndex("by_polar_id", (q) => q.eq("polarId", args.polarId))
      .unique();

    if (existingProduct) {
      throw new Error(`Product already exists: ${args.polarId}`);
    }

    return ctx.db.insert("polarProducts", args);
  },
});

/**
 * Update product
 */
export const updateProduct = internalMutation({
  args: {
    polarId: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    isRecurring: v.boolean(),
    isArchived: v.boolean(),
    createdAt: v.string(),
    modifiedAt: v.union(v.string(), v.null()),
    recurringInterval: v.optional(
      v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year"), v.null()),
    ),
    metadata: v.optional(v.record(v.string(), v.any())),
    prices: v.array(v.any()),
    medias: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const existingProduct = await ctx.db
      .query("polarProducts")
      .withIndex("by_polar_id", (q) => q.eq("polarId", args.polarId))
      .unique();

    if (!existingProduct) {
      throw new Error(`Product not found: ${args.polarId}`);
    }

    const { polarId, ...updateData } = args;

    await ctx.db.patch(existingProduct._id, updateData);
    return existingProduct._id;
  },
});

/**
 * Upsert products (for sync)
 */
export const upsertProducts = internalMutation({
  args: {
    products: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    for (const product of args.products) {
      const existingProduct = await ctx.db
        .query("polarProducts")
        .withIndex("by_polar_id", (q) => q.eq("polarId", product.polarId))
        .unique();

      if (existingProduct) {
        await ctx.db.patch(existingProduct._id, product);
      } else {
        await ctx.db.insert("polarProducts", product);
      }
    }
  },
});
