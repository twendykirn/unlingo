import { z } from 'zod';

// Schema definitions - kept compatible with existing ClickHouse schema
export const ApiRequestEvent = z.object({
    projectId: z.string(),
    elementId: z.string(),
    type: z.string(),
    workspaceId: z.string(),
    deniedReason: z.string().optional(),
    time: z.number().int(),
    apiCallName: z.string().optional(),
    languageCode: z.string().optional(),
    namespaceId: z.string().optional(),
    responseSize: z.number().optional(),
});

export type ApiRequestEventType = z.infer<typeof ApiRequestEvent>;

async function executePostHogQuery(query: string): Promise<any> {
    try {
        const response = await fetch(
            `${process.env.POSTHOG_API_URL!}/api/projects/${process.env.POSTHOG_PROJECT_ID!}/query/`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY!}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: {
                        kind: 'HogQLQuery',
                        query,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('PostHog query execution failed:', error);
        throw error;
    }
}

// Helper function to parse PostHog results into objects
function parsePostHogResults(postgResults: any): any[] {
    if (!postgResults.results || !postgResults.columns) {
        return [];
    }

    const columns = postgResults.columns;
    return postgResults.results.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((column: string, index: number) => {
            obj[column] = row[index];
        });
        return obj;
    });
}

export async function ingestApiRequest(event: ApiRequestEventType): Promise<void> {
    try {
        const url = `${process.env.POSTHOG_HOST!}/i/v0/e/`;
        const headers = {
            'Content-Type': 'application/json',
        };
        const payload = {
            api_key: process.env.POSTHOG_API_KEY!,
            event: 'api_request',
            distinct_id: event.workspaceId,
            properties: {
                $process_person_profile: false,
                projectId: event.projectId,
                elementId: event.elementId,
                type: event.type,
                workspaceId: event.workspaceId,
                deniedReason: event.deniedReason || null,
                timestamp: event.time,
                apiCallName: event.apiCallName || null,
                languageCode: event.languageCode || null,
                namespaceId: event.namespaceId || null,
                responseSize: event.responseSize || null,
                success: !event.deniedReason,
            },
            timestamp: new Date(event.time * 1000),
        };

        await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('PostHog ingest failed:', error);
    }
}

export async function getMonthlyTimeseries(workspaceId: string, months: number = 6) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000); // Unix timestamp in seconds

        const query = `
      SELECT 
        toStartOfMonth(timestamp) as month_start,
        countIf(properties.success = true) as success,
        count() as total_requests
      FROM events 
      WHERE 
        event = 'api_request'
        AND properties.workspaceId = '${workspaceId}'
        AND timestamp >= toDateTime(${cutoffTimestamp})
      GROUP BY month_start
      ORDER BY month_start DESC
      LIMIT 24
    `;

        const result = await executePostHogQuery(query);
        const parsedData = parsePostHogResults(result);
        return {
            data: parsedData,
        };
    } catch (error) {
        console.error('PostHog monthly timeseries query failed:', error);
        return { data: [] };
    }
}

export async function getTopNamespaces(workspaceId: string, months: number = 6, limit: number = 10) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000); // Unix timestamp in seconds

        const query = `
      SELECT 
        properties.namespaceId as namespace,
        countIf(properties.success = true) as success
      FROM events 
      WHERE 
        event = 'api_request'
        AND properties.workspaceId = '${workspaceId}'
        AND timestamp >= toDateTime(${cutoffTimestamp})
        AND properties.namespaceId IS NOT NULL
        AND properties.namespaceId != ''
      GROUP BY properties.namespaceId
      ORDER BY success DESC
      LIMIT ${limit}
    `;

        const result = await executePostHogQuery(query);
        const parsedData = parsePostHogResults(result);
        return {
            data: parsedData,
        };
    } catch (error) {
        console.error('PostHog top namespaces query failed:', error);
        return { data: [] };
    }
}

export async function getTopApiCalls(workspaceId: string, months: number = 6, limit: number = 10) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000); // Unix timestamp in seconds

        const query = `
      SELECT 
        properties.apiCallName,
        countIf(properties.success = true) as success,
        count() as total_requests
      FROM events 
      WHERE 
        event = 'api_request'
        AND properties.workspaceId = '${workspaceId}'
        AND timestamp >= toDateTime(${cutoffTimestamp})
        AND properties.apiCallName IS NOT NULL
        AND properties.apiCallName != ''
      GROUP BY properties.apiCallName
      ORDER BY success DESC
      LIMIT ${limit}
    `;

        const result = await executePostHogQuery(query);
        const parsedData = parsePostHogResults(result);
        return {
            data: parsedData,
        };
    } catch (error) {
        console.error('PostHog top API calls query failed:', error);
        return { data: [] };
    }
}

export async function getTopLanguages(workspaceId: string, months: number = 6, limit: number = 10) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000); // Unix timestamp in seconds

        console.log(`Querying top languages for workspace ${workspaceId} with timestamp ${cutoffTimestamp}`);

        const query = `
      SELECT 
        properties.languageCode,
        countIf(properties.success = true) as success
      FROM events 
      WHERE 
        event = 'api_request'
        AND properties.workspaceId = '${workspaceId}'
        AND timestamp >= toDateTime(${cutoffTimestamp})
        AND properties.languageCode IS NOT NULL
        AND properties.languageCode != ''
      GROUP BY properties.languageCode
      ORDER BY success DESC
      LIMIT ${limit}
    `;

        const result = await executePostHogQuery(query);
        const parsedData = parsePostHogResults(result);
        return {
            data: parsedData,
        };
    } catch (error) {
        console.error('PostHog top languages query failed:', error);
        return { data: [] };
    }
}
