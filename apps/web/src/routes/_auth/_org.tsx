import { auth, clerkClient } from '@clerk/tanstack-react-start/server';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useQuery } from 'convex/react';
import { api } from '@unlingo/backend/convex/_generated/api';
import PremiumLockDialog from '@/components/premium-lock-dialog';
import { Spinner } from '@/components/ui/spinner';

const orgStateFn = createServerFn({ method: 'GET' }).handler(async () => {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated) {
        throw redirect({
            to: '/sign-in/$',
        });
    }

    const user = await clerkClient().users.getUser(userId);
    const { totalCount } = await clerkClient().users.getOrganizationMembershipList({
        userId
    });

    if (totalCount === 0) {
        throw redirect({
            to: '/new',
        });
    }

    if (!orgId) {
        throw redirect({
            to: '/select-org',
        });
    }

    return { userId, firstName: user?.firstName, orgId };
});

export const Route = createFileRoute('/_auth/_org')({
    component: RouteComponent,
    beforeLoad: async () => await orgStateFn(),
    head: () => ({
        scripts: [
            {
                children: `window.$ujq=window.$ujq||[];window.uj=window.uj||new Proxy({},{get:(_,p)=>(...a)=>window.$ujq.push([p,...a])});document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.userjot.com/sdk/v2/uj.js',type:'module',async:!0}));`,
            },
        ]
    })
});

function RouteComponent() {
    const { organization } = useOrganization();
    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    // Show lock dialog if workspace exists and user is not premium
    const showPremiumLock = workspace !== undefined && workspace !== null && !workspace.isPremium;

    return (
        <>
            {!workspace || showPremiumLock ?
                <div className='w-screen h-screen flex items-center justify-center'>
                    <Spinner />
                </div> :
                <Outlet />
            }
            <PremiumLockDialog isOpen={showPremiumLock} />
        </>
    );
}