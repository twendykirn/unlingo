import {
    AlertDialog,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogPopup,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AlertDialogPanel } from '@/components/ui/alert-dialog-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { useSignUp } from '@clerk/tanstack-react-start';
import { auth } from '@clerk/tanstack-react-start/server';
import type { ClerkAPIError } from '@clerk/types';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { isClerkAPIResponseError } from '@clerk/tanstack-react-start/errors';

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
    const navigate = useNavigate();
    const { isLoaded, signUp, setActive } = useSignUp();

    const [open, setOpen] = useState(false);
    const [errors, setErrors] = useState<ClerkAPIError[]>([]);
    const [verifyErrors, setVerifyErrors] = useState<ClerkAPIError[]>([]);

    const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrors([]);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;

        if (!isLoaded && !signUp || !email) return null;

        try {
            await signUp.create({
                emailAddress: email,
            });

            await signUp.prepareEmailAddressVerification();


            setOpen(true);
        } catch (err) {
            if (isClerkAPIResponseError(err)) {
                setErrors(err.errors);
            }
            console.error("Error:", JSON.stringify(err, null, 2));
        }
    };

    const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setVerifyErrors([]);

        const formData = new FormData(e.currentTarget);
        const code = formData.get("otp") as string;

        if (!isLoaded && !signUp || !code) return null;

        try {
            const signUpAttempt = await signUp.attemptPhoneNumberVerification({
                code,
            })

            // If verification was completed, set the session to active
            // and redirect the user
            if (signUpAttempt.status === "complete") {
                await setActive({
                    session: signUpAttempt.createdSessionId,
                    navigate: async ({ session }) => {
                        if (session?.currentTask) {
                            // Check for tasks and navigate to custom UI to help users resolve them
                            // See https://clerk.com/docs/guides/development/custom-flows/overview#session-tasks
                            console.log(session?.currentTask);
                            return;
                        }

                        navigate({ to: "/dashboard" });
                    },
                });
            } else {
                // If the status is not complete, check why. User may need to
                // complete further steps.
                console.error(signUpAttempt);
            }
        } catch (err) {
            if (isClerkAPIResponseError(err)) {
                setVerifyErrors(err.errors);
            }
            console.error("Error:", JSON.stringify(err, null, 2));
        }
    };

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <AlertDialog open={true}>
                <AlertDialogPopup>
                    <AlertDialogHeader>
                        <Avatar className="size-12 rounded-md">
                            <AvatarImage
                                alt="Unlingo Logo"
                                src="/icon.png"
                            />
                            <AvatarFallback>UN</AvatarFallback>
                        </Avatar>
                        <AlertDialogTitle>Create your account!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Already have an account? <Link to="/sign-in/$" className="underline hover:text-accent-foreground">Sign in</Link>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {!open ? (
                        <AlertDialogPanel className='grid gap-4'>
                            <Form className="contents" onSubmit={handleSendCode}>
                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        placeholder="m@example.com"
                                        required
                                    />
                                </Field>
                                <Field className="items-center">
                                    <Button type="submit" className="w-full">Send Code</Button>
                                    {errors.length > 0 && (
                                        <p className="text-destructive text-xs text-center">
                                            {errors[0].longMessage || errors[0].message}
                                        </p>
                                    )}
                                </Field>
                            </Form>
                            <div className="flex items-center">
                                <div className="h-px flex-1 bg-border rounded-full" />
                                <Field className="items-center flex-1 mx-auto">
                                    <FieldDescription className="text-center">
                                        Or continue with
                                    </FieldDescription>
                                </Field>
                                <div className="h-px flex-1 bg-border rounded-full" />
                            </div>
                            <Field className="grid grid-cols-2 gap-4">
                                <Button variant="outline" type="button">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path
                                            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    Github
                                </Button>
                                <Button variant="outline" type="button">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path
                                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    Google
                                </Button>
                            </Field>
                        </AlertDialogPanel>
                    ) : null}
                    <AlertDialogFooter variant="bare">
                        <Field className="items-center">
                            <FieldDescription className="px-6 text-center">
                                By continuing, you agree to our <Link to="/sign-up/$" className="underline hover:text-accent-foreground">Terms of Service</Link>{" "}
                                and <Link to="/sign-up/$" className="underline hover:text-accent-foreground">Privacy Policy</Link>.
                            </FieldDescription>
                        </Field>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogPopup>
                                <Form className="contents" onSubmit={handleVerifyCode}>
                                    <DialogHeader>
                                        <DialogTitle className='text-center'>Enter verification code</DialogTitle>
                                        <DialogDescription className='text-center'>
                                            We sent a 6-digit code to your email
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogPanel className="grid gap-4">
                                        <Field className="items-center w-full">
                                            <FieldLabel htmlFor="otp" className="sr-only">
                                                Verification code
                                            </FieldLabel>
                                            <InputOTP
                                                maxLength={6}
                                                id="otp"
                                                required
                                                containerClassName="gap-4"
                                                name="otp"
                                            >
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                </InputOTPGroup>
                                                <InputOTPSeparator />
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                            <FieldDescription className="text-center">
                                                Enter the 6-digit code sent to your email.
                                            </FieldDescription>
                                        </Field>
                                        <Field className="items-center w-full">
                                            <Button type="submit" className="w-8/12">Verify</Button>
                                            {verifyErrors.length > 0 && (
                                                <p className="text-destructive text-xs text-center">
                                                    {verifyErrors[0].longMessage || verifyErrors[0].message}
                                                </p>
                                            )}
                                        </Field>
                                    </DialogPanel>
                                </Form>
                            </DialogPopup>
                        </Dialog>
                    </AlertDialogFooter>
                </AlertDialogPopup>
            </AlertDialog>
        </div>
    );
}