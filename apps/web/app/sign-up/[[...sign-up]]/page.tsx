'use client';

import { useState, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Field, Label } from '@/components/ui/field';

type AuthMethod = 'email_code' | 'oauth_google' | 'oauth_github';

const LAST_AUTH_METHOD_KEY = 'unlingo_last_auth_method';

const getLastUsedMethod = (): AuthMethod | null => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem(LAST_AUTH_METHOD_KEY) as AuthMethod) || null;
};

const setLastUsedMethod = (method: AuthMethod) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
};

const getAuthMethodLabel = (method: AuthMethod): string => {
    switch (method) {
        case 'email_code':
            return 'Email';
        case 'oauth_google':
            return 'Google';
        case 'oauth_github':
            return 'GitHub';
        default:
            return '';
    }
};

export default function SignUpPage() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [lastUsedMethod, setLastUsedMethodState] = useState<AuthMethod | null>(null);

    useEffect(() => {
        setLastUsedMethodState(getLastUsedMethod());
    }, []);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !email) return;

        setError('');
        setIsLoading(true);

        try {
            await signUp.create({
                emailAddress: email,
            });

            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });

            setShowCodeInput(true);
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || code.length !== 6) return;

        setError('');
        setIsLoading(true);

        try {
            const result = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (result.status === 'complete') {
                setLastUsedMethod('email_code');
                await setActive({ session: result.createdSessionId });
                router.push('/dashboard/new');
            }
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthSignUp = async (provider: 'oauth_google' | 'oauth_github') => {
        if (!isLoaded) return;

        setError('');
        setLastUsedMethod(provider);

        try {
            await signUp.authenticateWithRedirect({
                strategy: provider,
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/dashboard/new',
            });
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className='min-h-screen bg-black text-white flex'>
            {/* Left side - Form */}
            <div className='w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12'>
                <div className='w-full max-w-md space-y-8'>
                    {/* Logo/Brand */}
                    <div className='space-y-2'>
                        <h1 className='text-3xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                            Unlingo
                        </h1>
                        <p className='text-gray-400 text-base'>Create your account</p>
                    </div>

                    {/* OAuth Buttons */}
                    <div className='space-y-3'>
                        <Button
                            intent='outline'
                            className='w-full'
                            onPress={() => handleOAuthSignUp('oauth_google')}
                            isDisabled={!isLoaded}>
                            <svg className='w-5 h-5' viewBox='0 0 24 24'>
                                <path
                                    fill='currentColor'
                                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                                />
                                <path
                                    fill='currentColor'
                                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                                />
                            </svg>
                            Continue with Google
                            {lastUsedMethod === 'oauth_google' && (
                                <Badge intent='secondary' className='ml-auto'>
                                    Last used
                                </Badge>
                            )}
                        </Button>

                        <Button
                            intent='outline'
                            className='w-full'
                            onPress={() => handleOAuthSignUp('oauth_github')}
                            isDisabled={!isLoaded}>
                            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                                <path
                                    fillRule='evenodd'
                                    d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
                                    clipRule='evenodd'
                                />
                            </svg>
                            Continue with GitHub
                            {lastUsedMethod === 'oauth_github' && (
                                <Badge intent='secondary' className='ml-auto'>
                                    Last used
                                </Badge>
                            )}
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className='relative'>
                        <Separator />
                        <span className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-sm text-gray-500'>
                            or
                        </span>
                    </div>

                    {/* Email Form */}
                    {!showCodeInput ? (
                        <form onSubmit={handleEmailSubmit} className='space-y-4'>
                            <Field>
                                <Label>Email address</Label>
                                <Input
                                    type='email'
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder='you@example.com'
                                    autoComplete='email'
                                    required
                                />
                            </Field>

                            {lastUsedMethod === 'email_code' && (
                                <div className='flex items-center gap-2'>
                                    <Badge intent='secondary'>Last used</Badge>
                                </div>
                            )}

                            {error && <p className='text-sm text-red-400'>{error}</p>}

                            <Button type='submit' className='w-full' isDisabled={isLoading || !isLoaded}>
                                {isLoading ? 'Sending code...' : 'Continue with Email'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleCodeVerify} className='space-y-4'>
                            <div className='space-y-2'>
                                <p className='text-sm text-gray-400'>
                                    We sent a 6-digit code to <span className='text-white'>{email}</span>
                                </p>
                                <button
                                    type='button'
                                    onClick={() => setShowCodeInput(false)}
                                    className='text-sm text-gray-400 hover:text-white underline'>
                                    Change email
                                </button>
                            </div>

                            <Field>
                                <Label>Verification code</Label>
                                <InputOTP maxLength={6} value={code} onChange={setCode}>
                                    <InputOTPGroup>
                                        {[...Array(6)].map((_, index) => (
                                            <InputOTPSlot key={index} index={index} />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </Field>

                            {error && <p className='text-sm text-red-400'>{error}</p>}

                            <Button type='submit' className='w-full' isDisabled={isLoading || code.length !== 6}>
                                {isLoading ? 'Verifying...' : 'Create account'}
                            </Button>
                        </form>
                    )}

                    {/* Legal */}
                    <p className='text-xs text-gray-500 text-center'>
                        By continuing, you agree to our{' '}
                        <Link href='/legal/terms-of-service' className='text-gray-400 hover:text-white underline'>
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href='/legal/privacy-policy' className='text-gray-400 hover:text-white underline'>
                            Privacy Policy
                        </Link>
                        .
                    </p>

                    {/* Sign In Link */}
                    <div className='text-center'>
                        <p className='text-sm text-gray-400'>
                            Already have an account?{' '}
                            <Link href='/sign-in' className='text-white hover:underline'>
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right side - Visual */}
            <div className='hidden lg:flex lg:w-1/2 items-center justify-center p-12 border-l border-gray-800'>
                <div className='relative w-full h-full max-w-2xl max-h-[800px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black'>
                    {/* Placeholder for noise image */}
                    <div className='absolute inset-0 opacity-30'>
                        <div
                            className='w-full h-full'
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                backgroundSize: 'cover',
                            }}
                        />
                    </div>

                    {/* Gradient overlay */}
                    <div className='absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-black/30' />
                </div>
            </div>
        </div>
    );
}
