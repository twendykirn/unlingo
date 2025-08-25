'use client';

import { motion } from 'motion/react';
import {
    ArrowRight,
    Zap,
    Database,
    Palette,
    Check,
    ChevronDown,
    GitBranch,
    Calendar,
    Copy,
    Play,
    RefreshCw,
    Bot,
    Camera,
    Layers,
    BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Gradient } from '@/components/ui/gradient';
import SpotlightCard from '@/components/ui/spotlight-card';
import Galaxy from '@/components/ui/galaxy';
import { BorderBeam } from '@/components/magicui/border-beam';
import { MagicCard } from '@/components/magicui/magic-card';
import { Meteors } from '@/components/magicui/meteors';
import { ShineBorder } from '@/components/magicui/shine-border';
import Link from 'next/link';
import { CodeEditor } from '@/components/code-editor';
import GithubSpaceLogo from '@/components/github-space-logo';

const features = [
    {
        icon: BarChart3,
        title: 'Analytics',
        description: 'Track languages usage to monitor performance and optimize your translations',
    },
    {
        icon: Layers,
        title: 'Universal Framework Support',
        description: 'Works seamlessly with i18next, next-intl and any modern i18n library',
    },
    {
        icon: Zap,
        title: 'Developer-Friendly API',
        description: 'Simple, intuitive API that developers love to work with',
    },
    {
        icon: RefreshCw,
        title: 'Insta Sync',
        description: 'Instantly propagates translation keys across all languages when you edit the primary language',
    },
    {
        icon: Bot,
        title: 'AI-Powered Translations',
        description: 'Smart AI assistance helps generate high-quality translations',
    },
    {
        icon: Camera,
        title: 'Visual Context Mapping',
        description: 'Attach screenshots to translations for crystal-clear context and faster localization workflows',
    },
    {
        icon: Database,
        title: 'Automatic Caching',
        description: 'Smart caching system that optimizes performance automatically',
    },
    {
        icon: Palette,
        title: 'Easy UI',
        description: 'Beautiful, intuitive interface for managing translations',
    },
    {
        icon: GitBranch,
        title: 'Version Control',
        description: 'Create different translation versions for different apps and environments',
    },
];

const pricingOptions = [
    { requests: '50k', price: 12 },
    { requests: '250k', price: 25 },
    { requests: '500k', price: 50 },
    { requests: '1M', price: 75 },
    { requests: '2M', price: 100 },
    { requests: '10M', price: 250 },
    { requests: '50M', price: 500 },
    { requests: '100M', price: 1000 },
];

const getPlanLimits = (requests: string) => {
    if (requests === '50k') {
        return {
            projects: 3,
            namespacesPerProject: 12,
            versionsPerNamespace: 8,
            languagesPerVersion: 12,
        };
    } else {
        return {
            projects: 30,
            namespacesPerProject: 40,
            versionsPerNamespace: 20,
            languagesPerVersion: 35,
        };
    }
};

const getCodeExample = (library: string) => {
    switch (library) {
        case 'i18next':
            return `import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

class UnlingoBackend {
    constructor() {
        this.type = 'backend';
        // You can add own options if needed
        this.init();
    }

    init() {}

    async read(language, namespace, callback) {
        try {
            const url = new URL('/v1/translations', 'https://api.unlingo.com');
            url.searchParams.set('release', process.env.UNLINGO_RELEASE_TAG);
            url.searchParams.set('namespace', namespace);
            url.searchParams.set('lang', language);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'x-api-key': process.env.UNLINGO_API_KEY,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return callback(new Error(errorData.error), null);
            }

            const data = await response.json();
            callback(null, data);
        } catch (error) {
            console.error('Unlingo Backend Error:', error);
            callback(error, null);
        }
    }
}

export default UnlingoBackend;

i18next
  .use(UnlingoBackend) 
  .use(initReactI18next)
  .init({
    ...
  });

export default i18next;`;

        case 'next-intl':
            return `import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
 
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

    const url = new URL('/v1/translations', 'https://api.unlingo.com');
    url.searchParams.set('release', process.env.UNLINGO_RELEASE_TAG);
    url.searchParams.set('namespace', process.env.UNLINGO_NAMESPACE);
    url.searchParams.set('lang', locale);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-api-key': process.env.UNLINGO_API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
 
  return {
    locale,
    messages: data,
  };
});`;

        case 'rest api':
            return `const response = await fetch(
  'https://api.unlingo.com/v1/translations?release=YOUR_RELEASE_TAG&namespace=YOUR_NAMESPACE&lang=YOUR_LANGUAGE', {
  headers: {
    'Authorization': 'Bearer your-api-key',
  }
});

const translations = await response.json();

// Use translations in your app
console.log(translations.welcome);`;

        default:
            return 'Select a library to see the integration example';
    }
};

