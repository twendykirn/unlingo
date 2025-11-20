import { v } from 'convex/values';
import { internalAction } from './_generated/server';

const UNKEY_API_URL = 'https://api.unkey.com/v2';
const UNKEY_COMMON_OPTIONS = {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UNKEY_API_KEY!}`, 'Content-Type': 'application/json' },
};

const helperDeleteUnkeyKey = async (keyId: string) => {
    const url = `${UNKEY_API_URL}/keys.deleteKey`;
    const options = {
        ...UNKEY_COMMON_OPTIONS,
        body: `{"keyId":"${keyId}"}`,
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (data.error) {
            throw new Error('Failed to delete identity');
        }
    } catch (error) {
        throw new Error(`${error}`);
    }
};

export const createUnkeyIdentity = internalAction({
    args: {
        workspaceId: v.id('workspaces'),
        projectId: v.id('projects'),
    },
    handler: async (_, args) => {
        const url = `${UNKEY_API_URL}/identities.createIdentity`;
        const options = {
            ...UNKEY_COMMON_OPTIONS,
            body: `{"externalId":"${args.workspaceId}_${args.projectId}"}`,
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (data.error) {
                throw new Error('Failed to create identity');
            }
        } catch (error) {
            throw new Error(`${error}`);
        }
    },
});

export const deleteUnkeyIdentity = internalAction({
    args: {
        workspaceId: v.id('workspaces'),
        projectId: v.id('projects'),
    },
    handler: async (_, args) => {
        const externalId = `${args.workspaceId}_${args.projectId}`;

        const urlListKeys = `${UNKEY_API_URL}/apis.listKeys`;
        const optionsListKeys = {
            ...UNKEY_COMMON_OPTIONS,
            body: `{"apiId":"${process.env.UNKEY_API_ID!}","externalId":"${externalId}"}`,
        };

        const url = `${UNKEY_API_URL}/identities.deleteIdentity`;
        const options = {
            ...UNKEY_COMMON_OPTIONS,
            body: `{"identity":"${externalId}"}`,
        };

        try {
            const responseListKeys = await fetch(urlListKeys, optionsListKeys);
            const dataListKeys = await responseListKeys.json();

            if (dataListKeys.error) {
                throw new Error('Failed to list keys');
            }

            const keys = dataListKeys.data;

            const response = await fetch(url, options);
            const data = await response.json();

            if (data.error) {
                throw new Error('Failed to delete identity');
            }

            for (const key of keys) {
                await helperDeleteUnkeyKey(key.keyId);
            }
        } catch (error) {
            throw new Error(`${error}`);
        }
    },
});

export const verifyUnkeyKey = internalAction({
    args: {
        key: v.string(),
    },
    handler: async (_, args) => {
        const url = `${UNKEY_API_URL}/keys.verifyKey`;
        const options = {
            ...UNKEY_COMMON_OPTIONS,
            body: `{"key":"${args.key}","permissions":"translations.read"}`,
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (!data.data) {
                throw new Error('Failed to verify api key');
            }

            return data.data;
        } catch (error) {
            throw new Error(`${error}`);
        }
    },
});
