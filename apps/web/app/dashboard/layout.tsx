'use client';

import { ConvexProviderWithAuth } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs';
import { Authenticated, Unauthenticated } from 'convex/react';
import { Toast } from '@/components/ui/toast';
import { Providers } from '@/components/providers';
import { useCallback } from 'react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { getAccessToken } = useAuth();

    const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        try {
            const token = await getAccessToken();
            return token || null;
        } catch (error) {
            return null;
        }
    }, [getAccessToken]);

    return (
        <ConvexProviderWithAuth client={convex} useAuth={fetchAccessToken}>
            <Authenticated>
                <Providers>
                    <Toast />
                    {children}
                </Providers>
            </Authenticated>
            <Unauthenticated>
                <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                    <div className='text-center'>
                        <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                        <p className='text-gray-400'>Redirecting to sign in...</p>
                    </div>
                </div>
            </Unauthenticated>
        </ConvexProviderWithAuth>
    );
}
