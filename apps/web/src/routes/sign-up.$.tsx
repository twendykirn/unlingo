import { SignUp } from '@clerk/tanstack-react-start';
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

export const Route = createFileRoute('/sign-up/$')({
    component: Page,
    beforeLoad: async () => await authStateFn(),
    head: () => ({
        meta: [
            {
                title: "Sign Up - Unlingo",
            },
            {
                name: "description",
                content: "Create your Unlingo account to start managing translations and internationalization for your applications.",
            },
            {
                property: "og:type",
                content: "website",
            },
            {
                property: "og:title",
                content: "Sign Up - Unlingo",
            },
            {
                property: "og:description",
                content: "Create your Unlingo account to start managing translations and internationalization for your applications.",
            },
            {
                property: "og:url",
                content: "https://unlingo.com/sign-up",
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
                content: "Sign Up - Unlingo",
            },
            {
                name: "twitter:description",
                content: "Create your Unlingo account to start managing translations and internationalization for your applications.",
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

function Page() {
    return (
        <div className='w-screen h-screen flex items-center justify-center'>
            <SignUp />
        </div>
    );
}