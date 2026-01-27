import { SignIn } from '@clerk/tanstack-react-start';
import { auth } from '@clerk/tanstack-react-start/server';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

const authStateFn = createServerFn({ method: 'GET' }).handler(async () => {
    const { isAuthenticated, userId } = await auth();

    if (isAuthenticated) {
        throw redirect({
            to: '/dashboard',
        });
    }

    return { userId };
});

export const Route = createFileRoute('/sign-in/$')({
    component: RouteComponent,
    beforeLoad: async () => await authStateFn(),
    head: () => ({
        meta: [
            {
                title: "Sign In - Unlingo",
            },
            {
                name: "description",
                content: "Sign in to your Unlingo account to manage your translation projects and internationalization workflows.",
            },
            {
                property: "og:type",
                content: "website",
            },
            {
                property: "og:title",
                content: "Sign In - Unlingo",
            },
            {
                property: "og:description",
                content: "Sign in to your Unlingo account to manage your translation projects and internationalization workflows.",
            },
            {
                property: "og:url",
                content: "https://unlingo.com/sign-in",
            },
            {
                property: "og:image",
                content: "/og.png",
            },
            {
                name: "twitter:card",
                content: "summary_large_image",
            },
            {
                name: "twitter:title",
                content: "Sign In - Unlingo",
            },
            {
                name: "twitter:description",
                content: "Sign in to your Unlingo account to manage your translation projects and internationalization workflows.",
            },
            {
                name: "twitter:image",
                content: "/og.png",
            },
            {
                name: "robots",
                content: "noindex, nofollow",
            },
        ],
    }),
});

function RouteComponent() {
    return (
        <div className='w-screen h-screen flex items-center justify-center'>
            <SignIn />
        </div>
    );
}