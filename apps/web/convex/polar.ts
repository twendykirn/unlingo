import { Polar } from '@convex-dev/polar';
import { components, internal } from './_generated/api';
import { Id } from './_generated/dataModel';

export const polar = new Polar(components.polar, {
    products: {
        pro50kRequests: process.env.POLAR_PRO_50K_PRODUCT_ID!,
        pro250kRequests: process.env.POLAR_PRO_250K_PRODUCT_ID!,
        pro500kRequests: process.env.POLAR_PRO_500K_PRODUCT_ID!,
        pro1mRequests: process.env.POLAR_PRO_1M_PRODUCT_ID!,
        pro2mRequests: process.env.POLAR_PRO_2M_PRODUCT_ID!,
        pro10mRequests: process.env.POLAR_PRO_10M_PRODUCT_ID!,
        pro50mRequests: process.env.POLAR_PRO_50M_PRODUCT_ID!,
        pro100mRequests: process.env.POLAR_PRO_100M_PRODUCT_ID!,
    },
    getUserInfo: async ctx => {
        const workspace: { _id: Id<'workspaces'>; contactEmail: string } = await ctx.runQuery(
            internal.workspaces.getWorkspaceInfo
        );
        return {
            userId: workspace._id,
            email: workspace.contactEmail,
        };
    },
});

// Export API functions from the Polar client
export const {
    changeCurrentSubscription,
    cancelCurrentSubscription,
    generateCheckoutLink,
    generateCustomerPortalUrl,
    getConfiguredProducts,
} = polar.api();
