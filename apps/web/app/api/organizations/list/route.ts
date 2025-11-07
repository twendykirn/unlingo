import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY!);

export async function GET() {
    try {
        const { user } = await withAuth();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List organizations for the user
        const response = await workos.userManagement.listOrganizationMemberships({
            userId: user.id,
        });

        const organizations = response.data.map(membership => ({
            id: membership.organizationId,
            name: membership.organization?.name || 'Unknown',
        }));

        return NextResponse.json({ organizations });
    } catch (error) {
        console.error('Failed to list organizations:', error);
        return NextResponse.json(
            { error: 'Failed to list organizations' },
            { status: 500 }
        );
    }
}
