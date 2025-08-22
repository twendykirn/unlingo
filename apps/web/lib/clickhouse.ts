import { createClient } from '@clickhouse/client';
import { z } from 'zod';

const client = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'unlingo',
});

export const CHClient = client;

// Schema definitions
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

// Data ingestion
export async function ingestApiRequest(event: ApiRequestEventType): Promise<void> {
  const row = {
    projectId: event.projectId,
    elementId: event.elementId,
    type: event.type,
    workspaceId: event.workspaceId,
    deniedReason: event.deniedReason ?? null,
    time: Number.isFinite(event.time) ? Math.trunc(event.time) : Math.trunc(Date.now() / 1000),
    apiCallName: event.apiCallName ?? null,
    languageCode: event.languageCode ?? null,
    namespaceId: event.namespaceId ?? null,
    responseSize:
      typeof event.responseSize === 'number' && Number.isFinite(event.responseSize)
        ? Math.trunc(event.responseSize)
        : null,
  } as const;

  await client.insert({
    table: 'api_requests',
    values: [row],
    format: 'JSONEachRow',
  });
}

// Analytics queries
export async function getMonthlyTimeseries(workspaceId: string, months: number = 6) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60); // Approximate months in seconds
  
  const query = `
    SELECT 
      toStartOfMonth(toDateTime(time)) as month_start,
      countIf(deniedReason IS NULL) as success,
      count() as total_requests
    FROM api_requests 
    WHERE 
      workspaceId = {workspaceId: String}
      AND time >= {cutoffTime: Int64}
    GROUP BY month_start
    ORDER BY month_start DESC
    LIMIT 24
  `;

  const result = await client.query({
    query,
    query_params: { workspaceId, cutoffTime },
  });

  return result.json();
}

export async function getTopNamespaces(workspaceId: string, months: number = 6, limit: number = 10) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60);
  
  const query = `
    SELECT 
      namespaceId as namespace,
      countIf(deniedReason IS NULL) as success
    FROM api_requests 
    WHERE 
      workspaceId = {workspaceId: String}
      AND time >= {cutoffTime: Int64}
      AND namespaceId IS NOT NULL
      AND namespaceId != ''
    GROUP BY namespaceId
    ORDER BY success DESC
    LIMIT {limit: UInt32}
  `;

  const result = await client.query({
    query,
    query_params: { workspaceId, cutoffTime, limit },
  });

  return result.json();
}

export async function getTopApiCalls(workspaceId: string, months: number = 6, limit: number = 10) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60);
  
  const query = `
    SELECT 
      apiCallName,
      countIf(deniedReason IS NULL) as success,
      count() as total_requests
    FROM api_requests 
    WHERE 
      workspaceId = {workspaceId: String}
      AND time >= {cutoffTime: Int64}
      AND apiCallName IS NOT NULL
      AND apiCallName != ''
    GROUP BY apiCallName
    ORDER BY success DESC
    LIMIT {limit: UInt32}
  `;

  const result = await client.query({
    query,
    query_params: { workspaceId, cutoffTime, limit },
  });

  return result.json();
}

export async function getTopLanguages(workspaceId: string, months: number = 6, limit: number = 10) {
  const cutoffTime = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60);
  
  const query = `
    SELECT 
      languageCode,
      countIf(deniedReason IS NULL) as success
    FROM api_requests 
    WHERE 
      workspaceId = {workspaceId: String}
      AND time >= {cutoffTime: Int64}
      AND languageCode IS NOT NULL
      AND languageCode != ''
    GROUP BY languageCode
    ORDER BY success DESC
    LIMIT {limit: UInt32}
  `;

  const result = await client.query({
    query,
    query_params: { workspaceId, cutoffTime, limit },
  });

  return result.json();
}

// Initialize database schema
export async function initDatabase(): Promise<void> {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS api_requests (
      projectId String,
      elementId String,
      type String,
      workspaceId String,
      deniedReason Nullable(String),
      time Int64,
      apiCallName Nullable(String),
      languageCode Nullable(String),
      namespaceId Nullable(String),
      responseSize Nullable(Int64)
    ) ENGINE = MergeTree()
    ORDER BY (workspaceId, time, projectId, elementId)
    PARTITION BY toYYYYMM(toDateTime(time))
  `;

  await client.query({ query: createTableQuery });
}