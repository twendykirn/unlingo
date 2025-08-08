'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { UserButton, OrganizationSwitcher, useUser, useOrganization } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CreateProjectPage() {
    const router = useRouter();
    const { user } = useUser();
    const { organization } = useOrganization();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;

    // Query workspace with subscription info
    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    // Create project mutation
    const createProject = useMutation(api.projects.createProject);

    const canCreateProject = workspace && workspace.currentUsage.projects < workspace.limits.projects;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!workspace) {
            setError('Workspace not found.');
            return;
        }

        if (!workspace.contactEmail) {
            router.push('/dashboard/settings');
            return;
        }

        if (!name.trim()) {
            setError('Project name is required');
            return;
        }

        // Prevent double submission
        if (isCreating) {
            return;
        }

        // Check limits at the time of submission, not reactively
        if (workspace.currentUsage.projects >= workspace.limits.projects) {
            setError('Cannot create project. Please check your subscription limits.');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            const projectId = await createProject({
                workspaceId: workspace._id,
                name: name.trim(),
                description: description.trim() || undefined,
            });

            // Redirect to the new project
            router.push(`/dashboard/projects/${projectId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
            setIsCreating(false);
        }
    };

    if (!workspace) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4' />
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    // Check if contactEmail is required
    if (!workspace.contactEmail) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center max-w-md'>
                    <h2 className='text-2xl font-bold mb-4'>Setup Required</h2>
                    <p className='text-gray-400 mb-6'>
                        Please complete your workspace setup by providing a contact email before creating projects.
                    </p>
                    <Link href='/dashboard/settings'>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>Complete Setup</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-black text-white'>
            {/* Header */}
            <header className='border-b border-gray-800 px-6 py-4'>
                <div className='flex items-center justify-between'>
                    {/* Logo */}
                    <h1 className='text-2xl font-bold'>
                        <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                            Unlingo
                        </span>
                    </h1>

                    {/* Right side: Org Switcher + Profile */}
                    <div className='flex items-center space-x-4'>
                        {workspace?.isPremium && <OrganizationSwitcher />}
                        <UserButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className='flex items-center justify-center min-h-[calc(100vh-80px)] p-6'>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className='w-full max-w-md'>
                    {/* Back Link */}
                    <Link
                        href='/dashboard'
                        className='flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-8'>
                        <ArrowLeft className='h-4 w-4' />
                        <span>Back to Dashboard</span>
                    </Link>

                    {/* Form */}
                    <div className='bg-gray-900 border border-gray-800 rounded-lg p-8'>
                        <div className='text-center mb-8'>
                            <div className='w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4'>
                                <Plus className='h-6 w-6 text-white' />
                            </div>
                            <h2 className='text-2xl font-bold mb-2'>Create New Project</h2>
                            <p className='text-gray-400'>Set up a new translation project to organize your content.</p>
                        </div>

                        {/* Limits Info */}
                        <div className='bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6'>
                            <div className='flex items-center justify-between text-sm'>
                                <span className='text-gray-400'>Projects</span>
                                <span className={`font-medium ${canCreateProject ? 'text-green-400' : 'text-red-400'}`}>
                                    {workspace.currentUsage.projects} / {workspace.limits.projects}
                                </span>
                            </div>
                            {!isCreating && !canCreateProject && (
                                <div className='text-red-400 text-sm mt-2'>
                                    <p>You've reached your project limit.</p>
                                    <Link href='/dashboard/settings' className='underline hover:text-red-300'>
                                        Upgrade your plan
                                    </Link>{' '}
                                    to create more projects.
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className='space-y-6'>
                            {error && (
                                <div className='bg-red-900/20 border border-red-500/20 rounded-lg p-4'>
                                    <p className='text-red-400 text-sm'>{error}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor='name' className='block text-sm font-medium text-gray-400 mb-2'>
                                    Project Name *
                                </label>
                                <input
                                    id='name'
                                    type='text'
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                    placeholder='e.g., My Website, Mobile App, Admin Panel'
                                    maxLength={100}
                                    required
                                />
                                <p className='text-xs text-gray-500 mt-1'>{name.length}/100 characters</p>
                            </div>

                            <div>
                                <label htmlFor='description' className='block text-sm font-medium text-gray-400 mb-2'>
                                    Description (Optional)
                                </label>
                                <textarea
                                    id='description'
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                                    placeholder='Brief description of what this project is for...'
                                    rows={3}
                                    maxLength={500}
                                />
                                <p className='text-xs text-gray-500 mt-1'>{description.length}/500 characters</p>
                            </div>

                            <div className='flex space-x-3 pt-4'>
                                <Link href='/dashboard' className='flex-1'>
                                    <Button variant='outline' className='w-full cursor-pointer' disabled={isCreating}>
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    type='submit'
                                    className='flex-1 bg-white text-black hover:bg-gray-200 cursor-pointer'
                                    disabled={isCreating || !name.trim()}>
                                    {isCreating ? (
                                        <>
                                            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className='h-4 w-4 mr-2' />
                                            Create Project
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
