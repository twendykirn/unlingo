import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default authkitMiddleware({
    middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: ['/', '/sign-in', '/sign-up', '/callback', '/sign-out'],
    },
    async afterAuth(req: NextRequest, { user }) {
        const url = req.nextUrl;

        // Check if accessing protected routes
        const isProtectedRoute = url.pathname.startsWith('/dashboard');
        const isOrgSelectionRoute = url.pathname === '/select-org';

        if (isProtectedRoute || isOrgSelectionRoute) {
            // If not authenticated, redirect to sign-in
            if (!user) {
                return NextResponse.redirect(new URL('/sign-in', req.url));
            }

            // If accessing dashboard directly without an organization, redirect to org selection
            if (
                isProtectedRoute &&
                user &&
                !user.organizationId &&
                url.pathname !== '/dashboard/new'
            ) {
                return NextResponse.redirect(new URL('/select-org', req.url));
            }
        }

        return NextResponse.next();
    },
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
