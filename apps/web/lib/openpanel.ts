import { z } from 'zod';

// Schema definitions for Openpanel events
export const ApiRequestEvent = z.object({
    projectId: z.string(),
    projectName: z.string().optional(),
    elementId: z.string(),
    type: z.string(),
    workspaceId: z.string(),
    deniedReason: z.string().optional(),
    time: z.number().int(),
    apiCallName: z.string().optional(),
    languageCode: z.string().optional(),
    namespaceId: z.string().optional(),
    namespaceName: z.string().optional(),
    responseSize: z.number().optional(),
});

export type ApiRequestEventType = z.infer<typeof ApiRequestEvent>;

interface OpenpanelConfig {
    clientId: string;
    clientSecret: string;
    projectId: string;
}

function getOpenpanelConfig(): OpenpanelConfig {
    const clientId = process.env.OPENPANEL_CLIENT_ID;
    const clientSecret = process.env.OPENPANEL_CLIENT_SECRET;
    const projectId = process.env.OPENPANEL_PROJECT_ID;

    if (!clientId || !clientSecret || !projectId) {
        throw new Error(
            'Missing Openpanel configuration. Please set OPENPANEL_CLIENT_ID, OPENPANEL_CLIENT_SECRET, and OPENPANEL_PROJECT_ID environment variables.'
        );
    }

    return { clientId, clientSecret, projectId };
}

/**
 * Identify a user in Openpanel
 */
export async function identifyUser(
    profileId: string,
    userData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        properties?: Record<string, any>;
    }
): Promise<void> {
    try {
        const config = getOpenpanelConfig();
        const url = 'https://api.openpanel.dev/track';

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'openpanel-client-id': config.clientId,
                'openpanel-client-secret': config.clientSecret,
            },
            body: JSON.stringify({
                type: 'identify',
                payload: {
                    profileId,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    properties: userData.properties || {},
                },
            }),
        });
    } catch (error) {
        console.error('Openpanel identify failed:', error);
    }
}

/**
 * Track an event in Openpanel
 */
export async function trackEvent(
    profileId: string,
    eventName: string,
    properties?: Record<string, any>
): Promise<void> {
    try {
        const config = getOpenpanelConfig();
        const url = 'https://api.openpanel.dev/track';

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'openpanel-client-id': config.clientId,
                'openpanel-client-secret': config.clientSecret,
            },
            body: JSON.stringify({
                type: 'track',
                payload: {
                    profileId,
                    name: eventName,
                    properties: properties || {},
                },
            }),
        });
    } catch (error) {
        console.error('Openpanel track failed:', error);
    }
}

/**
 * Ingest an API request event to Openpanel
 */
export async function ingestApiRequest(event: ApiRequestEventType): Promise<void> {
    try {
        const properties: Record<string, any> = {
            projectId: event.projectId,
            projectName: event.projectName || null,
            elementId: event.elementId,
            type: event.type,
            workspaceId: event.workspaceId,
            deniedReason: event.deniedReason || null,
            timestamp: event.time,
            apiCallName: event.apiCallName || null,
            languageCode: event.languageCode || null,
            namespaceId: event.namespaceId || null,
            namespaceName: event.namespaceName || null,
            responseSize: event.responseSize || null,
            success: !event.deniedReason,
        };

        await trackEvent(event.workspaceId, 'api_request', properties);
    } catch (error) {
        console.error('Openpanel ingest failed:', error);
    }
}

interface OpenpanelEvent {
    id: string;
    name: string;
    created_at: string;
    properties: Record<string, any>;
    profile?: {
        id: string;
        [key: string]: any;
    };
    meta?: Record<string, any>;
}

interface OpenpanelEventsResponse {
    data: OpenpanelEvent[];
    meta: {
        total: number;
        page: number;
        per_page: number;
    };
}

/**
 * Fetch events from Openpanel
 */
export async function fetchEvents(params: {
    profileId: string;
    event?: string | string[];
    start: string;
    end: string;
    page?: number;
    limit?: number;
    includes?: string | string[];
}): Promise<OpenpanelEventsResponse> {
    try {
        const config = getOpenpanelConfig();
        const queryParams = new URLSearchParams({
            projectId: config.projectId,
            profileId: params.profileId,
            start: params.start,
            end: params.end,
            page: String(params.page || 1),
            limit: String(params.limit || 50),
        });

        if (params.event) {
            if (Array.isArray(params.event)) {
                params.event.forEach(e => queryParams.append('event', e));
            } else {
                queryParams.append('event', params.event);
            }
        }

        if (params.includes) {
            const includes = Array.isArray(params.includes) ? params.includes.join(',') : params.includes;
            queryParams.append('includes', includes);
        }

        const url = `https://api.openpanel.dev/export/events?${queryParams.toString()}`;

        const response = await fetch(url, {
            headers: {
                'openpanel-client-id': config.clientId,
                'openpanel-client-secret': config.clientSecret,
            },
        });

        if (!response.ok) {
            throw new Error(`Openpanel API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Openpanel fetch events failed:', error);
        return {
            data: [],
            meta: {
                total: 0,
                page: params.page || 1,
                per_page: params.limit || 50,
            },
        };
    }
}
