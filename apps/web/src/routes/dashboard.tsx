import { createFileRoute, Outlet, useRouteContext } from "@tanstack/react-router";
import { requireAuth, type Session } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
    beforeLoad: async () => {
        const session = await requireAuth("/auth/sign-in");
        return { session };
    },
    component: DashboardLayout,
});

function DashboardLayout() {
    return <Outlet />;
}
