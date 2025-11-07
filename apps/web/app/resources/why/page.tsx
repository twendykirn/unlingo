'use client';

import { motion } from 'motion/react';
import {
    Check,
    Zap,
    Database,
    Shield,
    Globe,
    ArrowRight,
    Bot,
    RefreshCw,
    Layers,
    Cloud,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const whyUnlingoReasons = [
    {
        icon: Bot,
        title: 'AI-Powered Translations',
        description:
            'All plans include AI translations starting at just $5/month. Get high-quality, context-aware translations powered by advanced AI models.',
    },
    {
        icon: Cloud,
        title: 'Cloud Sync Without Request Costs',
        description:
            'Sync your translation JSON directly from our cloud to your devices. No need to pay for API requests if you prefer local file synchronization.',
    },
    {
        icon: Database,
        title: 'Unlimited JSON Size',
        description:
            'Unlike competitors who impose strict file size limits, we never limit your JSON file sizes. Scale your translations without worrying about hitting arbitrary limits.',
    },
    {
        icon: Zap,
        title: 'Developer-First API',
        description:
            'Simple, intuitive API that works seamlessly with i18next, next-intl, and any modern i18n framework. Built by developers, for developers.',
    },
    {
        icon: RefreshCw,
        title: 'Instant Synchronization',
        description:
            'Insta Sync propagates translation keys across all languages instantly when you edit the primary language. No delays, no manual updates.',
    },
    {
        icon: Layers,
        title: 'Universal Framework Support',
        description:
            'Works with any i18n library or framework. Native support for popular solutions like i18next and next-intl.',
    },
];

const competitorComparison = [
    {
        feature: 'AI Translations',
        unlingo: true,
        competitors: 'Premium only',
    },
    {
        feature: 'Cloud Sync (No Request Costs)',
        unlingo: true,
        competitors: false,
    },
    {
        feature: 'Unlimited JSON Size',
        unlingo: true,
        competitors: 'Limited',
    },
    {
        feature: 'Starting Price',
        unlingo: '$5/month',
        competitors: '$19+/month',
    },
    {
        feature: 'Version Control',
        unlingo: true,
        competitors: 'Enterprise only',
    },
    {
        feature: 'Visual Context (Screenshots)',
        unlingo: true,
        competitors: 'Limited',
    },
];

export default function WhyPage() {
    const router = useRouter();
    const { isSignedIn } = useUser();

    return (
        <main className='min-h-screen bg-black text-white overflow-hidden'>
            {/* Navigation Header */}
            <nav className='fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800'>
                <div className='max-w-7xl mx-auto px-6 py-4'>
                    <div className='flex items-center justify-between'>
                        <Link href='/' className='text-2xl font-bold'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Unlingo
                            </span>
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

            {/* Hero Section */}
            <section className='relative px-6 pt-32 pb-20'>
                <div className='max-w-4xl mx-auto text-center space-y-6'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}>
                        <Badge className='mb-4'>Why Unlingo</Badge>
                        <h1 className='text-5xl md:text-7xl font-bold mb-6'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Translation management
                            </span>
                            <br />
                            <span className='text-white'>should be simple</span>
                        </h1>
                        <p className='text-xl text-gray-400 max-w-2xl mx-auto'>
                            We built Unlingo because managing translations shouldn't require complex workflows, expensive
                            tools, or arbitrary limitations. Just simple, powerful infrastructure that works.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Main Reasons Section */}
            <section className='relative px-6 py-20'>
                <div className='max-w-6xl mx-auto'>
                    <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {whyUnlingoReasons.map((reason, index) => (
                            <motion.div
                                key={reason.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}>
                                <Card className='h-full border-gray-800 bg-gray-950/50'>
                                    <CardHeader>
                                        <div className='flex items-center gap-3 mb-2'>
                                            <div className='p-2 rounded-md border border-gray-800 bg-black/40'>
                                                <reason.icon className='h-5 w-5 text-white' />
                                            </div>
                                        </div>
                                        <CardTitle className='text-lg'>{reason.title}</CardTitle>
                                        <CardDescription className='text-gray-400'>
                                            {reason.description}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Philosophy Section */}
            <section className='relative px-6 py-20'>
                <div className='max-w-4xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className='space-y-6'>
                        <h2 className='text-3xl md:text-5xl font-bold text-center mb-8'>
                            Affordable for everyone
                        </h2>
                        <Card className='border-gray-800 bg-gray-950/50'>
                            <CardContent className='pt-6'>
                                <div className='space-y-4'>
                                    <div className='flex items-start gap-3'>
                                        <Shield className='h-6 w-6 text-green-400 mt-1' />
                                        <div>
                                            <h3 className='text-xl font-semibold mb-2'>No Hidden Costs</h3>
                                            <p className='text-gray-400'>
                                                Start with AI-powered translations for just $5/month. Unlike competitors
                                                who charge $19+ for basic features, we believe powerful translation tools
                                                should be accessible to everyone.
                                            </p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className='flex items-start gap-3'>
                                        <Globe className='h-6 w-6 text-blue-400 mt-1' />
                                        <div>
                                            <h3 className='text-xl font-semibold mb-2'>Pay for What You Use</h3>
                                            <p className='text-gray-400'>
                                                Flexible pricing tiers that grow with your needs. Choose between API
                                                requests or cloud sync - whatever works best for your workflow.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Comparison Table Section */}
            <section className='relative px-6 py-20'>
                <div className='max-w-4xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className='space-y-6'>
                        <h2 className='text-3xl md:text-5xl font-bold text-center mb-12'>
                            How we compare
                        </h2>
                        <Card className='border-gray-800 bg-gray-950/50'>
                            <CardContent className='pt-6'>
                                <div className='space-y-4'>
                                    {competitorComparison.map((item, index) => (
                                        <div key={item.feature}>
                                            {index > 0 && <Separator />}
                                            <div className='grid grid-cols-3 gap-4 py-3'>
                                                <div className='text-white font-medium'>{item.feature}</div>
                                                <div className='flex items-center justify-center'>
                                                    {typeof item.unlingo === 'boolean' ? (
                                                        item.unlingo ? (
                                                            <Check className='h-5 w-5 text-green-400' />
                                                        ) : (
                                                            <span className='text-gray-600'>-</span>
                                                        )
                                                    ) : (
                                                        <span className='text-green-400 font-semibold'>
                                                            {item.unlingo}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className='flex items-center justify-center text-gray-500'>
                                                    {typeof item.competitors === 'boolean' ? (
                                                        item.competitors ? (
                                                            <Check className='h-5 w-5' />
                                                        ) : (
                                                            <span className='text-gray-600'>✕</span>
                                                        )
                                                    ) : (
                                                        <span>{item.competitors}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className='mt-6 pt-4 border-t border-gray-800'>
                                    <div className='grid grid-cols-3 gap-4 text-sm text-gray-400'>
                                        <div></div>
                                        <div className='text-center font-semibold text-white'>Unlingo</div>
                                        <div className='text-center'>Others</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Developer Experience Section */}
            <section className='relative px-6 py-20'>
                <div className='max-w-4xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className='space-y-6'>
                        <h2 className='text-3xl md:text-5xl font-bold text-center mb-8'>
                            Built for developers
                        </h2>
                        <Card className='border-gray-800 bg-gray-950/50'>
                            <CardContent className='pt-6'>
                                <div className='space-y-6'>
                                    <div>
                                        <h3 className='text-xl font-semibold mb-3'>Simple Integration</h3>
                                        <p className='text-gray-400 mb-4'>
                                            Get started in minutes with just a few lines of code. No complex setup, no
                                            configuration headaches.
                                        </p>
                                        <div className='bg-black/40 border border-gray-800 rounded-lg p-4 font-mono text-sm'>
                                            <code className='text-gray-300'>
                                                // Works with your existing i18n setup
                                                <br />
                                                fetch('https://api.unlingo.com/v1/translations')
                                            </code>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className='text-xl font-semibold mb-3'>Open Source</h3>
                                        <p className='text-gray-400'>
                                            Fully transparent development. Check out our code on GitHub, contribute, or
                                            even self-host if you prefer.
                                        </p>
                                        <Link href='https://github.com/twendykirn/unlingo' target='_blank'>
                                            <Button intent='outline' className='mt-4'>
                                                View on GitHub
                                                <ArrowRight className='ml-2 h-4 w-4' />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className='relative px-6 py-20'>
                <div className='max-w-4xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}>
                        <Card className='border-gray-800 bg-gray-950/50 text-center'>
                            <CardContent className='pt-10 pb-10'>
                                <h2 className='text-3xl md:text-4xl font-bold mb-4'>Ready to get started?</h2>
                                <p className='text-gray-400 mb-8 max-w-xl mx-auto'>
                                    Join developers who are simplifying their translation workflows with Unlingo.
                                </p>
                                <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                                    <Button onClick={() => router.push('/sign-up')}>
                                        Start for $5/month
                                        <ArrowRight className='ml-2 h-4 w-4' />
                                    </Button>
                                    <Link href='/'>
                                        <Button intent='outline'>Learn More</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
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
                        </div>

                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Product</h3>
                            <div className='space-y-2'>
                                <Link href='/' className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    Home
                                </Link>
                                <Link
                                    href='/resources/why'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    Why Unlingo
                                </Link>
                                <Link
                                    href='https://docs.unlingo.com'
                                    target='_blank'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    Documentation
                                </Link>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Community</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='https://github.com/twendykirn/unlingo'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    GitHub
                                </Link>
                                <Link
                                    href='https://discord.gg/TdDYte7KjG'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    Discord
                                </Link>
                                <Link
                                    href='https://x.com/twendykirn'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    X
                                </Link>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Legal</h3>
                            <div className='space-y-2'>
                                <Link
                                    href='/legal/terms-of-service'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
                                    Terms of Service
                                </Link>
                                <Link
                                    href='/legal/privacy-policy'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm'>
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
