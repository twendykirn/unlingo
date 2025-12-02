import { createFileRoute } from "@tanstack/react-router";
import { redirectIfAuthenticated, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth/sign-up")({
    beforeLoad: async () => {
        await redirectIfAuthenticated("/dashboard");
    },
    component: SignUpComponent,
});

function SignUpComponent() {
    const { signIn, signUp, isLoading } = useAuth();

    return (
        <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Create an account</CardTitle>
                    <CardDescription>
                        Get started with your new account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => signUp()}
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Sign up"}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => signIn()}
                            disabled={isLoading}
                        >
                            Sign in
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
