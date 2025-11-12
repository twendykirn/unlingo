import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextRequest, NextResponse } from 'next/server';
import { Unkey } from '@unkey/api';
import { Id } from '@/convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET - List API keys
export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');
        const workspaceId = searchParams.get('workspaceId');
        const cursor = searchParams.get('cursor');
        const limit = searchParams.get('limit');

        if (!projectId || !workspaceId) {
            return NextResponse.json({ error: 'Missing projectId or workspaceId' }, { status: 400 });
        }

        // Verify workspace access
        const workspace = await convex.query(api.workspaces.getWorkspace, {
            workspaceId: workspaceId as Id<'workspaces'>,
        });

        if (!workspace || workspace.clerkId !== orgId) {
            return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
        }

        // Get project to verify access
        const project = await convex.query(api.projects.getProject, {
            projectId: projectId as Id<'projects'>,
            workspaceId: workspaceId as Id<'workspaces'>,
        });

        if (!project || project.workspaceId !== workspaceId) {
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
        }

        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

        // List keys from Unkey with pagination and externalId filter
        const listParams: {
            apiId: string;
            externalId?: string;
            cursor?: string;
            limit?: number;
        } = {
            apiId: process.env.UNKEY_API_ID!,
            externalId: workspace._id,
        };

        if (cursor) {
            listParams.cursor = cursor;
        }

        if (limit) {
            listParams.limit = parseInt(limit, 10);
        }

        const listResponse = await unkey.keys.list(listParams);

        if (listResponse.error) {
            return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
        }

        // Filter keys by project metadata (since we're already filtering by workspace via externalId)
        const projectKeys = listResponse.result.keys.filter(
            (key) => key.meta?.projectId === projectId
        );

        // Format the response
        const formattedKeys = projectKeys.map((key) => ({
            id: key.id,
            name: key.name || 'Unnamed Key',
            prefix: key.start || '',
            createdAt: key.createdAt,
        }));

        return NextResponse.json({
            keys: formattedKeys,
            cursor: listResponse.result.cursor,
            total: listResponse.result.total,
        });
    } catch (error) {
        console.error('Error listing API keys:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST - Create API key
export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { projectId, workspaceId, name } = body;

        if (!projectId || !workspaceId || !name) {
            return NextResponse.json({ error: 'Missing required fields: projectId, workspaceId, name' }, { status: 400 });
        }

        // Verify workspace access
        const workspace = await convex.query(api.workspaces.getWorkspace, {
            workspaceId: workspaceId as Id<'workspaces'>,
        });

        if (!workspace || workspace.clerkId !== orgId) {
            return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
        }

        // Get project to verify access
        const project = await convex.query(api.projects.getProject, {
            projectId: projectId as Id<'projects'>,
            workspaceId: workspaceId as Id<'workspaces'>,
        });

        if (!project || project.workspaceId !== workspaceId) {
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
        }

        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

        // Check if UNKEY_API_ID is set
        if (!process.env.UNKEY_API_ID) {
            return NextResponse.json({ error: 'UNKEY_API_ID environment variable is not set' }, { status: 500 });
        }

        // Create key via Unkey API
        const unkeyResponse = await unkey.keys.create({
            apiId: process.env.UNKEY_API_ID!,
            name,
            externalId: workspace._id,
            meta: {
                workspaceId,
                projectId,
                projectName: project.name,
            },
        });

        if (unkeyResponse.error) {
            return NextResponse.json({ error: `Failed to create Unkey key: ${unkeyResponse.error.message}` }, { status: 500 });
        }

        const { key, keyId } = unkeyResponse.result;

        // Extract prefix from the key (e.g., "prefix_xxxxx")
        const prefix = key.split('_').slice(0, 2).join('_') + '_';

        // Return the full key (this is the ONLY time it will be visible)
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
