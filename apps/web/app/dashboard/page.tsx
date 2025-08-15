'use client';

import { motion } from 'motion/react';
import { FolderOpen, Plus, ArrowRight, Clock, Settings, House, User, ChartLine, Building2, X, Loader2 } from 'lucide-react';
import { useUser, useOrganization, useClerk } from '@clerk/nextjs';
import { useQuery, usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dock from '@/components/ui/dock';

export default function Dashboard() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const { openOrganizationProfile, openUserProfile } = useClerk();
    const router = useRouter();

    // Create Project Dialog State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const items = [
        { icon: <House size={18} />, label: 'Dashboard', onClick: () => router.push('/dashboard') },
        { icon: <ChartLine size={18} />, label: 'Analytics', onClick: () => router.push('/dashboard/analytics') },
        { icon: <Settings size={18} />, label: 'Settings', onClick: () => router.push('/dashboard/settings') },
        { icon: <Building2 size={18} />, label: 'Organization', onClick: () => openOrganizationProfile() },
        { icon: <User size={18} />, label: 'Profile', onClick: () => openUserProfile() },
    ];

    // Get the current workspace identifier (organization only)
    const clerkId = organization?.id;

    // Query workspace with subscription info
    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    // Create project mutation
    const createProject = useMutation(api.projects.createProject);

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

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!workspace) {
            setCreateError('Workspace not found.');
            return;
        }

        if (!workspace.contactEmail) {
            router.push('/dashboard/settings');
            return;
        }

        if (!projectName.trim()) {
            setCreateError('Project name is required');
            return;
        }

        // Check limits at the time of submission
        if (workspace.currentUsage.projects >= workspace.limits.projects) {
            setCreateError('Cannot create project. Please check your subscription limits.');
            return;
        }

        setIsCreating(true);
        setCreateError('');

        try {
            const projectId = await createProject({
                workspaceId: workspace._id,
                name: projectName.trim(),
                description: projectDescription.trim() || undefined,
            });

            // Reset form and close dialog
            setProjectName('');
            setProjectDescription('');
            setIsCreateDialogOpen(false);

            // Redirect to the new project
            router.push(`/dashboard/projects/${projectId}`);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setIsCreating(false);
        }
    };

    const resetCreateForm = () => {
        setProjectName('');
        setProjectDescription('');
        setCreateError('');
        setIsCreating(false);
    };

    return (
        <div className='min-h-screen bg-black text-white'>
            {/* Sticky Header */}
            <header className='fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-gray-800/50 px-6 py-4 backdrop-blur-md'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        {/* Logo */}
                        <h1 className='text-2xl font-bold'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Unlingo
                            </span>
                        </h1>
                        
                        {/* Workspace Name */}
                        {organization && (
                            <>
                                <div className='h-6 w-px bg-gray-600/50' />
                                <div className='flex items-center space-x-3'>
                                    <div className='w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30'>
                                        <Building2 className='h-4 w-4 text-cyan-400' />
                                    </div>
                                    <div>
                                        <h2 className='text-sm font-semibold text-white'>{organization.name}</h2>
                                        <p className='text-xs text-gray-500'>Workspace</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Projects Info */}
                    {hasProjects && (
                        <div className='flex items-center space-x-3'>
                            <div className='text-right'>
                                <p className='text-sm font-medium text-white'>{projects?.length || 0} Projects</p>
                                <p className='text-xs text-gray-400'>
                                    {workspace?.currentUsage.projects} of {workspace?.limits.projects} used
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            {!hasProjects ? (
                // Empty State - No Projects
                <div className='flex-1 flex items-center justify-center min-h-[calc(100vh-80px)] pt-20'>
                    <div className='text-center max-w-md'>
                        <div className='mb-8'>
                            <FolderOpen className='h-24 w-24 text-gray-600 mx-auto mb-6' />
                            <h2 className='text-3xl font-bold mb-4'>Welcome to Unlingo</h2>
                            <p className='text-gray-400 text-lg leading-relaxed'>
                                Create your first translation project to get started with internationalization.
                            </p>
                        </div>

                        {canCreateProject ? (
                            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                                setIsCreateDialogOpen(open);
                                if (!open) resetCreateForm();
                            }}>
                                <DialogTrigger asChild>
                                    <Button className='bg-white text-black hover:bg-gray-200 text-lg px-8 py-4 cursor-pointer'>
                                        <Plus className='h-5 w-5 mr-2' />
                                        Create Your First Project
                                    </Button>
                                </DialogTrigger>
                            </Dialog>
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
                <div className='p-6 pt-24'>
                    {/* Create Project Button */}
                    {canCreateProject && (
                        <div className='flex justify-end mb-8'>
                            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                                setIsCreateDialogOpen(open);
                                if (!open) resetCreateForm();
                            }}>
                                <DialogTrigger asChild>
                                    <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                        <Plus className='h-4 w-4 mr-2' />
                                        New Project
                                    </Button>
                                </DialogTrigger>
                            </Dialog>
                        </div>
                    )}

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

            {/* Create Project Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) resetCreateForm();
            }}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <DialogHeader className='pb-6 border-b border-gray-800/50'>
                        <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center border border-green-500/30'>
                                <Plus className='h-6 w-6 text-green-400' />
                            </div>
                            <div>
                                <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                    Create New Project
                                </DialogTitle>
                                <p className='text-gray-400 text-sm'>
                                    Set up a new translation project to organize your content.
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Limits Info */}
                    {workspace && (
                        <div className='bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-6'>
                            <div className='flex items-center justify-between text-sm'>
                                <span className='text-gray-400'>Projects</span>
                                <span className={`font-medium ${canCreateProject ? 'text-green-400' : 'text-red-400'}`}>
                                    {workspace.currentUsage.projects} / {workspace.limits.projects}
                                </span>
                            </div>
                            {!canCreateProject && (
                                <div className='text-red-400 text-sm mt-2'>
                                    <p>You've reached your project limit.</p>
                                    <Link href='/dashboard/settings' className='underline hover:text-red-300'>
                                        Upgrade your plan
                                    </Link>{' '}
                                    to create more projects.
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleCreateProject} className='space-y-6'>
                        {createError && (
                            <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-4'>
                                <p className='text-red-400 text-sm'>{createError}</p>
                            </div>
                        )}

                        <div className='space-y-2'>
                            <Label htmlFor='projectName' className='text-sm font-medium text-gray-300'>
                                Project Name *
                            </Label>
                            <Input
                                id='projectName'
                                type='text'
                                value={projectName}
                                onChange={e => setProjectName(e.target.value)}
                                className='bg-black/30 border-gray-700/50 text-white h-11 px-4 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'
                                placeholder='e.g., My Website, Mobile App, Admin Panel'
                                maxLength={100}
                                required
                                disabled={isCreating}
                                autoFocus
                            />
                            <p className='text-xs text-gray-500'>{projectName.length}/100 characters</p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='projectDescription' className='text-sm font-medium text-gray-300'>
                                Description (Optional)
                            </Label>
                            <Textarea
                                id='projectDescription'
                                value={projectDescription}
                                onChange={e => setProjectDescription(e.target.value)}
                                rows={4}
                                className='bg-black/30 border-gray-700/50 text-white p-4 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all resize-none'
                                placeholder='Brief description of what this project is for...'
                                maxLength={500}
                                disabled={isCreating}
                            />
                            <p className='text-xs text-gray-500'>{projectDescription.length}/500 characters</p>
                        </div>

                        <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                            <Button
                                type='button'
                                variant='ghost'
                                onClick={() => setIsCreateDialogOpen(false)}
                                disabled={isCreating}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50 cursor-pointer transition-all'>
                                Cancel
                            </Button>
                            <Button
                                type='submit'
                                disabled={isCreating || !projectName.trim() || !canCreateProject}
                                className='bg-green-600 text-white hover:bg-green-700 cursor-pointer transition-all px-6'>
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
                </DialogContent>
            </Dialog>

            <Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
        </div>
    );
}
