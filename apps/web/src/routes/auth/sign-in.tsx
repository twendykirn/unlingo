import { createFileRoute } from "@tanstack/react-router";
import { redirectIfAuthenticated, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth/sign-in")({
    validateSearch: (search: Record<string, unknown>) => {
        return {
            error: search.error as string | undefined,
            returnTo: search.returnTo as string | undefined,
        };
    },
    beforeLoad: async () => {
        await redirectIfAuthenticated("/dashboard");
    },
    component: SignInComponent,
});

function SignInComponent() {
    const { signIn, signUp, isLoading } = useAuth();
    const { error } = Route.useSearch();

    const errorMessages: Record<string, string> = {
        missing_code: "Authentication code was missing. Please try again.",
        authentication_failed: "Authentication failed. Please try again.",
    };

    return (
        <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            {errorMessages[error] ?? "An error occurred. Please try again."}
                        </div>
                    )}

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => signIn()}
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Sign in"}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => signUp()}
                            disabled={isLoading}
                        >
                            Sign up
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
