import { auth } from '@clerk/nextjs/server';
import { api } from '@/convex/_generated/api';
import { NextRequest, NextResponse } from 'next/server';
import { Unkey } from '@unkey/api';
import { fetchQuery } from 'convex/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { getAuthToken } from '@/app/auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { keyId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspaceId');
        const projectId = searchParams.get('projectId');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
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

        const getResponse = await unkey.keys.getKey({
            keyId,
        });

        if (!getResponse.data) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        if (getResponse.data.identity?.externalId !== `${workspaceId}_${projectId}`) {
            return NextResponse.json({ error: 'API key not found or access denied' }, { status: 403 });
        }

        const deleteResponse = await unkey.keys.deleteKey({
            keyId,
        });

        if (!deleteResponse.data) {
            return NextResponse.json({ error: 'Failed to delete Unkey key' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting API key:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