export default function Page() {
    const [selectedPricing, setSelectedPricing] = useState(pricingOptions[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeLibrary, setActiveLibrary] = useState('i18next');
    const [isCopied, setIsCopied] = useState(false);
    const router = useRouter();
    const { isSignedIn } = useUser();

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <main className='min-h-screen bg-black text-white overflow-hidden relative'>
            {/* Navigation Header */}
            <nav className='fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800'>
                <div className='max-w-7xl mx-auto px-6 py-4'>
                    <div className='flex items-center justify-between'>
                        {/* Logo */}
                        <div className='text-2xl font-bold'>
                            <button onClick={() => scrollToSection('hero')} className='cursor-pointer'>
                                <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                    Unlingo
                                </span>
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <div className='hidden md:flex items-center space-x-8'>
                            <button
                                onClick={() => scrollToSection('hero')}
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Home
                            </button>
                            <button
                                onClick={() => scrollToSection('features')}
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection('examples')}
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Examples
                            </button>
                            <button
                                onClick={() => scrollToSection('pricing')}
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Pricing
                            </button>
                            <Link
                                href='https://docs.unlingo.com'
                                target='_blank'
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Documentation
                            </Link>
                        </div>

                        {/* Auth Buttons */}
                        <div className='flex items-center space-x-4'>
                            {isSignedIn ? (
                                <>
                                    <SignOutButton>
                                        <Button variant='ghost' className='text-gray-300 hover:text-white'>
                                            Sign Out
                                        </Button>
                                    </SignOutButton>
                                    <Button
                                        size='sm'
                                        className='bg-white text-black hover:bg-gray-200'
                                        onClick={() => router.push('/dashboard')}>
                                        Dashboard
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant='ghost'
                                        className='text-gray-300 hover:text-white'
                                        onClick={() => router.push('/sign-in')}>
                                        Sign in
                                    </Button>
                                    <Button
                                        size='sm'
                                        className='bg-white text-black hover:bg-gray-200'
                                        onClick={() => router.push('/sign-up')}>
                                        Get Started
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Background gradients */}
            <div className='absolute inset-0'>
                <Gradient className='top-0 left-0 opacity-20 w-[800px] h-[800px]' conic />
                <Gradient className='bottom-0 right-0 opacity-15 w-[600px] h-[600px]' conic />
            </div>

            {/* Hero Section */}
            <section id='hero' className='relative min-h-screen flex items-center justify-center px-6 pt-20'>
                {/* Galaxy Background - Full Hero Section */}
                <Galaxy />
                <div className='max-w-6xl mx-auto text-center space-y-8 z-10'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className='space-y-6'>
                        <div className='relative inline-flex items-center space-x-2 bg-gray-900/50 rounded-full px-4 py-2 text-sm overflow-hidden'>
                            <ShineBorder shineColor={['#ec4899', '#7c3aed', '#3b82f6']} className='absolute inset-0' />
                            <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse relative z-10' />
                            <span className='text-gray-300 relative z-10'>Translations made simple</span>
                        </div>

                        <h1 className='text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Unlingo
                            </span>
                        </h1>

                        <p className='text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed'>
                            The developer platform for modern internationalization. Host, manage, and deliver
                            translations with zero complexity.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
                        <Button
                            size='lg'
                            className='bg-white hover:bg-gray-200 font-semibold px-8 py-4 text-lg group shadow-lg hover:shadow-xl transition-all duration-300'
                            onClick={() => router.push('/sign-up')}>
                            Get Started Free
                            <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
                        </Button>
                        <Link href='https://docs.unlingo.com' target='_blank'>
                            <Button
                                variant='outline'
                                size='lg'
                                className='border-2 border-white/30 hover:border-white/50 bg-black/40 backdrop-blur-sm hover:bg-white/10 px-8 py-4 text-lg text-white hover:text-white shadow-lg hover:shadow-xl transition-all duration-300'>
                                View Documentation
                            </Button>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className='pt-12'>
                        <div className='bg-gray-900/50 border border-gray-800 rounded-lg max-w-3xl mx-auto relative overflow-hidden'>
                            <div className='aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center'>
                                <div className='text-center space-y-4'>
                                    <div className='w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center'>
                                        <Play className='h-8 w-8 text-white ml-1' />
                                    </div>
                                    <div className='space-y-2'>
                                        <h3 className='text-xl font-semibold text-white'>Platform Demo</h3>
                                        <p className='text-gray-400 text-sm'>
                                            See how Unlingo transforms your workflow
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Code Examples Section */}
            <section id='examples' className='relative py-32 px-6'>
                <div className='max-w-6xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className='text-center mb-12'>
                        <h2 className='text-4xl md:text-6xl font-bold mb-6'>
                            Works with{' '}
                            <span className='bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent'>
                                every library
                            </span>
                        </h2>
                        <p className='text-xl text-gray-400 max-w-3xl mx-auto'>
                            Our platform seamlessly integrates with your favorite internationalization libraries and
                            frameworks. Choose your stack and get started in minutes.
                        </p>
                    </motion.div>

                    {/* Library Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        className='flex flex-wrap justify-center gap-4 mb-12'>
                        {['i18next', 'next-intl', 'rest api'].map(library => (
                            <button
                                key={library}
                                onClick={() => setActiveLibrary(library)}
                                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer ${
                                    activeLibrary === library
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-900/50 border border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-600/20 hover:scale-105'
                                }`}>
                                {library}
                            </button>
                        ))}
                    </motion.div>

                    {/* Code Example Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        viewport={{ once: true }}
                        className='max-w-6xl mx-auto'>
                        <div className='relative bg-gray-950/80 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden shadow-2xl'>
                            {/* Terminal Header */}
                            <div className='flex items-center justify-between px-6 py-4 bg-gray-900/50 border-b border-gray-800/50'>
                                <div className='flex items-center space-x-4'>
                                    <div className='flex space-x-2'>
                                        <div className='w-3 h-3 bg-red-500 rounded-full' />
                                        <div className='w-3 h-3 bg-yellow-500 rounded-full' />
                                        <div className='w-3 h-3 bg-green-500 rounded-full' />
                                    </div>
                                    <div className='text-sm text-gray-400 font-mono'>
                                        {activeLibrary === 'rest api' ? 'curl' : `${activeLibrary}.js`}
                                    </div>
                                </div>
                                <div className='flex items-center space-x-3'>
                                    <span className='text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md font-mono'>
                                        {activeLibrary}
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(getCodeExample(activeLibrary));
                                            setIsCopied(true);
                                            setTimeout(() => setIsCopied(false), 600);
                                        }}
                                        className='p-2 hover:bg-gray-800 rounded-lg transition-all duration-200 cursor-pointer group'>
                                        {isCopied ? (
                                            <Check className='h-4 w-4 text-green-400' />
                                        ) : (
                                            <Copy className='h-4 w-4 text-gray-400 group-hover:text-white' />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Code Editor */}
                            <div className='relative overflow-hidden'>
                                <div
                                    className='max-h-[500px] overflow-y-auto overflow-x-auto'
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.3)',
                                    }}>
                                    <CodeEditor
                                        value={getCodeExample(activeLibrary)}
                                        language='javascript'
                                        readOnly
                                        padding={24}
                                        className='min-h-[400px] text-sm font-mono border-none pointer-events-none'
                                        style={{
                                            fontSize: '14px',
                                            fontFamily:
                                                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                        }}
                                        data-color-mode='dark'
                                    />
                                </div>
                            </div>

                            {/* Animated Border Effects */}
                            <BorderBeam
                                duration={12}
                                size={800}
                                className='from-transparent via-pink-600 to-transparent'
                            />
                            <BorderBeam
                                duration={12}
                                delay={6}
                                size={800}
                                borderWidth={2}
                                className='from-transparent via-purple-600 to-transparent'
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id='features' className='relative py-32 px-6'>
                <div className='max-w-6xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className='text-center mb-20'>
                        <h2 className='text-4xl md:text-6xl font-bold mb-6'>
                            Built for{' '}
                            <span className='bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent'>
                                developers
                            </span>
                        </h2>
                        <p className='text-xl text-gray-400 max-w-3xl mx-auto'>
                            Everything you need to internationalize your application, without the complexity.
                        </p>
                    </motion.div>

                    <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className='group h-full'>
                                <MagicCard
                                    gradientColor='#262626'
                                    className='bg-gray-900/50 border border-gray-800 rounded-lg p-8 h-full hover:border-gray-700 transition-colors'>
                                    <div className='flex items-center space-x-4 mb-4'>
                                        <div className='p-3 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors'>
                                            <feature.icon className='h-6 w-6 text-white' />
                                        </div>
                                        <h3 className='text-xl font-semibold'>{feature.title}</h3>
                                    </div>
                                    <p className='text-gray-400 leading-relaxed'>{feature.description}</p>
                                </MagicCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Open Source Section */}
            <section className='relative py-16 sm:py-24 lg:py-32 px-4 sm:px-6'>
                <div className='max-w-6xl mx-auto'>
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center'>
                        {/* Left Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            viewport={{ once: true }}
                            className='space-y-6 sm:space-y-8 text-center lg:text-left'>
                            <div className='space-y-4 sm:space-y-6'>
                                <div className='relative inline-flex items-center space-x-2 bg-gray-900/50 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm overflow-hidden'>
                                    <ShineBorder
                                        shineColor={['#a855f7', '#ec4899', '#8b5cf6']}
                                        className='absolute inset-0'
                                    />
                                    <div className='w-2 h-2 bg-purple-400 rounded-full animate-pulse relative z-10' />
                                    <span className='text-gray-300 relative z-10'>Fully transparent</span>
                                </div>

                                <h2 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight'>
                                    Open Source
                                </h2>

                                <p className='text-lg sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto lg:mx-0'>
                                    Our entire platform is fully open-source, with the complete codebase and development
                                    process transparently accessible. Learn from our approach, contribute to the
                                    project, and adapt it to your specific needs.
                                </p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                                viewport={{ once: true }}
                                className='flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'>
                                <Link href='https://github.com/twendykirn/unlingo' target='_blank'>
                                    <Button
                                        size='lg'
                                        className='bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg group shadow-lg hover:shadow-xl transition-all duration-500 w-full sm:w-auto'>
                                        <div className='flex items-center justify-center'>
                                            <svg
                                                className='mr-2 sm:mr-3 h-4 sm:h-5 w-4 sm:w-5'
                                                fill='currentColor'
                                                viewBox='0 0 24 24'>
                                                <path
                                                    fillRule='evenodd'
                                                    d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
                                                    clipRule='evenodd'
                                                />
                                            </svg>
                                            <span>Give us a star</span>
                                        </div>
                                        <ArrowRight className='ml-2 h-4 sm:h-5 w-4 sm:w-5 group-hover:translate-x-1 transition-transform duration-300' />
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* Right Content - GitHub Space Logo */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                            viewport={{ once: true }}
                            className='flex items-center justify-center mt-8 lg:mt-0'>
                            <div className='relative w-full max-w-sm sm:max-w-md lg:max-w-lg'>
                                <div className='relative p-8 sm:p-10 lg:p-12'>
                                    <div className='w-full flex justify-center'>
                                        <GithubSpaceLogo />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Powered By Section */}
            <section className='relative py-20 px-6'>
                <div className='max-w-6xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className='text-center mb-16'>
                        <h2 className='text-3xl md:text-4xl font-bold mb-4 text-gray-300'>Powered by</h2>
                        <p className='text-lg text-gray-500 max-w-2xl mx-auto'>
                            Built with industry-leading technologies and services
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-center justify-items-center max-w-5xl mx-auto'>
                        {/* First Row */}
                        {/* Convex */}
                        <Link className='w-full h-24 cursor-pointer group' href='https://convex.dev' target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-orange-500/30 transition-all duration-300'
                                spotlightColor='rgba(255, 165, 0, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-orange-400 transition-colors'>
                                        Convex
                                    </div>
                                    <div className='text-xs text-gray-500'>Backend Platform</div>
                                </div>
                            </SpotlightCard>
                        </Link>

                        {/* Clerk */}
                        <Link className='w-full h-24 cursor-pointer group' href='https://clerk.com' target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-indigo-500/30 transition-all duration-300'
                                spotlightColor='rgba(99, 102, 241, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-indigo-400 transition-colors'>
                                        Clerk
                                    </div>
                                    <div className='text-xs text-gray-500'>Authentication</div>
                                </div>
                            </SpotlightCard>
                        </Link>

                        {/* Vercel */}
                        <Link className='w-full h-24 cursor-pointer group' href='https://vercel.com' target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-white/30 transition-all duration-300'
                                spotlightColor='rgba(255, 255, 255, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-white transition-colors'>
                                        Vercel
                                    </div>
                                    <div className='text-xs text-gray-500'>Hosting Platform</div>
                                </div>
                            </SpotlightCard>
                        </Link>

                        {/* Second Row */}
                        {/* Polar */}
                        <Link className='w-full h-24 cursor-pointer group' href='https://polar.sh' target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-blue-500/30 transition-all duration-300'
                                spotlightColor='rgba(59, 130, 246, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-blue-400 transition-colors'>
                                        Polar
                                    </div>
                                    <div className='text-xs text-gray-500'>Payments</div>
                                </div>
                            </SpotlightCard>
                        </Link>

                        {/* Databuddy */}
                        <Link className='w-full h-24 cursor-pointer group' href='https://databuddy.cc' target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-[#3C83F6]/30 transition-all duration-300'
                                spotlightColor='rgba(60, 131, 246, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-[#3C83F6] transition-colors'>
                                        Databuddy
                                    </div>
                                    <div className='text-xs text-gray-500'>Web Analytics</div>
                                </div>
                            </SpotlightCard>
                        </Link>

                        {/* Resend */}
                        <Link className='w-full h-24 cursor-pointer group' href='https://resend.com' target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-violet-500/30 transition-all duration-300'
                                spotlightColor='rgba(139, 92, 246, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-violet-400 transition-colors'>
                                        Resend
                                    </div>
                                    <div className='text-xs text-gray-500'>Email API</div>
                                </div>
                            </SpotlightCard>
                        </Link>

                        {/* PostHog */}
                        <Link
                            className='w-full h-24 cursor-pointer group sm:col-start-1 lg:col-start-2'
                            href='https://posthog.com'
                            target='_blank'>
                            <SpotlightCard
                                className='flex items-center justify-center h-full rounded-lg bg-gray-900/50 border border-gray-800/50 group-hover:border-yellow-500/30 transition-all duration-300'
                                spotlightColor='rgba(234, 179, 8, 0.15)'>
                                <div className='text-center'>
                                    <div className='text-lg font-bold text-gray-300 mb-1 group-hover:text-yellow-500 transition-colors'>
                                        PostHog
                                    </div>
                                    <div className='text-xs text-gray-500'>API Analytics</div>
                                </div>
                            </SpotlightCard>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id='pricing' className='relative py-32 px-6'>
                <div className='max-w-6xl mx-auto'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className='text-center mb-20'>
                        <h2 className='text-4xl md:text-6xl font-bold mb-6'>
                            Simple{' '}
                            <span className='bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent'>
                                pricing
                            </span>
                        </h2>
                        <p className='text-xl text-gray-400 max-w-3xl mx-auto'>
                            Choose the plan that fits your needs. Start free and scale as you grow.
                        </p>
                    </motion.div>

                    <div className='grid md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
                        {/* Free Tier */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            viewport={{ once: true }}
                            className='bg-gray-900/50 border border-gray-800 rounded-lg p-8 relative'>
                            <h3 className='text-2xl font-bold mb-2'>Free</h3>
                            <div className='mb-6'>
                                <span className='text-4xl font-bold'>$0</span>
                                <span className='text-gray-400'>/month</span>
                            </div>
                            <ul className='space-y-3 mb-8'>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>1 project</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>5 namespaces per project</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>5 languages per version</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>1 version per namespace</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>10k requests/month</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>Community support</span>
                                </li>
                            </ul>
                            <Button
                                className='w-full bg-white text-black hover:bg-gray-200'
                                onClick={() => router.push('/sign-up')}>
                                Get Started Free
                            </Button>
                        </motion.div>

                        {/* Pro Tier */}
                        <div className='relative'>
                            <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 z-20'>
                                <span className='bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold'>
                                    Most Popular
                                </span>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                viewport={{ once: true }}
                                className='bg-gray-900/50 rounded-lg p-8 pt-12 relative overflow-hidden'>
                                <ShineBorder
                                    shineColor={['#ec4899', '#7c3aed', '#3b82f6']}
                                    className='absolute inset-0'
                                />
                                <div className='relative z-10'>
                                    <h3 className='text-2xl font-bold mb-2'>Pro</h3>
                                    <div className='mb-6'>
                                        <span className='text-4xl font-bold'>${selectedPricing?.price}</span>
                                        <span className='text-gray-400'>/month</span>
                                    </div>

                                    {/* Dropdown for request amounts */}
                                    <div className='mb-6'>
                                        <label className='block text-sm font-medium text-gray-300 mb-2'>
                                            Monthly requests
                                        </label>
                                        <div className='relative'>
                                            <button
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className='w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 flex items-center justify-between hover:bg-gray-750 transition-colors cursor-pointer'>
                                                <span>{selectedPricing?.requests}</span>
                                                <ChevronDown
                                                    className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                            {isDropdownOpen && (
                                                <div className='absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10'>
                                                    {pricingOptions.map(option => (
                                                        <button
                                                            key={option.requests}
                                                            onClick={() => {
                                                                setSelectedPricing(option);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className='w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md cursor-pointer'>
                                                            {option.requests}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <ul className='space-y-3 mb-8'>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>
                                                {getPlanLimits(selectedPricing?.requests || '50k').projects} projects
                                            </span>
                                        </li>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>
                                                {getPlanLimits(selectedPricing?.requests || '50k').namespacesPerProject}{' '}
                                                namespaces per project
                                            </span>
                                        </li>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>
                                                {getPlanLimits(selectedPricing?.requests || '50k').languagesPerVersion}{' '}
                                                languages per version
                                            </span>
                                        </li>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>
                                                {getPlanLimits(selectedPricing?.requests || '50k').versionsPerNamespace}{' '}
                                                versions per namespace
                                            </span>
                                        </li>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>{selectedPricing?.requests} requests/month</span>
                                        </li>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>AI translations</span>
                                        </li>
                                        <li className='flex items-center'>
                                            <Check className='h-5 w-5 text-green-400 mr-3' />
                                            <span>Priority support</span>
                                        </li>
                                    </ul>
                                    <Button
                                        className='w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white'
                                        onClick={() => router.push('/sign-up')}>
                                        Upgrade to Pro
                                    </Button>
                                </div>
                            </motion.div>
                        </div>

                        {/* Enterprise Tier */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            viewport={{ once: true }}
                            className='bg-gray-900/50 border border-gray-800 rounded-lg p-8 relative'>
                            <h3 className='text-2xl font-bold mb-2'>Enterprise</h3>
                            <div className='mb-6'>
                                <span className='text-4xl font-bold'>Custom $</span>
                                <span className='text-gray-400'>/month</span>
                            </div>
                            <ul className='space-y-3 mb-8'>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>Custom Quotas</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>Dedicated support</span>
                                </li>
                            </ul>
                            <Link href='mailto:support@unlingo.com?subject=Enterprise%20Support'>
                                <Button className='w-full bg-white text-black hover:bg-gray-200'>Contact Us</Button>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className='relative py-32 px-6 overflow-hidden'>
                <Meteors number={25} />
                <div className='max-w-4xl mx-auto text-center relative z-10'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className='space-y-8'>
                        <h2 className='text-4xl md:text-6xl font-bold'>
                            Translate your{' '}
                            <span className='bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent'>
                                app today
                            </span>
                        </h2>
                        <p className='text-xl text-gray-400 max-w-2xl mx-auto'>
                            Get started with Unlingo and bring your application to a global audience with powerful
                            translation management tools.
                        </p>
                        <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
                            <Link href='/sign-up'>
                                <Button
                                    size='lg'
                                    className='bg-white text-black hover:bg-gray-200 font-semibold text-lg group'>
                                    Start Now
                                    <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
                                </Button>
                            </Link>
                            <Link href='mailto:support@unlingo.com'>
                                <Button variant='ghost' size='lg' className='text-gray-400 hover:text-white text-lg'>
                                    <Calendar className='mr-2 h-5 w-5' />
                                    Contact Us
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className='relative bg-black border-t border-gray-800'>
                <div className='max-w-6xl mx-auto px-6 py-16'>
                    <div className='grid grid-cols-1 md:grid-cols-4 gap-12'>
                        {/* Company Info */}
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

                        {/* Sections */}
                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Sections</h3>
                            <div className='space-y-2'>
                                <button
                                    onClick={() => scrollToSection('hero')}
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Home
                                </button>
                                <button
                                    onClick={() => scrollToSection('features')}
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Features
                                </button>
                                <button
                                    onClick={() => scrollToSection('examples')}
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Examples
                                </button>
                                <button
                                    onClick={() => scrollToSection('pricing')}
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Pricing
                                </button>
                                <Link
                                    href='https://docs.unlingo.com'
                                    target='_blank'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Documentation
                                </Link>
                            </div>
                        </div>

                        {/* Documentation & Social */}
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

                        {/* Legal */}
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

                {/* Sliding Unlingo Text Animation */}
                <div className='bg-black overflow-hidden'>
                    <div className='flex justify-center'>
                        <div className='text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold tracking-wider'>
                            {['U', 'n', 'l', 'i', 'n', 'g', 'o'].map((letter, index) => (
                                <motion.span
                                    key={index}
                                    initial={{ y: 100, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 0.3 }}
                                    transition={{
                                        duration: 0.8,
                                        ease: 'easeOut',
                                        delay: index * 0.15,
                                    }}
                                    viewport={{ once: true }}
                                    className='inline-block bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent select-none'>
                                    {letter}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}
