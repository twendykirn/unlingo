import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import {
    getWorkOS,
    getClientId,
    getRedirectUri,
    encryptSession,
    decryptSession,
    getValidSession,
    getSessionCookieName,
    type Session,
} from "./index";

export const getAuthorizationUrl = createServerFn({ method: "GET" })
    .validator((data: { screenHint?: "sign-up" | "sign-in" }) => data)
    .handler(async ({ data }) => {
        const workos = getWorkOS();
        const clientId = getClientId();
        const redirectUri = getRedirectUri();

        const authorizationUrl = workos.userManagement.getAuthorizationUrl({
            provider: "authkit",
            clientId,
            redirectUri,
            screenHint: data?.screenHint,
        });

        return { url: authorizationUrl };
    });

export const authenticateWithCode = createServerFn({ method: "POST" })
    .validator((data: { code: string }) => data)
    .handler(async ({ data }) => {
        const workos = getWorkOS();
        const clientId = getClientId();

        const response = await workos.userManagement.authenticateWithCode({
            clientId,
            code: data.code,
        });

        const session: Session = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
            impersonator: response.impersonator,
        };

        const encryptedSession = await encryptSession(session);

        setCookie(getSessionCookieName(), encryptedSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return { success: true, user: session.user };
    });

export const getSession = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ session: Session | null; needsRefresh: boolean }> => {
        const encryptedSession = getCookie(getSessionCookieName());

        if (!encryptedSession) {
            return { session: null, needsRefresh: false };
        }

        const session = await decryptSession(encryptedSession);

        if (!session) {
            return { session: null, needsRefresh: false };
        }

        // Try to get a valid session (will refresh if needed)
        const validSession = await getValidSession(encryptedSession);

        if (!validSession) {
            // Session is completely invalid, clear the cookie
            deleteCookie(getSessionCookieName());
            return { session: null, needsRefresh: false };
        }

        // If session was refreshed, update the cookie
        if (validSession.accessToken !== session.accessToken) {
            const newEncryptedSession = await encryptSession(validSession);
            setCookie(getSessionCookieName(), newEncryptedSession, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: "/",
            });
        }

        return { session: validSession, needsRefresh: false };
    }
);

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
    deleteCookie(getSessionCookieName());
    return { success: true };
});

export const getAccessToken = createServerFn({ method: "GET" }).handler(
    async (): Promise<string | null> => {
        const { session } = await getSession();
        return session?.accessToken ?? null;
    }
);
