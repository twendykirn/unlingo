import LoginForm from '@/components/login-form';
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
    component: Page,
    beforeLoad: async () => await authStateFn(),
});

function Page() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <LoginForm />
            </div>
        </div>
    );
}