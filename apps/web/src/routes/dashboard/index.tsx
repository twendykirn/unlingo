import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/")({
    component: DashboardIndexComponent,
});

function DashboardIndexComponent() {
    const { session } = useRouteContext({ from: "/dashboard" });
    const { signOut } = useAuth();

    return (
        <div className="container mx-auto p-6">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Button variant="outline" onClick={signOut}>
                        Sign out
                    </Button>
                </div>

                <div className="rounded-lg border p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Welcome, {session.user.firstName ?? session.user.email}!
                    </h2>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            <strong>Email:</strong> {session.user.email}
                        </p>
                        {session.user.firstName && (
                            <p>
                                <strong>Name:</strong> {session.user.firstName}{" "}
                                {session.user.lastName}
                            </p>
                        )}
                        <p>
                            <strong>User ID:</strong> {session.user.id}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
