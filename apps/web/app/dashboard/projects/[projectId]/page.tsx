'use client';

import { Key, GitBranch, Globe, Settings, ArrowLeft } from 'lucide-react';
import React, { use, useState } from 'react';
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

    // Check if contactEmail is required
    if (workspace && !workspace.contactEmail) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center max-w-md'>
                    <h2 className='text-2xl font-bold mb-4'>Setup Required</h2>
                    <p className='text-gray-400 mb-6'>
                        Please complete your workspace setup by providing a contact email.
                    </p>
                    <Link href='/dashboard/settings'>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>Complete Setup</Button>
                    </Link>
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
            {/* Elegant Sidebar */}
            <div className='w-72 bg-gray-950/50 border-r border-gray-800/50 flex flex-col backdrop-blur-sm'>
                {/* Project Header */}
                <div className='p-6 border-b border-gray-800/50'>
                    <div className='flex items-center space-x-4 mb-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-pink-500/30'>
                            <Globe className='h-6 w-6 text-pink-400' />
                        </div>
                        <div className='flex-1'>
                            <h1 className='text-lg font-semibold text-white truncate' title={project.name}>
                                {project.name}
                            </h1>
                            <p className='text-xs text-gray-400 font-medium'>Translation Project</p>
                        </div>
                    </div>
                    {project.description && (
                        <p className='text-sm text-gray-400 leading-relaxed line-clamp-2'>{project.description}</p>
                    )}
                </div>

                {/* Navigation */}
                <nav className='flex-1 p-4'>
                    <div className='space-y-2'>
                        {sidebarItems.map(item => (
                            <button
                                key={item.label}
                                onClick={() => setActiveTab(item.label.toLowerCase())}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left group ${
                                    activeTab === item.label.toLowerCase()
                                        ? 'bg-gray-800/50 text-white border border-gray-700/50'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800/30 border border-transparent'
                                }`}>
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                        activeTab === item.label.toLowerCase()
                                            ? 'bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30'
                                            : 'bg-gray-700/30 border border-gray-600/30 group-hover:bg-gray-600/40'
                                    }`}>
                                    <item.icon
                                        className={`h-4 w-4 ${
                                            activeTab === item.label.toLowerCase()
                                                ? 'text-pink-400'
                                                : 'text-gray-400 group-hover:text-gray-300'
                                        }`}
                                    />
                                </div>
                                <div className='flex-1'>
                                    <span
                                        className={`block font-medium text-sm ${
                                            activeTab === item.label.toLowerCase()
                                                ? 'text-white'
                                                : 'text-gray-300 group-hover:text-white'
                                        }`}>
                                        {item.label}
                                    </span>
                                    <span className='text-xs text-gray-500 block'>{item.description}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer Stats */}
                <div className='p-4 border-t border-gray-800/50'>
                    <div className='bg-gray-800/30 rounded-lg p-3'>
                        <div className='flex items-center space-x-2 mb-2'>
                            <div className='w-2 h-2 bg-emerald-400 rounded-full'></div>
                            <span className='text-xs text-emerald-400 font-medium'>Project Active</span>
                        </div>
                        <div className='text-xs text-gray-400'>
                            Created {new Date(project._creationTime).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className='flex-1 flex flex-col p-4'>
                {activeTab === 'namespaces' && <NamespacesTab project={project} workspace={workspace} />}
                {activeTab === 'releases' && <ReleasesTab />}
                {activeTab === 'api keys' && <ApiKeysTab project={project} workspace={workspace} />}
                {activeTab === 'settings' && <SettingsTab project={project} workspace={workspace} />}
            </main>
        </div>
    );
}
