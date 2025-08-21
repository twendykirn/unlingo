'use client';

import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { Settings, House, User, ChartLine, Building2 } from 'lucide-react';
import Dock from '@/components/ui/dock';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const { openOrganizationProfile, openUserProfile } = useClerk();
    const router = useRouter();

    const items = [
        { icon: <House size={18} />, label: 'Dashboard', onClick: () => router.push('/dashboard') },
        { icon: <ChartLine size={18} />, label: 'Analytics', onClick: () => router.push('/dashboard/analytics') },
        { icon: <Settings size={18} />, label: 'Settings', onClick: () => router.push('/dashboard/settings') },
        { icon: <Building2 size={18} />, label: 'Organization', onClick: () => openOrganizationProfile() },
        { icon: <User size={18} />, label: 'Profile', onClick: () => openUserProfile() },
    ];

    return (
        <div className='relative min-h-screen'>
            {children}
            <Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
        </div>
    );
}
