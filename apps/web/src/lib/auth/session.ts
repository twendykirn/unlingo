import { sealData, unsealData } from "iron-session";
import * as jose from "jose";
import { getCookiePassword, getClientId, getWorkOS } from "./workos";
import type { User } from "@workos-inc/node";

export interface Session {
    accessToken: string;
    refreshToken: string;
    user: User;
    impersonator?: {
        email: string;
        reason?: string;
    };
}

export interface SessionData {
    session: Session | null;
}

const SESSION_COOKIE_NAME = "workos-session";
const JWKS_URL = "https://api.workos.com/sso/jwks/";

let jwksCache: jose.JWTVerifyGetKey | null = null;

async function getJwks(): Promise<jose.JWTVerifyGetKey> {
    if (!jwksCache) {
        const clientId = getClientId();
        jwksCache = jose.createRemoteJWKSet(new URL(`${JWKS_URL}${clientId}`));
    }
    return jwksCache;
}

export async function verifyAccessToken(
    accessToken: string
): Promise<jose.JWTPayload | null> {
    try {
        const jwks = await getJwks();
        const { payload } = await jose.jwtVerify(accessToken, jwks);
        return payload;
    } catch (error) {
        console.error("Failed to verify access token:", error);
        return null;
    }
}

export async function encryptSession(session: Session): Promise<string> {
    const password = getCookiePassword();
    return sealData(session, {
        password,
        ttl: 60 * 60 * 24 * 7, // 7 days
    });
}

export async function decryptSession(
    encryptedSession: string
): Promise<Session | null> {
    try {
        const password = getCookiePassword();
        const session = await unsealData<Session>(encryptedSession, {
            password,
        });
        return session;
    } catch (error) {
        console.error("Failed to decrypt session:", error);
        return null;
    }
}

export function getSessionCookieName(): string {
    return SESSION_COOKIE_NAME;
}

export async function refreshSessionTokens(
    refreshToken: string
): Promise<Session | null> {
    try {
        const workos = getWorkOS();
        const clientId = getClientId();

        const response = await workos.userManagement.authenticateWithRefreshToken(
            {
                clientId,
                refreshToken,
            }
        );

        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
            impersonator: response.impersonator,
        };
    } catch (error) {
        console.error("Failed to refresh session:", error);
        return null;
    }
}

export async function getValidSession(
    encryptedSession: string | undefined
): Promise<Session | null> {
    if (!encryptedSession) {
        return null;
    }

    const session = await decryptSession(encryptedSession);
    if (!session) {
        return null;
    }

    // Verify the access token
    const payload = await verifyAccessToken(session.accessToken);

    if (payload) {
        // Token is still valid
        return session;
    }

    // Token expired, try to refresh
    const refreshedSession = await refreshSessionTokens(session.refreshToken);
    return refreshedSession;
}
