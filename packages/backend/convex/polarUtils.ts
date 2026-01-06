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
export const convertWebhookSubscription = (
  subscription: Subscription,
): Omit<PolarSubscriptionData, "customerId"> => {
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
      recurringInterval:
        price.type === "recurring"
          ? price.recurringInterval ?? undefined
          : undefined,
      priceAmount: price.amountType === "fixed" ? price.priceAmount : undefined,
      priceCurrency:
        price.amountType === "fixed" || price.amountType === "custom"
          ? price.priceCurrency
          : undefined,
      minimumAmount:
        price.amountType === "custom" ? price.minimumAmount : undefined,
      maximumAmount:
        price.amountType === "custom" ? price.maximumAmount : undefined,
      presetAmount:
        price.amountType === "custom" ? price.presetAmount : undefined,
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
 * Product tier configuration
 */
export const PRODUCT_CONFIG = {
  pro10kRequests: {
    tier: "starter" as const,
    requests: 10000,
    translationKeys: 1000,
  },
  pro50kRequests: {
    tier: "hobby" as const,
    requests: 50000,
    translationKeys: 5000,
  },
  pro250kRequests: {
    tier: "premium" as const,
    requests: 250000,
    translationKeys: 25000,
  },
  pro500kRequests: {
    tier: "premium" as const,
    requests: 500000,
    translationKeys: 50000,
  },
  pro1mRequests: {
    tier: "premium" as const,
    requests: 1000000,
    translationKeys: 100000,
  },
  pro2mRequests: {
    tier: "premium" as const,
    requests: 2000000,
    translationKeys: 200000,
  },
  pro10mRequests: {
    tier: "premium" as const,
    requests: 10000000,
    translationKeys: 200000,
  },
  pro50mRequests: {
    tier: "premium" as const,
    requests: 50000000,
    translationKeys: 200000,
  },
  pro100mRequests: {
    tier: "premium" as const,
    requests: 100000000,
    translationKeys: 200000,
  },
} as const;

/**
 * Get product IDs from environment
 */
export const getProductIds = () => ({
  pro10kRequests: process.env.POLAR_PRO_10K_PRODUCT_ID!,
  pro50kRequests: process.env.POLAR_PRO_50K_PRODUCT_ID!,
  pro250kRequests: process.env.POLAR_PRO_250K_PRODUCT_ID!,
  pro500kRequests: process.env.POLAR_PRO_500K_PRODUCT_ID!,
  pro1mRequests: process.env.POLAR_PRO_1M_PRODUCT_ID!,
  pro2mRequests: process.env.POLAR_PRO_2M_PRODUCT_ID!,
  pro10mRequests: process.env.POLAR_PRO_10M_PRODUCT_ID!,
  pro50mRequests: process.env.POLAR_PRO_50M_PRODUCT_ID!,
  pro100mRequests: process.env.POLAR_PRO_100M_PRODUCT_ID!,
});

/**
 * Get tier info from product ID
 */
export const getTierFromProductId = (productId?: string): {
  tier: "starter" | "hobby" | "premium";
  requests: number;
  translationKeys: number;
} => {
  if (!productId) {
    return { tier: "starter", requests: 10000, translationKeys: 1000 };
  }

  const productIds = getProductIds();

  for (const [key, id] of Object.entries(productIds)) {
    if (id === productId && key in PRODUCT_CONFIG) {
      return PRODUCT_CONFIG[key as keyof typeof PRODUCT_CONFIG];
    }
  }

  return { tier: "starter", requests: 10000, translationKeys: 1000 };
};

/**
 * Omit Convex system fields from a document
 */
export const omitSystemFields = <
  T extends { _id: unknown; _creationTime: number } | null | undefined,
>(
  doc: T,
): T extends null | undefined ? T : Omit<NonNullable<T>, "_id" | "_creationTime"> => {
  if (!doc) {
    return doc as any;
  }
  const { _id, _creationTime, ...rest } = doc;
  return rest as any;
};
