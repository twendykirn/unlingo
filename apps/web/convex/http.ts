import { createClerkClient, type WebhookEvent } from '@clerk/backend';
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
                            userEmail: primaryEmail.email_address,
                        });
                    } else {
                        console.log('Not found primary email address for user: ', evt.data.id);
                    }
                    break;
                case 'organizationMembership.deleted':
                    if (evt.data.organization.members_count === 0) {
                        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
                        await clerk.organizations.deleteOrganization(evt.data.organization.id);
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

http.route({
    path: '/v1/translations',
    method: 'GET',
    handler: httpAction(async (ctx, request) => {
        const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const url = new URL(request.url);
        const releaseTag = url.searchParams.get('release');
        const namespace = url.searchParams.get('namespace');
        const lang = url.searchParams.get('lang');

        if (!releaseTag || !namespace || !lang) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required parameters: release, namespace, and lang are required',
                    example: '/v1/translations?release=1.0.0&namespace=common&lang=en',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        try {
            const apiKeyInfo = await ctx.runQuery(internal.apiKeys.verifyApiKey, { key: apiKey });
            if (!apiKeyInfo) {
                return new Response(JSON.stringify({ error: 'Invalid API key' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const ingestBase = {
                workspaceId: apiKeyInfo.workspaceId as unknown as string,
                projectId: apiKeyInfo.projectId as unknown as string,
                elementId: `ns:${namespace}`,
                type: 'translations',
                time: Date.now(),
                apiCallName: 'api/v1/translations',
                languageCode: lang,
            };

            const limitCheck = await ctx.runMutation(internal.internalWorkspaces.checkAndUpdateRequestUsage, {
                workspaceId: apiKeyInfo.workspaceId,
            });

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
                await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                    ...ingestBase,
                    deniedReason: 'limit_exceeded',
                });
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

            const release = await ctx.runQuery(internal.releases.getReleaseByTag, {
                projectId: apiKeyInfo.projectId,
                workspaceId: apiKeyInfo.workspaceId,
                tag: releaseTag,
            });

            if (!release) {
                await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                    ...ingestBase,
                    deniedReason: 'release_not_found',
                });
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
                await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                    ...ingestBase,
                    deniedReason: 'namespace_not_in_release',
                });
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

            const language = await ctx.runQuery(internal.languages.getLanguageByCode, {
                namespaceVersionId: targetNamespaceVersion.versionId,
                languageCode: lang,
                workspaceId: apiKeyInfo.workspaceId,
            });

            if (!language || !language.fileId) {
                await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                    ...ingestBase,
                    deniedReason: 'language_not_found',
                });
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

            const blob = await ctx.storage.get(language.fileId);
            if (!blob) {
                await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                    ...ingestBase,
                    deniedReason: 'storage_blob_missing',
                });
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

            let parsedContent;
            try {
                parsedContent = JSON.parse(fileContent);
            } catch {
                parsedContent = fileContent;
            }

            const responseBody = JSON.stringify(parsedContent);

            await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                ...ingestBase,
                responseSize: new TextEncoder().encode(responseBody).length,
            });

            return new Response(responseBody, {
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
    path: '/polar/events',
    onSubscriptionCreated: async (ctx, event) => {
        const workspaceId = event.data.customer.externalId;
        if (workspaceId) {
            await ctx.runMutation(internal.workspaces.updateWorkspaceLimits, {
                workspaceId: workspaceId as Id<'workspaces'>,
                isPremium: true,
                requestLimit: getRequestLimitFromProduct(event.data.product?.id),
            });
        }
    },
    onSubscriptionUpdated: async (ctx, event) => {
        const workspaceId = event.data.customer.externalId;
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
