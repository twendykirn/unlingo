import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import type { Product } from "@polar-sh/sdk/models/components/product.js";
import type { Doc, Id } from "./_generated/dataModel";

// Type definitions for our database records
export type PolarSubscriptionData = Omit<Doc<"polarSubscriptions">, "_id" | "_creationTime">;
export type PolarProductData = Omit<Doc<"polarProducts">, "_id" | "_creationTime">;
export type PolarCustomerData = Omit<Doc<"polarCustomers">, "_id" | "_creationTime">;

/**
 * Convert Polar SDK Subscription to database format
 */
export const convertToDatabaseSubscription = (
  subscription: Subscription,
  customerId: Id<"polarCustomers">,
): Omit<PolarSubscriptionData, "customerId"> & { customerId: Id<"polarCustomers"> } => {
  return {
    polarId: subscription.id,
    customerId,
    polarCustomerId: subscription.customerId,
    productId: subscription.productId,
    checkoutId: subscription.checkoutId,
    createdAt: subscription.createdAt.toISOString(),
    modifiedAt: subscription.modifiedAt?.toISOString() ?? null,
    amount: subscription.amount,
    currency: subscription.currency,
    recurringInterval: subscription.recurringInterval,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    startedAt: subscription.startedAt?.toISOString() ?? null,
    endedAt: subscription.endedAt?.toISOString() ?? null,
    metadata: subscription.metadata,
    customerCancellationReason: subscription.customerCancellationReason,
    customerCancellationComment: subscription.customerCancellationComment,
  };
};

/**
 * Convert Polar SDK Subscription from webhook to database format (without customerId conversion)
 */
export const convertWebhookSubscription = (subscription: Subscription): Omit<PolarSubscriptionData, "customerId"> => {
  return {
    polarId: subscription.id,
    polarCustomerId: subscription.customerId,
    productId: subscription.productId,
    checkoutId: subscription.checkoutId,
    createdAt: subscription.createdAt.toISOString(),
    modifiedAt: subscription.modifiedAt?.toISOString() ?? null,
    amount: subscription.amount,
    currency: subscription.currency,
    recurringInterval: subscription.recurringInterval,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    startedAt: subscription.startedAt?.toISOString() ?? null,
    endedAt: subscription.endedAt?.toISOString() ?? null,
    metadata: subscription.metadata,
    customerCancellationReason: subscription.customerCancellationReason,
    customerCancellationComment: subscription.customerCancellationComment,
  };
};

/**
 * Convert Polar SDK Product to database format
 */
export const convertToDatabaseProduct = (product: Product): PolarProductData => {
  return {
    polarId: product.id,
    organizationId: product.organizationId,
    name: product.name,
    description: product.description,
    isRecurring: product.isRecurring,
    isArchived: product.isArchived,
    createdAt: product.createdAt.toISOString(),
    modifiedAt: product.modifiedAt?.toISOString() ?? null,
    recurringInterval: product.recurringInterval,
    metadata: product.metadata,
    prices: product.prices.map((price) => ({
      id: price.id,
      productId: price.productId,
      amountType: price.amountType,
      isArchived: price.isArchived,
      createdAt: price.createdAt.toISOString(),
      modifiedAt: price.modifiedAt?.toISOString() ?? null,
      recurringInterval: price.type === "recurring" ? (price.recurringInterval ?? undefined) : undefined,
      priceAmount: price.amountType === "fixed" ? price.priceAmount : undefined,
      priceCurrency: price.amountType === "fixed" || price.amountType === "custom" ? price.priceCurrency : undefined,
      minimumAmount: price.amountType === "custom" ? price.minimumAmount : undefined,
      maximumAmount: price.amountType === "custom" ? price.maximumAmount : undefined,
      presetAmount: price.amountType === "custom" ? price.presetAmount : undefined,
      type: price.type,
    })),
    medias: product.medias.map((media) => ({
      id: media.id,
      organizationId: media.organizationId,
      name: media.name,
      path: media.path,
      mimeType: media.mimeType,
      size: media.size,
      storageVersion: media.storageVersion,
      checksumEtag: media.checksumEtag,
      checksumSha256Base64: media.checksumSha256Base64,
      checksumSha256Hex: media.checksumSha256Hex,
      createdAt: media.createdAt.toISOString(),
      lastModifiedAt: media.lastModifiedAt?.toISOString() ?? null,
      version: media.version,
      isUploaded: media.isUploaded,
      sizeReadable: media.sizeReadable,
      publicUrl: media.publicUrl,
    })),
  };
};

/**
 * Polar configuration - reads from environment variables
 */
export const getPolarConfig = () => {
  const organizationToken = process.env.POLAR_ORGANIZATION_TOKEN ?? "";
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET ?? "";
  const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox";

  return {
    organizationToken,
    webhookSecret,
    server,
  };
};

/**
 * Product tier configuration (keyed by price in dollars)
 */
export const PRODUCT_CONFIG = {
  pro5: {
    tier: "starter" as const,
    requests: 10000,
    translationKeys: 500,
  },
  pro12: {
    tier: "hobby" as const,
    requests: 50000,
    translationKeys: 2000,
  },
  pro25: {
    tier: "premium" as const,
    requests: 100000,
    translationKeys: 10000,
  },
  pro50: {
    tier: "premium" as const,
    requests: 200000,
    translationKeys: 20000,
  },
  pro75: {
    tier: "premium" as const,
    requests: 350000,
    translationKeys: 35000,
  },
  pro100: {
    tier: "premium" as const,
    requests: 500000,
    translationKeys: 50000,
  },
  pro250: {
    tier: "premium" as const,
    requests: 1500000,
    translationKeys: 75000,
  },
  pro500: {
    tier: "premium" as const,
    requests: 4000000,
    translationKeys: 100000,
  },
  pro1000: {
    tier: "premium" as const,
    requests: 10000000,
    translationKeys: 100000,
  },
} as const;

/**
 * Get product IDs from environment (keyed by price in dollars)
 */
export const getProductIds = () => ({
  pro5: process.env.POLAR_PRO_5_PRODUCT_ID!,
  pro12: process.env.POLAR_PRO_12_PRODUCT_ID!,
  pro25: process.env.POLAR_PRO_25_PRODUCT_ID!,
  pro50: process.env.POLAR_PRO_50_PRODUCT_ID!,
  pro75: process.env.POLAR_PRO_75_PRODUCT_ID!,
  pro100: process.env.POLAR_PRO_100_PRODUCT_ID!,
  pro250: process.env.POLAR_PRO_250_PRODUCT_ID!,
  pro500: process.env.POLAR_PRO_500_PRODUCT_ID!,
  pro1000: process.env.POLAR_PRO_1000_PRODUCT_ID!,
});

/**
 * Get tier info from product ID
 */
export const getTierFromProductId = (
  productId?: string,
): {
  tier: "starter" | "hobby" | "premium";
  requests: number;
  translationKeys: number;
} => {
  if (!productId) {
    return { tier: "starter", requests: 10000, translationKeys: 500 };
  }

  const productIds = getProductIds();

  for (const [key, id] of Object.entries(productIds)) {
    if (id === productId && key in PRODUCT_CONFIG) {
      return PRODUCT_CONFIG[key as keyof typeof PRODUCT_CONFIG];
    }
  }

  return { tier: "starter", requests: 10000, translationKeys: 500 };
};

/**
 * Omit Convex system fields from a document
 */
export const omitSystemFields = <T extends { _id: string; _creationTime: number } | null | undefined>(doc: T) => {
  if (!doc) {
    return doc;
  }
  const { _id, _creationTime, ...rest } = doc;
  return rest;
};
