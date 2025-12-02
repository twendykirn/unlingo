import { createFileRoute, redirect } from "@tanstack/react-router";
import { authenticateWithCode } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
    validateSearch: (search: Record<string, unknown>) => {
        return {
            code: search.code as string | undefined,
            error: search.error as string | undefined,
            error_description: search.error_description as string | undefined,
        };
    },
    loaderDeps: ({ search }) => ({ code: search.code, error: search.error }),
    loader: async ({ deps }) => {
        const { code, error } = deps;

        if (error) {
            throw redirect({
                to: "/auth/sign-in",
                search: { error },
            });
        }

        if (!code) {
            throw redirect({
                to: "/auth/sign-in",
                search: { error: "missing_code" },
            });
        }

        try {
            await authenticateWithCode({ data: { code } });
            throw redirect({
                to: "/dashboard",
            });
        } catch (err) {
            // Check if it's a redirect (which is expected on success)
            if (err instanceof Error && "to" in err) {
                throw err;
            }

            console.error("Authentication failed:", err);
            throw redirect({
                to: "/auth/sign-in",
                search: { error: "authentication_failed" },
            });
        }
    },
    component: CallbackComponent,
});

function CallbackComponent() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Signing you in...</p>
            </div>
        </div>
    );
}
