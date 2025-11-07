import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextRequest, NextResponse } from 'next/server';
import { Unkey } from '@unkey/api';
import { Id } from '@/convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// DELETE - Delete API key
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { keyId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
        }

        // Verify workspace access
        const workspace = await convex.query(api.workspaces.getWorkspace, {
            workspaceId: workspaceId as Id<'workspaces'>,
        });

        if (!workspace || workspace.clerkId !== orgId) {
            return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
        }

        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

        // Get the key first to verify it belongs to this workspace
        const getResponse = await unkey.keys.get({
            keyId,
        });

        if (getResponse.error) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        // Verify the key belongs to this workspace
        if (getResponse.result.meta?.workspaceId !== workspaceId) {
            return NextResponse.json({ error: 'API key not found or access denied' }, { status: 403 });
        }

        // Delete key from Unkey
        const deleteResponse = await unkey.keys.delete({
            keyId,
        });

        if (deleteResponse.error) {
            return NextResponse.json({ error: `Failed to delete Unkey key: ${deleteResponse.error.message}` }, { status: 500 });
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
