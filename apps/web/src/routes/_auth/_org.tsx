import { auth, clerkClient } from '@clerk/tanstack-react-start/server';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

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
    return <Outlet />;
}