'use server';

import { WorkOS } from '@workos-inc/node';
import { withAuth } from '@workos-inc/authkit-nextjs';

const workos = new WorkOS(process.env.WORKOS_API_KEY!);

export async function createOrganization(name: string) {
    const { user } = await withAuth();

    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        const organization = await workos.organizations.createOrganization({
            name,
        });

        return {
            success: true,
            organizationId: organization.id,
        };
    } catch (error) {
        console.error('Failed to create organization:', error);
        throw new Error('Failed to create organization');
    }
}

export async function setActiveOrganization(organizationId: string) {
    // WorkOS handles organization switching via their API
    // The organization context is managed through the session
    return { success: true };
}
