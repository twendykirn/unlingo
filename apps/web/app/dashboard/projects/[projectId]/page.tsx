'use client';

import { Key, GitBranch, Globe, Settings, ArrowLeft } from 'lucide-react';
import { use, useState } from 'react';
import { UserButton, useUser, useOrganization } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NamespacesTab } from './components/NamespacesTab';
import { ReleasesTab } from './components/ReleasesTab';
import { ApiKeysTab } from './components/ApiKeysTab';
import { SettingsTab } from './components/SettingsTab';

const sidebarItems = [
    {
        icon: Globe,
        label: 'Namespaces',
        href: '/namespaces',
        description: 'Manage translation namespaces',
    },
    {
        icon: GitBranch,
        label: 'Releases',
        href: '/releases',
        description: 'Create and manage releases',
    },
    {
        icon: Key,
        label: 'API Keys',
        href: '/api-keys',
        description: 'Generate API keys for this project',
    },
    {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
        description: 'Project settings and configuration',
    },
];

interface ProjectPageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
    const { user } = useUser();
    const { organization } = useOrganization();
    const [activeTab, setActiveTab] = useState('namespaces');

    // Unwrap params Promise for Next.js 15
    const { projectId } = use(params);

    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;

    // Query workspace
    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    // Query project
    const project = useQuery(
        api.projects.getProject,
        workspace && projectId
            ? {
                  projectId: projectId as Id<'projects'>,
                  workspaceId: workspace._id,
              }
            : 'skip'
    );

    // Loading states
    if (!user || !clerkId) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

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

    if (project === undefined) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading project...</p>
                </div>
            </div>
        );
    }

    if (!workspace || !project) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-2xl font-bold mb-4'>Project not found</h2>
                    <p className='text-gray-400 mb-6'>
                        The project you're looking for doesn't exist or you don't have access to it.
                    </p>
                    <Link href='/dashboard'>
                        <Button variant='outline' className='cursor-pointer'>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-black text-white flex'>
            {/* Sidebar */}
            <div className='w-64 bg-gray-950 border-r border-gray-800 flex flex-col'>
                {/* Header */}
                <div className='p-6 border-b border-gray-800'>
                    <Link
                        href='/dashboard'
                        className='flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4'>
                        <ArrowLeft className='h-4 w-4' />
                        <span className='text-sm'>Back to Projects</span>
                    </Link>

                    <h1 className='text-xl font-bold truncate' title={project.name}>
                        {project.name}
                    </h1>
                    {project.description && (
                        <p className='text-sm text-gray-400 mt-1 line-clamp-2'>{project.description}</p>
                    )}
                </div>

                {/* Navigation */}
                <nav className='flex-1 p-4'>
                    <ul className='space-y-2'>
                        {sidebarItems.map(item => (
                            <li key={item.label}>
                                <button
                                    onClick={() => setActiveTab(item.label.toLowerCase())}
                                    className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-left ${
                                        activeTab === item.label.toLowerCase()
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-900'
                                    }`}>
                                    <item.icon className='h-5 w-5 mt-0.5 flex-shrink-0' />
                                    <div>
                                        <span className='block font-medium'>{item.label}</span>
                                        <span className='text-xs text-gray-500 block'>{item.description}</span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* Main Content */}
            <div className='flex-1 flex flex-col'>
                {/* Header */}
                <header className='bg-gray-950 border-b border-gray-800 px-8 py-6'>
                    <div>
                        <h2 className='text-3xl font-bold capitalize'>{activeTab}</h2>
                        <p className='text-gray-400 mt-1'>
                            {sidebarItems.find(item => item.label.toLowerCase() === activeTab)?.description}
                        </p>
                    </div>
                </header>

                {/* Content */}
                <main className='flex-1 p-8'>
                    {activeTab === 'namespaces' && <NamespacesTab project={project} workspace={workspace} />}
                    {activeTab === 'releases' && <ReleasesTab />}
                    {activeTab === 'api keys' && <ApiKeysTab project={project} workspace={workspace} />}
                    {activeTab === 'settings' && <SettingsTab project={project} workspace={workspace} />}
                </main>
            </div>
        </div>
    );
}
