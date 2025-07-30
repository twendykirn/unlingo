import type { WebhookEvent } from '@clerk/backend';
import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { verifyCreemSignature } from './verifications';

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
                case 'user.created':
                    await ctx.runMutation(internal.workspaces.createUserWorkspace, {
                        clerkUserId: evt.data.id,
                    });
                    break;

                case 'organization.created':
                    await ctx.runMutation(internal.workspaces.createOrganizationWorkspace, {
                        clerkOrgId: evt.data.id,
                    });
                    break;

                case 'user.deleted':
                    await ctx.runMutation(internal.workspaces.deleteUserWorkspace, {
                        clerkUserId: evt.data.id,
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

// --- Helper Function ---
function parseDateToTimestamp(dateString: string | null | undefined): number | undefined {
    if (!dateString) return undefined;
    const timestamp = Date.parse(dateString);
    return isNaN(timestamp) ? undefined : timestamp;
}

http.route({
    path: '/creem-users-webhook',
    method: 'POST',
    handler: httpAction(async (ctx, request) => {
        const signatureHeader = request.headers.get('creem-signature');
        const rawPayload = await request.text();

        if (!signatureHeader) {
            console.warn('HTTP Action: Webhook received without creem-signature header.');
            return new Response('Signature header missing', { status: 400 });
        }

        console.log('HTTP Action: Delegating signature verification to Node Action...');
        let isSignatureValid = false;
        try {
            isSignatureValid = await verifyCreemSignature({
                rawPayload,
                receivedSignature: signatureHeader,
                webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
            });
        } catch (error: any) {
            console.error('HTTP Action: Error calling verification action:', error);
            return new Response('Internal Server Error during signature verification', { status: 500 });
        }

        if (!isSignatureValid) {
            console.error('HTTP Action: Signature verification failed (result from Node Action).');
            return new Response('Invalid signature', { status: 401 }); // Use 401 Unauthorized
        }

        console.log('HTTP Action: Signature verified. Proceeding...');

        let event: any;
        try {
            event = JSON.parse(rawPayload);
        } catch (error) {
            console.error('HTTP Action: Error parsing webhook JSON payload:', error);
            return new Response('Invalid JSON payload', { status: 400 });
        }

        if (!event || !event.id || !event.eventType || !event.object) {
            console.error('HTTP Action: Webhook payload missing required fields (id, eventType, object).', event);
            return new Response('Invalid payload structure', { status: 400 });
        }

        console.log(`HTTP Action: Received Creem event: ${event.eventType} (ID: ${event.id})`);

        // 5. Route Event and Extract Data
        try {
            const eventData = event.object;
            let creemSubscriptionId: string | undefined;
            let creemCustomerId: string | undefined;
            let creemProductId: string | undefined;
            let status: string | undefined; // Direct status from Creem
            let currentPeriodStart: number | undefined;
            let currentPeriodEnd: number | undefined;
            let canceledAt: number | undefined;
            let internalUserId: string | undefined;

            // Extract internalUserId from metadata (adjust path if necessary)
            internalUserId = eventData.metadata?.internal_customer_id;

            // Determine data based on event type
            switch (event.eventType) {
                case 'checkout.completed':
                    creemSubscriptionId = eventData.subscription?.id;
                    creemCustomerId = eventData.customer?.id;
                    creemProductId = eventData.product?.id;
                    // Use subscription status if available, fallback to order status?
                    status = eventData.subscription?.status ?? eventData.order?.status;
                    // Dates often appear in subsequent 'paid'/'active' events for subscriptions
                    currentPeriodStart = parseDateToTimestamp(eventData.subscription?.current_period_start_date);
                    currentPeriodEnd = parseDateToTimestamp(eventData.subscription?.current_period_end_date);
                    canceledAt = parseDateToTimestamp(eventData.subscription?.canceled_at);
                    break;
                case 'subscription.active':
                case 'subscription.trialing':
                case 'subscription.paid':
                case 'subscription.update':
                    creemSubscriptionId = eventData.id;
                    creemCustomerId = eventData.customer?.id;
                    creemProductId = eventData.product?.id;
                    status = eventData.status;
                    currentPeriodStart = parseDateToTimestamp(eventData.current_period_start_date);
                    currentPeriodEnd = parseDateToTimestamp(eventData.current_period_end_date);
                    canceledAt = parseDateToTimestamp(eventData.canceled_at);
                    break;
                case 'subscription.canceled':
                    creemSubscriptionId = eventData.id;
                    creemCustomerId = eventData.customer?.id;
                    creemProductId = eventData.product?.id;
                    status = eventData.status ?? 'canceled'; // Explicitly 'canceled'
                    currentPeriodStart = parseDateToTimestamp(eventData.current_period_start_date);
                    currentPeriodEnd = parseDateToTimestamp(eventData.current_period_end_date);
                    // Use canceled_at from payload, default to now if missing (shouldn't happen for canceled)
                    canceledAt = parseDateToTimestamp(eventData.canceled_at ?? new Date().toISOString());
                    break;
                case 'subscription.expired':
                    creemSubscriptionId = eventData.id;
                    creemCustomerId = eventData.customer?.id;
                    creemProductId = eventData.product?.id;
                    status = 'expired'; // Explicitly set status to 'expired'
                    currentPeriodStart = parseDateToTimestamp(eventData.current_period_start_date);
                    currentPeriodEnd = parseDateToTimestamp(eventData.current_period_end_date); // End date is reached
                    canceledAt = parseDateToTimestamp(eventData.canceled_at); // Could be null
                    break;
                case 'refund.created':
                    creemSubscriptionId = eventData.subscription?.id;
                    creemCustomerId = eventData.customer?.id;
                    // Assume refund means canceled service
                    status = eventData.subscription?.status ?? 'canceled'; // Use nested status or default to canceled
                    creemProductId = eventData.subscription?.product; // Might just be ID string
                    currentPeriodStart = parseDateToTimestamp(eventData.subscription?.current_period_start_date);
                    currentPeriodEnd = parseDateToTimestamp(eventData.subscription?.current_period_end_date);
                    // Mark canceled now if not already set in nested subscription
                    canceledAt = parseDateToTimestamp(eventData.subscription?.canceled_at ?? new Date().toISOString());
                    break;
                default:
                    console.log(`Unhandled Creem event type: ${event.eventType}. Acknowledging.`);
                    // Don't record as processed if unhandled, allows potential future handling if needed.
                    return new Response('Unhandled event type', { status: 200 }); // Acknowledge
            }

            // Validate essential data before calling mutation
            if (!creemSubscriptionId || !creemCustomerId || !creemProductId || !status) {
                console.error(
                    `Webhook Error (Event ${event.id}, Type ${event.eventType}): Missing essential IDs/Status in payload.`,
                    { creemSubscriptionId, creemCustomerId, creemProductId, status }
                );
                // Don't record as processed, let Creem retry or log for manual intervention.
                return new Response('Missing essential data in webhook payload', { status: 400 });
            }

            // Call the upsert mutation - NO shouldBePro argument
            await ctx.runMutation(internal.subscriptions.internalUpsertCreemSubscription, {
                eventId: event.id,
                creemCustomerId,
                creemSubscriptionId,
                creemProductId,
                internalUserId, // Pass if available
                status, // Pass the mapped status
                currentPeriodStart,
                currentPeriodEnd,
                canceledAt,
            });

            // 7. Respond OK to Creem
            return new Response(null, { status: 200 }); // Success
        } catch (error: any) {
            console.error(`Error processing Creem event ${event.id} (${event.eventType}):`, error);
            // Avoid recording event ID on failure here to allow potential retries from Creem
            return new Response(`Webhook handler error: ${error.message || 'Unknown error'}`, { status: 500 });
        }
    }),
});

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

export default http;
