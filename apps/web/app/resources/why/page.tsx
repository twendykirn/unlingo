'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import Link from 'next/link';

export default function WhyPage() {
    const router = useRouter();
    const { isSignedIn } = useUser();

    return (
        <main className='min-h-screen'>
            <nav className='fixed top-0 left-0 right-0 z-50 bg-black backdrop-blur-sm border-b border-gray-800'>
                <div className='max-w-7xl mx-auto px-6 py-4'>
                    <div className='flex items-center justify-between'>
                        <div className='text-2xl font-bold'>
                            <Link href='/' className='cursor-pointer'>
                                <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                    Unlingo
                                </span>
                            </Link>
                        </div>
                        <div className='hidden md:flex items-center space-x-8'>
                            <Link href='/' className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Home
                            </Link>
                            <Link
                                href='https://docs.unlingo.com'
                                target='_blank'
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Docs
                            </Link>
                            <Link
                                href='/#pricing'
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Pricing
                            </Link>
                            <Link
                                href='https://unlingo.userjot.com/roadmap'
                                target='_blank'
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Roadmap
                            </Link>
                            <Link
                                href='/resources/about'
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                About
                            </Link>
                        </div>
                        <div className='flex items-center space-x-4'>
                            {isSignedIn ? (
                                <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
                            ) : (
                                <Button onClick={() => router.push('/sign-in')}>Log in</Button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            <div className='w-full h-full bg-black pb-10'>
                <div className='max-w-4xl mx-auto py-8 pt-20 sm:pt-34'>
                    <div className='space-y-8 bg-zinc-950 p-16 rounded-xl'>
                        <div className='space-y-4'>
                            <h1 className='text-4xl font-bold max-w-[620px]'>
                                Why Unlingo is the best way to localize your software
                            </h1>
                            <p className='text-lg'>
                                Translation management should be simple, affordable, and powerful. Here's why developers
                                choose Unlingo for their localization needs.
                            </p>
                        </div>
                        <Card>
                            <CardContent>
                                <DescriptionList>
                                    <DescriptionTerm>Introduction</DescriptionTerm>
                                    <DescriptionDetails>
                                        Unlingo is a modern localization platform built for developers who need a
                                        simple, reliable solution without complex workflows or expensive enterprise
                                        tools. We focus on providing essential features with transparent pricing and
                                        unlimited scalability.
                                    </DescriptionDetails>
                                    <DescriptionTerm>Localization Platform</DescriptionTerm>
                                    <DescriptionDetails>
                                        <div className='space-y-2'>
                                            <div>
                                                <strong>AI-Powered Translations:</strong> Get high-quality,
                                                context-aware translations powered by advanced AI models, included in
                                                all plans starting at $5/month.
                                            </div>
                                            <div>
                                                <strong>Local Sync:</strong> Sync your translation JSON directly from
                                                our cloud to your devices without paying for API requests if you prefer
                                                local file synchronization.
                                            </div>
                                            <div>
                                                <strong>Unlimited JSON Size:</strong> Unlike competitors who impose
                                                strict file size limits, we never limit your JSON file sizes. Scale your
                                                translations without hitting arbitrary limits.
                                            </div>
                                            <div>
                                                <strong>Visual Context:</strong> Add screenshots to provide translators
                                                with visual context, improving translation accuracy and quality.
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
                                                <strong>Simple API:</strong> Intuitive REST API that works seamlessly
                                                with any modern library/framework. Get started in minutes with just a
                                                few lines of code.
                                            </div>
                                            <div>
                                                <strong>Variables and Formats:</strong> You can use variables and any
                                                formats from your favorite library by default.
                                            </div>
                                            <div>
                                                <strong>Instant Sync:</strong> Insta Sync propagates translation keys
                                                across all languages and translates changes instantly when you edit the
                                                primary language. No delays, no manual updates.
                                            </div>
                                            <div>
                                                <strong>Open Source:</strong> Fully transparent development. Check out
                                                our code on{' '}
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
                                                <strong>Starting at $5/month:</strong> All plans include AI
                                                translations. We believe powerful translation tools should be accessible
                                                to everyone.
                                            </div>
                                            <div>
                                                <strong>No Hidden Costs:</strong> Transparent pricing with flexible
                                                tiers that grow with your needs. You can always upgrade to a higher plan
                                                or stay on the cheapest and use local sync - whatever works best for
                                                your workflow.
                                            </div>
                                            <div>
                                                <strong>Pay for What You Use:</strong> Scale up or down based on your
                                                actual usage. No long-term commitments or enterprise sales calls
                                                required.
                                            </div>
                                        </div>
                                    </DescriptionDetails>
                                    <DescriptionTerm>Why Switch to Unlingo</DescriptionTerm>
                                    <DescriptionDetails>
                                        <div className='space-y-2'>
                                            <div>
                                                <strong>More Affordable:</strong> Save significantly compared to
                                                traditional localization platforms. Get AI translations and advanced
                                                features for a fraction of the cost.
                                            </div>
                                            <div>
                                                <strong>No Arbitrary Limits:</strong> Other platforms limit JSON file
                                                sizes, the number of keys, or charge extra for features that should be
                                                standard.
                                            </div>
                                            <div>
                                                <strong>Flexible Sync Options:</strong> Choose how you want to access
                                                your translations - via API or through manual local sync. This unique
                                                flexibility lets you optimize costs based on your architecture.
                                            </div>
                                            <div>
                                                <strong>Developer-Focused:</strong> Built by developers who were
                                                frustrated with existing solutions. We prioritize simple integration,
                                                clear documentation, and features that actually matter.
                                            </div>
                                        </div>
                                    </DescriptionDetails>
                                </DescriptionList>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className='pt-6'>
                                <div className='text-center space-y-4'>
                                    <h2 className='text-2xl font-bold'>Ready to make the switch?</h2>
                                    <p className='text-muted-fg'>
                                        Join developers who are simplifying their translation workflows with Unlingo.
                                        Get started today with AI-powered translations, unlimited JSON sizes, and
                                        flexible cloud sync.
                                    </p>
                                    <div className='flex flex-col sm:flex-row gap-4 justify-center pt-4'>
                                        <Button onClick={() => router.push('/sign-up')}>
                                            Get Started
                                            <ArrowRight className=' h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <footer className='relative bg-black border-t border-gray-800'>
                <div className='max-w-6xl mx-auto px-6 py-16'>
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-12'>
                        <div className='space-y-4'>
                            <div className='text-2xl font-bold'>
                                <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                    Unlingo
                                </span>
                            </div>
                            <p className='text-gray-400 text-sm'>
                                Simplifying global translation management for developers worldwide.
                            </p>
                            <p className='text-gray-500 text-xs'>
                                © {new Date().getFullYear()} Igor Kirnosov s.p. All rights reserved.
                            </p>
                        </div>
                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Sections</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='/'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Home
                                </Link>
                                <Link
                                    href='/#features'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Features
                                </Link>
                                <Link
                                    href='/examples'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Examples
                                </Link>
                                <Link
                                    href='/pricing'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Pricing
                                </Link>
                                <Link
                                    href='https://docs.unlingo.com'
                                    target='_blank'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Documentation
                                </Link>
                                <Link
                                    href='https://unlingo.openstatus.dev'
                                    target='_blank'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Status
                                </Link>
                                <Link
                                    href='https://unlingo.userjot.com/roadmap'
                                    target='_blank'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Roadmap
                                </Link>
                            </div>
                        </div>
                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Community</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='https://x.com/twendykirn'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    X
                                </Link>
                                <Link
                                    href='https://discord.gg/TdDYte7KjG'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Discord
                                </Link>
                                <Link
                                    href='https://github.com/twendykirn/unlingo'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Github
                                </Link>
                                <Link
                                    href='mailto:support@unlingo.com'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Contact Us
                                </Link>
                            </div>
                        </div>
                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Legal</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='/legal/terms-of-service'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Terms of Service
                                </Link>
                                <Link
                                    href='/legal/privacy-policy'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
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
