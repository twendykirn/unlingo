import '@repo/ui/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { dark } from '@clerk/themes';
import { ClerkProvider } from '@clerk/nextjs';

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
    authors: [{ name: 'Unlingo Team' }],
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
                url: '/og-image.png',
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
        images: ['/og-image.png'],
        creator: '@unlingo',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en' className='dark'>
            <head>
                <link rel='icon' href='/favicon.ico' sizes='any' />
                <link rel='icon' href='/icon.svg' type='image/svg+xml' />
                <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
                <link rel='manifest' href='/manifest.json' />
                <meta name='theme-color' content='#000000' />
                <script
                    type='application/ld+json'
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'SoftwareApplication',
                            name: 'Unlingo',
                            description:
                                'Developer platform for modern internationalization with global low latency, i18next compatibility, and automatic caching.',
                            url: 'https://unlingo.com',
                            applicationCategory: 'DeveloperApplication',
                            operatingSystem: 'Web',
                            offers: {
                                '@type': 'Offer',
                                price: '0',
                                priceCurrency: 'USD',
                            },
                            author: {
                                '@type': 'Organization',
                                name: 'Unlingo',
                            },
                        }),
                    }}
                />
            </head>
            <body className={geist.className}>
                <ClerkProvider
                    appearance={{
                        baseTheme: dark,
                    }}>
                    {children}
                </ClerkProvider>
            </body>
        </html>
    );
}
