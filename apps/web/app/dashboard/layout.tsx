'use client';

import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { useAuth } from '@clerk/nextjs';
import { Authenticated, Unauthenticated } from 'convex/react';
import { Toast } from '@/components/ui/toast';
import { Providers } from '@/components/providers';
import { UserjotProvider } from '@/components/userjot-provider';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <Authenticated>
                <Providers>
                    <UserjotProvider>
                        <Toast />
                        {children}
                    </UserjotProvider>
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
        </ConvexProviderWithClerk>
    );
}
