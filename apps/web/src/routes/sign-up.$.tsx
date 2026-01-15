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
});

function Page() {
    return (
        <div className='w-screen h-screen flex items-center justify-center'>
            <SignUp />
        </div>
    );
}