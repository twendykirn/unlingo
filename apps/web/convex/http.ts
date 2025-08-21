import type { WebhookEvent } from '@clerk/backend';
import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { polar } from './polar';
import { Id } from './_generated/dataModel';
import { resend } from './resend';

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
            let primaryEmail;
            switch (evt.type) {
                case 'user.created':
                    primaryEmail = evt.data.email_addresses.find(e => e.id === evt.data.primary_email_address_id);

                    if (primaryEmail) {
                        await ctx.scheduler.runAfter(0, internal.resend.sendWelcomeEmail, {
                            userFirstName: evt.data.first_name || '',
                            userEmail: primaryEmail.email_address,
                        });
                    } else {
                        console.log('Not found primary email address for user: ', evt.data.id);
                    }
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

// Language file retrieval API endpoint
http.route({
    path: '/api/v1/translations',
    method: 'GET',
    handler: httpAction(async (ctx, request) => {
        // Extract API key from header
        const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Extract query parameters
        const url = new URL(request.url);
        const releaseTag = url.searchParams.get('release'); // Release name
        const namespace = url.searchParams.get('namespace'); // Namespace name
        const lang = url.searchParams.get('lang'); // Language code

        if (!releaseTag || !namespace || !lang) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required parameters: release, namespace, and lang are required',
                    example: '/api/v1/translations?release=1.0.0&namespace=common&lang=en',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        try {
            // Verify API key and get workspace info
            const apiKeyInfo = await ctx.runQuery(internal.apiKeys.verifyApiKey, { key: apiKey });
            if (!apiKeyInfo) {
                return new Response(JSON.stringify({ error: 'Invalid API key' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Track usage successful request
            const limitCheck = await ctx.runMutation(internal.internalWorkspaces.checkAndUpdateRequestUsage, {
                workspaceId: apiKeyInfo.workspaceId,
            });

            // Check if we should send notifications after usage increment
            if (limitCheck.nearLimit) {
                await ctx.scheduler.runAfter(0, internal.resend.sendLimitsEmail, {
                    userEmail: limitCheck.workspace.contactEmail,
                    currentUsage: 80,
                });
            }

            if (limitCheck.exceedsHardLimit && limitCheck.shouldSendHardLimitEmail) {
                await ctx.scheduler.runAfter(0, internal.resend.sendLimitsEmail, {
                    userEmail: limitCheck.workspace.contactEmail,
                    currentUsage: 130,
                });
            }

            if (limitCheck.exceedsLimit) {
                await ctx.scheduler.runAfter(0, internal.resend.sendLimitsEmail, {
                    userEmail: limitCheck.workspace.contactEmail,
                    currentUsage: 100,
                });
            }

            if (!limitCheck.isRequestAllowed) {
                return new Response(
                    JSON.stringify({
                        error: 'Request limit exceeded. Please upgrade your plan or wait for the monthly reset.',
                        currentUsage: limitCheck.currentRequests,
                        limit: limitCheck.limit,
                        resetPeriod: 'monthly',
                    }),
                    {
                        status: 429,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            // Find the release by tag and project using the efficient index query
            const release = await ctx.runQuery(internal.releases.getReleaseByTag, {
                projectId: apiKeyInfo.projectId,
                workspaceId: apiKeyInfo.workspaceId,
                tag: releaseTag,
            });

            if (!release) {
                return new Response(
                    JSON.stringify({
                        error: `Release tag '${releaseTag}' not found`,
                    }),
                    {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            // Find the namespace in the release by checking each namespace version
            let targetNamespaceVersion = null;
            for (const nv of release.namespaceVersions) {
                const namespaceDoc = await ctx.runQuery(internal.namespaces.getNamespaceInternal, {
                    namespaceId: nv.namespaceId,
                    projectId: apiKeyInfo.projectId,
                    workspaceId: apiKeyInfo.workspaceId,
                });

                if (namespaceDoc && namespaceDoc.name === namespace) {
                    targetNamespaceVersion = nv;
                    break;
                }
            }

            if (!targetNamespaceVersion) {
                return new Response(
                    JSON.stringify({
                        error: `Namespace '${namespace}' not found in release '${releaseTag}'`,
                    }),
                    {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            // Get the specific language using the efficient index query
            const language = await ctx.runQuery(internal.languages.getLanguageByCode, {
                namespaceVersionId: targetNamespaceVersion.versionId,
                languageCode: lang,
                workspaceId: apiKeyInfo.workspaceId,
            });

            if (!language || !language.fileId) {
                return new Response(
                    JSON.stringify({
                        error: `Language '${lang}' not found for namespace '${namespace}' in version '${releaseTag}'`,
                    }),
                    {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            // Get the file content from Convex storage
            const blob = await ctx.storage.get(language.fileId);
            if (!blob) {
                return new Response(
                    JSON.stringify({
                        error: 'Failed to retrieve language file',
                    }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            const fileContent = await blob.text();

            // Parse JSON to validate it before returning
            let parsedContent;
            try {
                parsedContent = JSON.parse(fileContent);
            } catch {
                // Return raw content if not valid JSON
                parsedContent = fileContent;
            }

            return new Response(JSON.stringify(parsedContent), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error: any) {
            console.error('API Error:', error);
            return new Response(
                JSON.stringify({
                    error: 'Internal server error',
                    message: error.message,
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
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

http.route({
    path: '/resend-webhook',
    method: 'POST',
    handler: httpAction(async (ctx, req) => {
        return await resend.handleResendEventWebhook(ctx, req);
    }),
});

export default http;
