import { auth } from '@clerk/nextjs/server';
import { api } from '@/convex/_generated/api';
import { NextRequest, NextResponse } from 'next/server';
import { Unkey } from '@unkey/api';
import { Id } from '@/convex/_generated/dataModel';
import { fetchQuery } from 'convex/nextjs';
import { getAuthToken } from '@/app/auth';

export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');
        const workspaceId = searchParams.get('workspaceId');

        if (!projectId || !workspaceId) {
            return NextResponse.json({ error: 'Missing projectId or workspaceId' }, { status: 400 });
        }

        const project = await fetchQuery(
            api.projects.getProject,
            {
                workspaceId: workspaceId as Id<'workspaces'>,
                projectId: projectId as Id<'projects'>,
            },
            {
                token: await getAuthToken(),
            }
        );

        if (!project) {
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
        }

        const unkey = new Unkey({ rootKey: process.env.UNKEY_API_KEY! });

        const listResponse = await unkey.apis.listKeys({
            apiId: process.env.UNKEY_API_ID!,
            externalId: `${workspaceId}_${projectId}`,
        });

        if (!listResponse.data) {
            return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
        }

        // Format the response
        const formattedKeys = listResponse.data.map(key => ({
            id: key.keyId,
            name: key.name || 'Unnamed Key',
            prefix: key.start || '',
            createdAt: key.createdAt,
        }));

        return NextResponse.json({
            keys: formattedKeys,
        });
    } catch (error) {
        console.error('Error listing API keys:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { projectId, workspaceId, name, permissions } = body;

        if (!projectId || !workspaceId || !name || !permissions) {
            return NextResponse.json(
                { error: 'Missing required fields: projectId, workspaceId, name, permissions' },
                { status: 400 }
            );
        }

        const project = await fetchQuery(
            api.projects.getProject,
            {
                workspaceId: workspaceId as Id<'workspaces'>,
                projectId: projectId as Id<'projects'>,
            },
            {
                token: await getAuthToken(),
            }
        );

        if (!project) {
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
        }

        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_API_KEY! });

        const externalId = `${workspaceId}_${projectId}`;

        const listResponse = await unkey.apis.listKeys({
            apiId: process.env.UNKEY_API_ID!,
            externalId,
        });

        if (!listResponse.data) {
            return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
        }

        if (listResponse.data.length > 49) {
            return NextResponse.json({ error: 'Exceeded maximum number of API keys per project' }, { status: 400 });
        }

        const prefix = 'unlingo';

        const unkeyResponse = await unkey.keys.createKey({
            apiId: process.env.UNKEY_API_ID!,
            name,
            externalId,
            prefix,
            permissions,
        });

        if (!unkeyResponse.data) {
            return NextResponse.json({ error: 'Failed to create Unkey key' }, { status: 500 });
        }

        const { key, keyId } = unkeyResponse.data;

        return NextResponse.json({
            id: keyId,
            key,
            name,
            prefix,
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
