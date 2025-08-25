'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { Settings, House, User, ChartLine, Building2, ScrollText } from 'lucide-react';
import Dock from '@/components/ui/dock';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const { openOrganizationProfile, openUserProfile } = useClerk();
    const router = useRouter();
    const pathname = usePathname();

    const items = [
        { icon: <House size={18} />, label: 'Dashboard', onClick: () => router.push('/dashboard') },
        {
            icon: <ScrollText size={18} />,
            label: 'Documentation',
            onClick: () => router.push('https://docs.unlingo.com'),
        },
        { icon: <ChartLine size={18} />, label: 'Analytics', onClick: () => router.push('/dashboard/analytics') },
        { icon: <Settings size={18} />, label: 'Settings', onClick: () => router.push('/dashboard/settings') },
        {
            icon: <Building2 size={18} />,
            label: 'Organization',
            onClick: () =>
                openOrganizationProfile({
                    afterLeaveOrganizationUrl: '/select-org',
                }),
        },
        { icon: <User size={18} />, label: 'Profile', onClick: () => openUserProfile() },
    ];

    const isScreenshotPage = pathname.includes('/screenshots/');

    return (
        <div className='relative min-h-screen'>
            {children}
            {!isScreenshotPage ? <Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} /> : null}
        </div>
    );
}
