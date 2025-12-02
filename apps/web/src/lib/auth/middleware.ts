import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { getValidSession, getSessionCookieName, type Session } from "./index";

/**
 * Server function to check if the user is authenticated
 * Returns the session if authenticated, null otherwise
 */
export const checkAuth = createServerFn({ method: "GET" }).handler(
    async (): Promise<Session | null> => {
        const encryptedSession = getCookie(getSessionCookieName());

        if (!encryptedSession) {
            return null;
        }

        return await getValidSession(encryptedSession);
    }
);

/**
 * Middleware function to require authentication on a route
 * Use this in the beforeLoad hook of protected routes
 *
 * @example
 * ```ts
 * export const Route = createFileRoute("/dashboard")({
 *   beforeLoad: async () => {
 *     const session = await requireAuth();
 *     return { session };
 *   },
 *   component: DashboardComponent,
 * });
 * ```
 */
export async function requireAuth(redirectTo: string = "/auth/sign-in"): Promise<Session> {
    const session = await checkAuth();

    if (!session) {
        throw redirect({
            to: redirectTo,
            search: {
                returnTo: typeof window !== "undefined" ? window.location.pathname : undefined,
            },
        });
    }

    return session;
}

/**
 * Middleware function to redirect authenticated users away from auth pages
 * Use this in the beforeLoad hook of auth routes (sign-in, sign-up)
 *
 * @example
 * ```ts
 * export const Route = createFileRoute("/auth/sign-in")({
 *   beforeLoad: async () => {
 *     await redirectIfAuthenticated("/dashboard");
 *   },
 *   component: SignInComponent,
 * });
 * ```
 */
export async function redirectIfAuthenticated(
    redirectTo: string = "/dashboard"
): Promise<void> {
    const session = await checkAuth();

    if (session) {
        throw redirect({
            to: redirectTo,
        });
    }
}
