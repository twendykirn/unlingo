import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className='min-h-screen bg-black text-white flex items-center justify-center p-6'>
            <div className='w-full max-w-md'>
                <div className='flex justify-center'>
                    <SignIn signUpUrl='/sign-up' />
                </div>
            </div>
        </div>
    );
}
