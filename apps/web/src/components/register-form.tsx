import { useState } from "react";
import { useSignUp } from "@clerk/tanstack-react-start";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";
import { Field, FieldDescription, FieldLabel } from "./ui/field";
import { Link, useNavigate } from "@tanstack/react-router";
import { Form } from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./ui/input-otp";

export default function RegisterForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const navigate = useNavigate();

    const { isLoaded, signUp, setActive } = useSignUp();
    const [verifying, setVerifying] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;

        if (!isLoaded && !signUp || !email) return null;

        try {
            await signUp.create({
                emailAddress: email,
            });

            await signUp.prepareEmailAddressVerification();


            setVerifying(true);
        } catch (err) {
            // See https://clerk.com/docs/guides/development/custom-flows/error-handling
            // for more info on error handling
            console.error("Error:", JSON.stringify(err, null, 2));
        }
    }

    async function handleVerification(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

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
            // See https://clerk.com/docs/guides/development/custom-flows/error-handling
            // for more info on error handling
            console.error("Error:", JSON.stringify(err, null, 2));
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    {verifying ? (
                        <Form className="flex flex-col items-center justify-center p-6 md:p-8" onSubmit={handleVerification}>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">
                                    Enter verification code
                                </h1>
                                <p className="text-muted-foreground text-sm text-balance">
                                    We sent a 6-digit code to your email
                                </p>
                            </div>
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
                                <FieldDescription className="text-center">
                                    Didn&apos;t receive the code? <a href="#">Resend</a>
                                </FieldDescription>
                            </Field>
                        </Form>
                    ) : (
                        <Form className="p-6 md:p-8" onSubmit={handleSubmit}>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">Create your account</h1>
                                <p className="text-muted-foreground text-balance">
                                    Enter your email below to create your account
                                </p>
                            </div>
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
                            </Field>
                            <div className="flex items-center justify-between">
                                <div className="h-px flex-1 bg-border rounded-full" />
                                <Field className="items-center">
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
                                    <span className="sr-only">Login with Github</span>
                                </Button>
                                <Button variant="outline" type="button">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path
                                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span className="sr-only">Login with Google</span>
                                </Button>
                            </Field>
                            <Field className="items-center">
                                <FieldDescription className="text-center">
                                    Already have an account? <Link to="/sign-in/$">Sign in</Link>
                                </FieldDescription>
                            </Field>
                        </Form>
                    )}
                    <div className="bg-muted relative hidden md:block">
                        <img
                            src="/noisy-gradients.png"
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>
                </CardContent>
            </Card>
            <Field className="items-center">
                <FieldDescription className="px-6 text-center">
                    By clicking continue, you agree to our <Link to="/sign-up/$" className="underline hover:text-accent-foreground">Terms of Service</Link>{" "}
                    and <Link to="/sign-up/$" className="underline hover:text-accent-foreground">Privacy Policy</Link>.
                </FieldDescription>
            </Field>
        </div>
    );
}
