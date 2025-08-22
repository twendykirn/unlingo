'use node';
import { internalAction } from './_generated/server';
import { createClient } from '@clickhouse/client';

const getClickHouseClient = () => {
    return createClient({
        url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
        username: process.env.CLICKHOUSE_USER || 'default',
        password: process.env.CLICKHOUSE_PASSWORD || '',
        database: process.env.CLICKHOUSE_DATABASE || 'unlingo',
    });
};

export const initializeDatabase = internalAction({
    args: {},
    handler: async () => {
        const client = getClickHouseClient();

        try {
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

            console.log('✅ ClickHouse database initialized successfully');
            return { success: true, message: 'Database initialized successfully' };
        } catch (error) {
            console.error('❌ Failed to initialize ClickHouse database:', error);
            throw new Error(`Database initialization failed: ${error}`);
        } finally {
            await client.close();
        }
    },
});

export const testConnection = internalAction({
    args: {},
    handler: async () => {
        const client = getClickHouseClient();

        try {
            const result = await client.query({ query: 'SELECT 1 as test' });
            const data = await result.json();

            console.log('✅ ClickHouse connection test successful');
            return { success: true, data };
        } catch (error) {
            console.error('❌ ClickHouse connection test failed:', error);
            throw new Error(`Connection test failed: ${error}`);
        } finally {
            await client.close();
        }
    },
});
