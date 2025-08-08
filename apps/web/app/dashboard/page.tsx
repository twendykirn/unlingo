'use client';

import { motion } from 'framer-motion';
import { FolderOpen, Plus, ArrowRight, Clock, Settings } from 'lucide-react';
import { UserButton, OrganizationSwitcher, useUser, useOrganization } from '@clerk/nextjs';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const router = useRouter();

    // Get the current workspace identifier (organization only)
    const clerkId = organization?.id;

    // Query workspace with subscription info
    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    // Query projects with pagination using usePaginatedQuery
    const {
        results: projects,
        status,
        loadMore,
    } = usePaginatedQuery(api.projects.getProjects, workspace ? { workspaceId: workspace._id } : 'skip', {
        initialNumItems: 12,
    });

    // Ensure user has an organization for org-only mode
    useEffect(() => {
        if (user && !organization) {
            router.push('/select-org');
        }
    }, [user, organization, router]);

    // Redirect to contact email setup if required
    useEffect(() => {
        if (workspace && !workspace.contactEmail) {
            router.push('/dashboard/contact-email');
        }
    }, [workspace, router]);

    // Loading state
    if (!user || !organization || !clerkId) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    // Workspace loading state
    if (workspace === undefined) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading workspace...</p>
                </div>
            </div>
        );
    }

    // No workspace found (shouldn't happen if webhooks are set up correctly)
    if (!workspace) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-2xl font-bold mb-4'>Workspace not found</h2>
                    <p className='text-gray-400 mb-6'>
                        We couldn't find your workspace. Please try signing out and signing back in.
                    </p>
                </div>
            </div>
        );
    }

    const hasProjects = projects && projects.length > 0;
    const canCreateProject = workspace && workspace.currentUsage.projects < workspace.limits.projects;

    const handleLoadMore = () => {
        if (status === 'CanLoadMore') {
            loadMore(12);
        }
    };

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

                    {/* Right side: Settings + Org Switcher + Profile */}
                    <div className='flex items-center space-x-4'>
                        <Link href='/dashboard/settings'>
                            <Button variant='ghost' size='sm' className='text-gray-400 hover:text-white cursor-pointer'>
                                <Settings className='h-4 w-4' />
                            </Button>
                        </Link>
                        <OrganizationSwitcher
                            hidePersonal={true}
                            afterCreateOrganizationUrl='/dashboard'
                            afterLeaveOrganizationUrl='/select-org'
                            afterSelectOrganizationUrl='/dashboard'
                        />
                        <UserButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            {!hasProjects ? (
                // Empty State - No Projects
                <div className='flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]'>
                    <div className='text-center max-w-md'>
                        <div className='mb-8'>
                            <FolderOpen className='h-24 w-24 text-gray-600 mx-auto mb-6' />
                            <h2 className='text-3xl font-bold mb-4'>Welcome to Unlingo</h2>
                            <p className='text-gray-400 text-lg leading-relaxed'>
                                Create your first translation project to get started with internationalization.
                            </p>
                        </div>

                        {canCreateProject ? (
                            <Link href='/dashboard/create-project'>
                                <Button className='bg-white text-black hover:bg-gray-200 text-lg px-8 py-4 cursor-pointer'>
                                    <Plus className='h-5 w-5 mr-2' />
                                    Create Your First Project
                                </Button>
                            </Link>
                        ) : (
                            <div className='space-y-4'>
                                <Button
                                    disabled
                                    className='bg-gray-600 text-gray-400 text-lg px-8 py-4 cursor-not-allowed'>
                                    <Plus className='h-5 w-5 mr-2' />
                                    Project Limit Reached
                                </Button>
                                <div className='text-sm text-gray-500'>
                                    <p>You've reached your project limit.</p>
                                    <Link href='/dashboard/settings' className='underline hover:text-gray-400'>
                                        Upgrade your plan
                                    </Link>{' '}
                                    to create more projects.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Projects List View
                <div className='p-6'>
                    {/* Page Header */}
                    <div className='flex items-center justify-between mb-8'>
                        <div>
                            <h2 className='text-3xl font-bold'>Projects</h2>
                            <p className='text-gray-400 mt-1'>
                                {projects?.length || 0} of {workspace?.currentUsage.projects} projects
                            </p>
                        </div>

                        {canCreateProject && (
                            <Link href='/dashboard/create-project'>
                                <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                    <Plus className='h-4 w-4 mr-2' />
                                    New Project
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Projects Grid */}
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {projects?.map((project, index) => (
                            <motion.div
                                key={project._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className='bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors group cursor-pointer'>
                                <Link href={`/dashboard/projects/${project._id}`}>
                                    <div className='space-y-4'>
                                        <div>
                                            <h3 className='text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors'>
                                                {project.name}
                                            </h3>
                                            {project.description && (
                                                <p className='text-gray-400 text-sm line-clamp-2'>
                                                    {project.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className='flex items-center justify-between text-sm text-gray-400'>
                                            <div className='flex items-center space-x-1'>
                                                <Clock className='h-4 w-4' />
                                                <span>
                                                    Created {new Date(project._creationTime).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className='pt-4 border-t border-gray-800'>
                                            <div className='flex items-center justify-center space-x-2 text-blue-400 group-hover:text-blue-300 transition-colors'>
                                                <span>Open Project</span>
                                                <ArrowRight className='h-4 w-4' />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Load More Button */}
                    {status === 'CanLoadMore' && (
                        <div className='text-center mt-8'>
                            <Button variant='outline' onClick={handleLoadMore} className='px-8 cursor-pointer'>
                                Load More Projects
                            </Button>
                        </div>
                    )}

                    {status === 'LoadingMore' && (
                        <div className='text-center mt-8'>
                            <Button variant='outline' disabled className='px-8 cursor-not-allowed'>
                                Loading...
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
