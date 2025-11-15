'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Mail } from 'lucide-react';

const teamMembers = [
    {
        fullName: 'Igor Kirnosov',
        role: 'Founder & Developer',
        imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    },
];

export default function TeamPage() {
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
                            <Link
                                href='/resources/team'
                                className='text-gray-300 hover:text-white transition-colors cursor-pointer'>
                                Team
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
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-start'>
                            {/* Left side - Text content */}
                            <div className='space-y-6'>
                                <h1 className='text-4xl font-bold'>Meet the Team</h1>
                                <div className='space-y-4 text-gray-300'>
                                    <p>
                                        Unlingo was created to solve a real problem in software development: making
                                        localization accessible, fast, and straightforward for developers of all sizes.
                                    </p>
                                    <p>
                                        We believe that localization should be open source, fast, and accessible to
                                        everyone. No complex workflows, no enterprise-only features locked behind
                                        paywalls, and no arbitrary limitations. Just a powerful, developer-friendly
                                        platform that helps you reach a global audience.
                                    </p>
                                    <p>
                                        Our mission is to democratize software localization by providing tools that are
                                        both powerful and simple to use. Whether you're a solo developer or part of a
                                        large team, Unlingo is designed to scale with your needs without breaking the
                                        bank.
                                    </p>
                                </div>
                                <div className='pt-4'>
                                    <Link href='mailto:support@unlingo.com'>
                                        <Button className='w-full sm:w-auto'>
                                            <Mail className='mr-2 h-4 w-4' />
                                            Contact Us
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Right side - Team members */}
                            <div className='space-y-6'>
                                <h2 className='text-2xl font-semibold'>Our Team</h2>
                                <div className='space-y-4'>
                                    {teamMembers.map(member => (
                                        <Card key={member.fullName}>
                                            <CardContent className='p-6'>
                                                <div className='flex items-center space-x-4'>
                                                    <div className='w-20 h-20 rounded-full overflow-hidden bg-gray-800 flex-shrink-0'>
                                                        <img
                                                            src={member.imageUrl}
                                                            alt={member.fullName}
                                                            className='w-full h-full object-cover'
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className='text-xl font-semibold'>{member.fullName}</h3>
                                                        <p className='text-gray-400'>{member.role}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
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
                                <Link
                                    href='/resources/team'
                                    className='block text-gray-400 hover:text-white transition-colors text-sm cursor-pointer'>
                                    Team
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
