import { WorkOS } from "@workos-inc/node";

let workosInstance: WorkOS | null = null;

export function getWorkOS(): WorkOS {
    if (!workosInstance) {
        const apiKey = process.env.WORKOS_API_KEY;
        if (!apiKey) {
            throw new Error("WORKOS_API_KEY environment variable is required");
        }
        workosInstance = new WorkOS(apiKey);
    }
    return workosInstance;
}

export function getClientId(): string {
    const clientId = process.env.WORKOS_CLIENT_ID;
    if (!clientId) {
        throw new Error("WORKOS_CLIENT_ID environment variable is required");
    }
    return clientId;
}

export function getRedirectUri(): string {
    const redirectUri = process.env.WORKOS_REDIRECT_URI;
    if (!redirectUri) {
        throw new Error("WORKOS_REDIRECT_URI environment variable is required");
    }
    return redirectUri;
}

export function getCookiePassword(): string {
    const password = process.env.WORKOS_COOKIE_PASSWORD;
    if (!password || password.length < 32) {
        throw new Error(
            "WORKOS_COOKIE_PASSWORD environment variable is required and must be at least 32 characters"
        );
    }
    return password;
}
