'use client';

import { motion } from 'framer-motion';
import {
    ArrowRight,
    Globe2,
    Zap,
    Code2,
    Database,
    Palette,
    Check,
    ChevronDown,
    GitBranch,
    Calendar,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Gradient } from '@/components/ui/gradient';

const features = [
    {
        icon: Globe2,
        title: 'Global Low Latency',
        description: 'Lightning-fast translation delivery from edge locations worldwide',
    },
    {
        icon: Code2,
        title: 'i18next Compatible',
        description: 'Seamless integration with your existing i18next setup',
    },
    {
        icon: Zap,
        title: 'Developer-Friendly API',
        description: 'Simple, intuitive API that developers love to work with',
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
    { requests: '250k', price: 25 },
    { requests: '500k', price: 50 },
    { requests: '1M', price: 75 },
    { requests: '2M', price: 100 },
    { requests: '10M', price: 250 },
    { requests: '50M', price: 500 },
    { requests: '100M', price: 1000 },
];

export default function Page() {
    const [selectedPricing, setSelectedPricing] = useState(pricingOptions[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeCodeTab, setActiveCodeTab] = useState<'i18next' | 'rest'>('i18next');
    const router = useRouter();

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <main className='min-h-screen bg-black text-white overflow-hidden'>
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
                                onClick={() => scrollToSection('pricing')}
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Pricing
                            </button>
                            <button className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Documentation
                            </button>
                        </div>

                        {/* Auth Buttons */}
                        <div className='flex items-center space-x-4'>
                            <Button
                                variant='ghost'
                                className='text-gray-300 hover:text-white cursor-pointer'
                                onClick={() => router.push('/sign-in')}>
                                Sign in
                            </Button>
                            <Button
                                size='sm'
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'
                                onClick={() => router.push('/sign-up')}>
                                Get Started
                            </Button>
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
                <div className='max-w-6xl mx-auto text-center space-y-8'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className='space-y-6'>
                        <div className='inline-flex items-center space-x-2 bg-gray-900/50 border border-gray-800 rounded-full px-4 py-2 text-sm'>
                            <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
                            <span className='text-gray-300'>Translations made simple</span>
                        </div>

                        <h1 className='text-6xl md:text-8xl font-bold tracking-tight'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Unlingo
                            </span>
                        </h1>

                        <p className='text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed'>
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
                            className='bg-white text-black hover:bg-gray-200 font-semibold px-8 py-4 text-lg group cursor-pointer'
                            onClick={() => router.push('/sign-up')}>
                            Get Started Free
                            <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
                        </Button>
                        <Button
                            variant='outline'
                            size='lg'
                            className='border-gray-800 hover:bg-gray-900 px-8 py-4 text-lg cursor-pointer'>
                            View Documentation
                        </Button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className='pt-12'>
                        <div className='bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-2xl mx-auto'>
                            <div className='flex items-center justify-between mb-4'>
                                <div className='flex space-x-2'>
                                    <div className='w-3 h-3 bg-red-500 rounded-full' />
                                    <div className='w-3 h-3 bg-yellow-500 rounded-full' />
                                    <div className='w-3 h-3 bg-green-500 rounded-full' />
                                </div>
                                <div className='flex space-x-2'>
                                    <button
                                        onClick={() => setActiveCodeTab('i18next')}
                                        className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                                            activeCodeTab === 'i18next'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                        }`}>
                                        i18next
                                    </button>
                                    <button
                                        onClick={() => setActiveCodeTab('rest')}
                                        className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                                            activeCodeTab === 'rest'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                        }`}>
                                        REST API
                                    </button>
                                </div>
                            </div>
                            <pre className='text-left text-sm text-gray-300 font-mono'>
                                <code>
                                    {activeCodeTab === 'i18next'
                                        ? `import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import UnlingoBackend from '@unlingo/i18next';

i18next
  .use(UnlingoBackend) 
  .use(initReactI18next)
  .init({
    backend: {
      apiKey: '...',
      version: '1.5.0', 
    }
  });

export default i18next;`
                                        : `// Fetch translations from Unlingo API
const response = await fetch(
  'https://api.unlingo.com/v1/translations', {
  headers: {
    'Authorization': 'Bearer your-api-key',
    'X-Unlingo-Version': '1.5.0'
  }
});

const translations = await response.json();

// Use translations in your app
console.log(translations.en.welcome);`}
                                </code>
                            </pre>
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
                                className='group'>
                                <div className='bg-gray-900/50 border border-gray-800 rounded-lg p-8 h-full hover:border-gray-700 transition-colors'>
                                    <div className='flex items-center space-x-4 mb-4'>
                                        <div className='p-3 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors'>
                                            <feature.icon className='h-6 w-6 text-white' />
                                        </div>
                                        <h3 className='text-xl font-semibold'>{feature.title}</h3>
                                    </div>
                                    <p className='text-gray-400 leading-relaxed'>{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
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
                                    <span>5 languages per namespace</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>1 version per namespace</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>100k requests/month</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>Community support</span>
                                </li>
                            </ul>
                            <Button
                                variant='outline'
                                className='w-full border-gray-700 hover:bg-gray-800 cursor-pointer'
                                onClick={() => router.push('/sign-up')}>
                                Get Started Free
                            </Button>
                        </motion.div>

                        {/* Pro Tier */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            viewport={{ once: true }}
                            className='bg-gray-900/50 border-2 border-blue-500 rounded-lg p-8 relative'>
                            <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                                <span className='bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold'>
                                    Most Popular
                                </span>
                            </div>
                            <h3 className='text-2xl font-bold mb-2'>Pro</h3>
                            <div className='mb-6'>
                                <span className='text-4xl font-bold'>${selectedPricing?.price}</span>
                                <span className='text-gray-400'>/month</span>
                            </div>

                            {/* Dropdown for request amounts */}
                            <div className='mb-6'>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Monthly requests</label>
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
                                    <span>30 projects</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>40 namespaces per project</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>35 languages per namespace</span>
                                </li>
                                <li className='flex items-center'>
                                    <Check className='h-5 w-5 text-green-400 mr-3' />
                                    <span>20 versions per namespace</span>
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
                                className='w-full bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                                onClick={() => router.push('/sign-up')}>
                                Upgrade to Pro
                            </Button>
                        </motion.div>

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
                            <Button
                                variant='outline'
                                className='w-full border-gray-700 hover:bg-gray-800 cursor-pointer'>
                                Contact Us
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className='relative py-32 px-6'>
                <div className='max-w-4xl mx-auto text-center'>
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
                            <Button
                                size='lg'
                                className='bg-white text-black hover:bg-gray-200 font-semibold px-8 py-4 text-lg group cursor-pointer'
                                onClick={() => router.push('/sign-up')}>
                                Start Now
                                <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
                            </Button>
                            <Button
                                variant='ghost'
                                size='lg'
                                className='text-gray-400 hover:text-white px-8 py-4 text-lg cursor-pointer'>
                                <Calendar className='mr-2 h-5 w-5' />
                                Contact Us
                            </Button>
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
                            <p className='text-gray-500 text-xs'>© 2024 Unlingo Inc.</p>
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
                                    onClick={() => scrollToSection('pricing')}
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Pricing
                                </button>
                            </div>
                        </div>

                        {/* Documentation & Social */}
                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Resources</h3>
                            <div className='space-y-2'>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Documentation
                                </button>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    API Reference
                                </button>
                            </div>

                            <h3 className='text-white font-semibold pt-4'>Community</h3>
                            <div className='space-y-2'>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    X
                                </button>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Discord
                                </button>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Contact Us
                                </button>
                            </div>
                        </div>

                        {/* Legal */}
                        <div className='space-y-4'>
                            <h3 className='text-white font-semibold'>Legal</h3>
                            <div className='space-y-2'>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Terms of Service
                                </button>
                                <button className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Privacy Policy
                                </button>
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
