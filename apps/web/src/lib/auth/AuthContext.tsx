import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import type { User } from "@workos-inc/node";
import {
    getSession,
    signOut as signOutFn,
    getAuthorizationUrl,
} from "./server-fns";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (options?: { screenHint?: "sign-up" | "sign-in" }) => Promise<void>;
    signUp: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
    initialUser?: User | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [isLoading, setIsLoading] = useState(false);

    const signIn = useCallback(
        async (options?: { screenHint?: "sign-up" | "sign-in" }) => {
            const { url } = await getAuthorizationUrl({
                data: { screenHint: options?.screenHint ?? "sign-in" },
            });
            window.location.href = url;
        },
        []
    );

    const signUp = useCallback(async () => {
        await signIn({ screenHint: "sign-up" });
    }, [signIn]);

    const signOut = useCallback(async () => {
        await signOutFn();
        setUser(null);
        window.location.href = "/";
    }, []);

    const refreshUser = useCallback(async () => {
        setIsLoading(true);
        try {
            const { session } = await getSession();
            setUser(session?.user ?? null);
        } catch (error) {
            console.error("Failed to refresh user:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const value: AuthContextValue = {
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
