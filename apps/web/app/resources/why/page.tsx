'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import Link from 'next/link';

export default function WhyPage() {
    const router = useRouter();
    const { isSignedIn } = useUser();

    return (
        <main className='min-h-screen'>
            {/* Navigation Header */}
            <nav className='border-b'>
                <div className='max-w-7xl mx-auto px-6 py-4'>
                    <div className='flex items-center justify-between'>
                        <Link href='/' className='text-2xl font-bold'>
                            Unlingo
                        </Link>

                        <div className='flex items-center space-x-4'>
                            {isSignedIn ? (
                                <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
                            ) : (
                                <>
                                    <Button intent='outline' onClick={() => router.push('/sign-in')}>
                                        Sign in
                                    </Button>
                                    <Button onClick={() => router.push('/sign-up')}>Get Started</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className='max-w-4xl mx-auto px-6 py-12'>
                <div className='space-y-8'>
                    {/* Header */}
                    <div className='space-y-4'>
                        <h1 className='text-4xl font-bold'>Why Unlingo</h1>
                        <p className='text-muted-fg text-lg'>
                            Translation management should be simple, affordable, and powerful. Here's why developers
                            choose Unlingo for their localization needs.
                        </p>
                    </div>

                    {/* Main Features Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Why Choose Unlingo</CardTitle>
                            <CardDescription>
                                Everything you need to know about our localization platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DescriptionList>
                                <DescriptionTerm>Introduction</DescriptionTerm>
                                <DescriptionDetails>
                                    Unlingo is a modern localization platform built for developers who need a simple,
                                    reliable solution without complex workflows or expensive enterprise tools. We focus
                                    on providing essential features with transparent pricing and unlimited scalability.
                                </DescriptionDetails>

                                <DescriptionTerm>Localization Platform</DescriptionTerm>
                                <DescriptionDetails>
                                    <div className='space-y-2'>
                                        <div>
                                            <strong>AI-Powered Translations:</strong> Get high-quality, context-aware
                                            translations powered by advanced AI models, included in all plans starting at
                                            $5/month.
                                        </div>
                                        <div>
                                            <strong>Cloud Sync:</strong> Sync your translation JSON directly from our
                                            cloud to your devices without paying for API requests if you prefer local
                                            file synchronization.
                                        </div>
                                        <div>
                                            <strong>Unlimited JSON Size:</strong> Unlike competitors who impose strict
                                            file size limits, we never limit your JSON file sizes. Scale your
                                            translations without hitting arbitrary limits.
                                        </div>
                                        <div>
                                            <strong>Visual Context:</strong> Add screenshots to provide translators with
                                            visual context, improving translation accuracy and quality.
                                        </div>
                                        <div>
                                            <strong>Version Control:</strong> Track changes and manage translation
                                            history with built-in version control features.
                                        </div>
                                    </div>
                                </DescriptionDetails>

                                <DescriptionTerm>Developer Experience</DescriptionTerm>
                                <DescriptionDetails>
                                    <div className='space-y-2'>
                                        <div>
                                            <strong>Simple API:</strong> Intuitive REST API that works seamlessly with
                                            i18next, next-intl, and any modern i18n framework. Get started in minutes
                                            with just a few lines of code.
                                        </div>
                                        <div>
                                            <strong>Framework Agnostic:</strong> Works with any i18n library or
                                            framework. Native support for popular solutions like i18next and next-intl.
                                        </div>
                                        <div>
                                            <strong>Instant Sync:</strong> Insta Sync propagates translation keys across
                                            all languages instantly when you edit the primary language. No delays, no
                                            manual updates.
                                        </div>
                                        <div>
                                            <strong>Open Source:</strong> Fully transparent development. Check out our
                                            code on{' '}
                                            <Link
                                                href='https://github.com/twendykirn/unlingo'
                                                target='_blank'
                                                className='text-primary hover:underline'>
                                                GitHub
                                            </Link>
                                            , contribute, or even self-host if you prefer.
                                        </div>
                                    </div>
                                </DescriptionDetails>

                                <DescriptionTerm>Pricing</DescriptionTerm>
                                <DescriptionDetails>
                                    <div className='space-y-2'>
                                        <div>
                                            <strong>Starting at $5/month:</strong> All plans include AI translations.
                                            Unlike competitors who charge $19+ for basic features, we believe powerful
                                            translation tools should be accessible to everyone.
                                        </div>
                                        <div>
                                            <strong>No Hidden Costs:</strong> Transparent pricing with flexible tiers
                                            that grow with your needs. Choose between API requests or cloud sync -
                                            whatever works best for your workflow.
                                        </div>
                                        <div>
                                            <strong>Pay for What You Use:</strong> Scale up or down based on your actual
                                            usage. No long-term commitments or enterprise sales calls required.
                                        </div>
                                    </div>
                                </DescriptionDetails>

                                <DescriptionTerm>Why Switch to Unlingo</DescriptionTerm>
                                <DescriptionDetails>
                                    <div className='space-y-2'>
                                        <div>
                                            <strong>More Affordable:</strong> Save significantly compared to traditional
                                            localization platforms. Get AI translations and advanced features for a
                                            fraction of the cost.
                                        </div>
                                        <div>
                                            <strong>No Arbitrary Limits:</strong> Other platforms limit JSON file sizes,
                                            the number of keys, or charge extra for features that should be standard. We
                                            don't believe in artificial restrictions.
                                        </div>
                                        <div>
                                            <strong>Flexible Sync Options:</strong> Choose how you want to access your
                                            translations - via API or direct cloud sync. This unique flexibility lets you
                                            optimize costs based on your architecture.
                                        </div>
                                        <div>
                                            <strong>Developer-Focused:</strong> Built by developers who were frustrated
                                            with existing solutions. We prioritize simple integration, clear
                                            documentation, and features that actually matter.
                                        </div>
                                    </div>
                                </DescriptionDetails>
                            </DescriptionList>
                        </CardContent>
                    </Card>

                    {/* Call to Action */}
                    <Card>
                        <CardContent className='pt-6'>
                            <div className='text-center space-y-4'>
                                <h2 className='text-2xl font-bold'>Ready to make the switch?</h2>
                                <p className='text-muted-fg'>
                                    Join developers who are simplifying their translation workflows with Unlingo. Get
                                    started today with AI-powered translations, unlimited JSON sizes, and flexible cloud
                                    sync.
                                </p>
                                <div className='flex flex-col sm:flex-row gap-4 justify-center pt-4'>
                                    <Button onClick={() => router.push('/sign-up')}>
                                        Get Started for $5/month
                                        <ArrowRight className='ml-2 h-4 w-4' />
                                    </Button>
                                    <Link href='/'>
                                        <Button intent='outline'>Learn More</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer */}
            <footer className='border-t mt-20'>
                <div className='max-w-6xl mx-auto px-6 py-16'>
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-12'>
                        <div className='space-y-4'>
                            <div className='text-2xl font-bold'>Unlingo</div>
                            <p className='text-muted-fg text-sm'>
                                Simplifying global translation management for developers worldwide.
                            </p>
                        </div>

                        <div className='space-y-4'>
                            <h3 className='font-semibold'>Product</h3>
                            <div className='space-y-2'>
                                <Link href='/' className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    Home
                                </Link>
                                <Link
                                    href='/resources/why'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    Why Unlingo
                                </Link>
                                <Link
                                    href='https://docs.unlingo.com'
                                    target='_blank'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    Documentation
                                </Link>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <h3 className='font-semibold'>Community</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='https://github.com/twendykirn/unlingo'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    GitHub
                                </Link>
                                <Link
                                    href='https://discord.gg/TdDYte7KjG'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    Discord
                                </Link>
                                <Link
                                    href='https://x.com/twendykirn'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    X
                                </Link>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <h3 className='font-semibold'>Legal</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='/legal/terms-of-service'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    Terms of Service
                                </Link>
                                <Link
                                    href='/legal/privacy-policy'
                                    className='block text-muted-fg hover:text-fg transition-colors text-sm'>
                                    Privacy Policy
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}
