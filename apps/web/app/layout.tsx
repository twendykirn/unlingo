import './globals.css';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { HeroUIProvider } from '@heroui/react';
import { OpenPanelComponent } from '@openpanel/nextjs';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Unlingo - Developer Platform for Modern Internationalization',
    description:
        'The simplest way to host, manage, and deliver translations for your applications. Built for developers with global low latency, i18next compatibility, and automatic caching.',
    keywords: [
        'internationalization',
        'i18n',
        'translations',
        'localization',
        'developer tools',
        'i18next',
        'global',
        'API',
    ],
    authors: [{ name: 'Unlingo Team', url: 'https://unlingo.com' }],
    creator: 'Unlingo',
    publisher: 'Unlingo',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL('https://unlingo.com'),
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'Unlingo - Developer Platform for Modern Internationalization',
        description:
            'The simplest way to host, manage, and deliver translations for your applications. Built for developers with global low latency and i18next compatibility.',
        url: 'https://unlingo.com',
        siteName: 'Unlingo',
        images: [
            {
                url: '/og.png',
                width: 1200,
                height: 630,
                alt: 'Unlingo - Developer Platform for Modern Internationalization',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Unlingo - Developer Platform for Modern Internationalization',
        description: 'The simplest way to host, manage, and deliver translations for your applications.',
        images: ['/og.png'],
        creator: '@twendykirn',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: '/favicon.ico',
        other: { rel: 'icon', url: '/favicon.ico' },
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en' className='dark'>
            <body className={geist.className}>
                <ClerkProvider>
                    <HeroUIProvider>{children}</HeroUIProvider>
                </ClerkProvider>
                <OpenPanelComponent
                    clientId={process.env.NEXT_PUBLIC_OPEN_PANEL_CLIENT_ID!}
                    trackScreenViews={true}
                    trackAttributes={true}
                    trackOutgoingLinks={true}
                    disabled={process.env.NODE_ENV === 'development'} // No tracking in development
                />
            </body>
        </html>
    );
}
