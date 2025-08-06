import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isOrgSelectionRoute = createRouteMatcher(['/select-org', '/new']);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    
    // Protect dashboard routes
    if (isProtectedRoute(req)) {
        await auth.protect();
        
        // If user is accessing dashboard directly, redirect to org selection
        if (userId && req.nextUrl.pathname === '/dashboard') {
            return NextResponse.redirect(new URL('/select-org', req.url));
        }
    }

    // Protect org selection routes
    if (isOrgSelectionRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
