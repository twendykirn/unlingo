import { z } from "zod";

export const ApiRequestEvent = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  event: z.string(),
  projectName: z.string().optional(),
  deniedReason: z.string().optional(),
  time: z.number().int(),
  languageCode: z.string().optional(),
  namespaceId: z.string().optional(),
  namespaceName: z.string().optional(),
  responseSize: z.number().optional(),
  // Additional properties for user-facing events
  count: z.number().optional(),
  releaseTag: z.string().optional(),
  buildTag: z.string().optional(),
  term: z.string().optional(),
  screenshotName: z.string().optional(),
  translationKey: z.string().optional(),
});

const OPEN_PANEL_API_URL = "https://api.openpanel.dev";

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
      "Missing Openpanel configuration. Please set OPENPANEL_CLIENT_ID, OPENPANEL_CLIENT_SECRET, and OPENPANEL_PROJECT_ID environment variables.",
    );
  }

  return { clientId, clientSecret, projectId };
}

export async function identifyUser(
  profileId: string,
  userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    properties?: Record<string, any>;
  },
): Promise<void> {
  try {
    const config = getOpenpanelConfig();
    const url = `${OPEN_PANEL_API_URL}/track`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "openpanel-client-id": config.clientId,
        "openpanel-client-secret": config.clientSecret,
      },
      body: JSON.stringify({
        type: "identify",
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
    console.error("Openpanel identify failed:", error);
  }
}

export async function ingestApiRequest(params: ApiRequestEventType): Promise<void> {
  try {
    const properties: Record<string, any> = {
      projectId: params.projectId,
      projectName: params.projectName || null,
      workspaceId: params.workspaceId,
      deniedReason: params.deniedReason || null,
      timestamp: params.time,
      languageCode: params.languageCode || null,
      namespaceId: params.namespaceId || null,
      namespaceName: params.namespaceName || null,
      responseSize: params.responseSize || null,
      success: !params.deniedReason,
      // Additional properties for user-facing events
      count: params.count || null,
      releaseTag: params.releaseTag || null,
      buildTag: params.buildTag || null,
      term: params.term || null,
      screenshotName: params.screenshotName || null,
      translationKey: params.translationKey || null,
    };

    const config = getOpenpanelConfig();
    const url = `${OPEN_PANEL_API_URL}/track`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "openpanel-client-id": config.clientId,
        "openpanel-client-secret": config.clientSecret,
      },
      body: JSON.stringify({
        type: "track",
        payload: {
          profileId: params.workspaceId,
          name: params.event,
          properties: properties || {},
        },
      }),
    });
  } catch (error) {
    console.error("Openpanel ingest failed:", error);
  }
}

interface OpenpanelEvent {
  id: string;
  name: string;
  createdAt: string;
  properties: Record<string, any>;
}

interface OpenpanelEventsResponse {
  data: OpenpanelEvent[];
  meta: {
    count: number;
    totalCount: number;
    pages: number;
    current: number;
  };
}

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
    const queryParams = new URLSearchParams({
      projectId: process.env.OPENPANEL_PROJECT_ID!,
      profileId: params.profileId,
      start: params.start,
      end: params.end,
      page: String(params.page || 1),
      limit: String(params.limit || 50),
    });

    if (params.event) {
      if (Array.isArray(params.event)) {
        params.event.forEach((e) => queryParams.append("event", e));
      } else {
        queryParams.append("event", params.event);
      }
    }

    if (params.includes) {
      if (Array.isArray(params.includes)) {
        params.includes.forEach((e) => queryParams.append("includes", e));
      } else {
        queryParams.append("includes", params.includes);
      }
    }

    const url = `${OPEN_PANEL_API_URL}/export/events?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        "openpanel-client-id": process.env.OPENPANEL_READ_CLIENT_ID!,
        "openpanel-client-secret": process.env.OPENPANEL_READ_CLIENT_SECRET!,
      },
    });

    if (!response.ok) {
      throw new Error(`Openpanel API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Openpanel fetch events failed:", error);
    return {
      data: [],
      meta: {
        count: 0,
        totalCount: 0,
        pages: 0,
        current: 0,
      },
    };
  }
}
