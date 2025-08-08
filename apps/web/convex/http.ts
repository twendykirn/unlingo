import type { WebhookEvent } from '@clerk/backend';
import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { polar } from './polar';
import { Id } from './_generated/dataModel';

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
    const payloadString = await req.text();
    const svixHeaders = {
        'svix-id': req.headers.get('svix-id')!,
        'svix-timestamp': req.headers.get('svix-timestamp')!,
        'svix-signature': req.headers.get('svix-signature')!,
    };
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    try {
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
    } catch (error) {
        console.error('Error verifying webhook event', error);
        return null;
    }
}

const http = httpRouter();

http.route({
    path: '/clerk-users-webhook',
    method: 'POST',
    handler: httpAction(async (ctx, request) => {
        const evt = await validateRequest(request);
        const svixId = request.headers.get('svix-id');

        if (!evt || !evt.type || !evt.data || !evt.data.id || !svixId) {
            console.error('HTTP Action: Webhook payload missing required fields (type, data.id).', event);
            return new Response('Invalid payload structure', { status: 400 });
        }

        console.log(`HTTP Action: Received Clerk event: ${evt.type} (ID: ${svixId})`);

        try {
            switch (evt.type) {
                case 'organization.created':
                    await ctx.runMutation(internal.workspaces.createOrganizationWorkspace, {
                        clerkOrgId: evt.data.id,
                    });
                    break;

                case 'organization.deleted':
                    await ctx.runMutation(internal.workspaces.deleteOrganizationWorkspace, {
                        clerkOrgId: evt.data.id,
                    });
                    break;
                default:
                    console.log('Ignored Clerk webhook event', evt.type);
            }

            return new Response(null, { status: 200 });
        } catch (error: any) {
            console.error(`Error processing Clerk event ${svixId} (${evt.type}):`, error);
            // Avoid recording event ID on failure here to allow potential retries from Clerk
            return new Response(`Webhook handler error: ${error.message || 'Unknown error'}`, { status: 500 });
        }
    }),
});

polar.registerRoutes(http, {
    // Optional custom path, default is "/polar/events"
    path: '/polar/events',
    onSubscriptionCreated: async (ctx, event) => {
        // Handle new active subscriptions - upgrade workspace limits
        const workspaceId = event.data.customerId;
        if (workspaceId) {
            await ctx.runMutation(internal.workspaces.updateWorkspaceLimits, {
                workspaceId: workspaceId as Id<'workspaces'>,
                isPremium: true,
                // Extract request limit from product metadata if available
                requestLimit: getRequestLimitFromProduct(event.data.product?.id),
            });
        }
    },
    onSubscriptionUpdated: async (ctx, event) => {
        // Handle subscription updates, including cancellations
        const workspaceId = event.data.customerId;
        if (workspaceId) {
            const isActive = event.data.status === 'active' && !event.data.customerCancellationReason;
            await ctx.runMutation(internal.workspaces.updateWorkspaceLimits, {
                workspaceId: workspaceId as Id<'workspaces'>,
                isPremium: isActive,
                requestLimit: isActive ? getRequestLimitFromProduct(event.data.product?.id) : undefined,
            });
        }
    },
});

// Helper function to determine request limits based on product ID
function getRequestLimitFromProduct(productId?: string): number | undefined {
    if (!productId) return undefined;

    const requestLimits: Record<string, number> = {
        [process.env.POLAR_PRO_250K_PRODUCT_ID!]: 250000,
        [process.env.POLAR_PRO_500K_PRODUCT_ID!]: 500000,
        [process.env.POLAR_PRO_1M_PRODUCT_ID!]: 1000000,
        [process.env.POLAR_PRO_2M_PRODUCT_ID!]: 2000000,
        [process.env.POLAR_PRO_10M_PRODUCT_ID!]: 10000000,
        [process.env.POLAR_PRO_50M_PRODUCT_ID!]: 50000000,
        [process.env.POLAR_PRO_100M_PRODUCT_ID!]: 100000000,
    };

    return requestLimits[productId] || 250000; // Default to 250k if unknown
}

export default http;
