'use client';

import { Key, GitBranch, Globe, Settings, ArrowLeft, Image } from 'lucide-react';
import { useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NamespacesTab } from './components/NamespacesTab';
import { ReleasesTab } from './components/ReleasesTab';
import { ApiKeysTab } from './components/ApiKeysTab';
import { SettingsTab } from './components/SettingsTab';
import { ScreenshotsTab } from './components/ScreenshotsTab';
import { useParams } from 'next/navigation';

const sidebarItems = [
    {
        icon: Globe,
        label: 'Namespaces',
        href: '/namespaces',
        description: 'Manage translation namespaces',
        colors: {
            gradient: 'from-cyan-500/20 to-blue-500/20',
            border: 'border-cyan-500/30',
            icon: 'text-cyan-400',
        },
    },
    {
        icon: GitBranch,
        label: 'Releases',
        href: '/releases',
        description: 'Create and manage releases',
        colors: {
            gradient: 'from-green-500/20 to-emerald-500/20',
            border: 'border-green-500/30',
            icon: 'text-green-400',
        },
    },
    {
        icon: Image,
        label: 'Screenshots',
        href: '/screenshots',
        description: 'Visual translation mapping with screenshots',
        colors: {
            gradient: 'from-pink-500/20 to-rose-500/20',
            border: 'border-pink-500/30',
            icon: 'text-pink-400',
        },
    },
    {
        icon: Key,
        label: 'API Keys',
        href: '/api-keys',
        description: 'Generate API keys for this project',
        colors: {
            gradient: 'from-purple-500/20 to-indigo-500/20',
            border: 'border-purple-500/30',
            icon: 'text-purple-400',
        },
    },
    {
        icon: Settings,
        label: 'Settings',
        href: '/settings',
        description: 'Project settings and configuration',
        colors: {
            gradient: 'from-orange-500/20 to-amber-500/20',
            border: 'border-orange-500/30',
            icon: 'text-orange-400',
        },
    },
];

export default function ProjectPage() {
    const params = useParams();
    const { organization } = useOrganization();
    const [activeTab, setActiveTab] = useState('namespaces');

    const projectId = params?.projectId as Id<'projects'>;

    const clerkId = organization?.id;

    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const project = useQuery(
        api.projects.getProject,
        workspace && projectId
            ? {
                  projectId,
                  workspaceId: workspace._id,
              }
            : 'skip'
    );

    if (!clerkId) {
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
                        The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                    </p>
                    <Link href='/dashboard'>
                        <Button variant='outline'>
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
            <div className='w-72 bg-gray-950/50 border-r border-gray-800/50 flex flex-col backdrop-blur-sm'>
                <div className='p-6 border-b border-gray-800/50'>
                    <div className='flex items-center space-x-4 mb-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30'>
                            <Globe className='h-6 w-6 text-cyan-400' />
                        </div>
                        <div className='flex-1'>
                            <h1 className='text-lg font-semibold text-white truncate' title={project.name}>
                                {project.name}
                            </h1>
                            <p className='text-xs text-gray-400 font-medium'>Translation Project</p>
                        </div>
                    </div>
                    {project.description ? (
                        <p className='text-sm text-gray-400 leading-relaxed line-clamp-2'>{project.description}</p>
                    ) : null}
                </div>

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
                                            ? `bg-gradient-to-br ${item.colors.gradient} border ${item.colors.border}`
                                            : 'bg-gray-700/30 border border-gray-600/30 group-hover:bg-gray-600/40'
                                    }`}>
                                    <item.icon
                                        className={`h-4 w-4 ${
                                            activeTab === item.label.toLowerCase()
                                                ? item.colors.icon
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
            </div>

            <main className='flex-1 flex flex-col p-4'>
                {activeTab === 'namespaces' && <NamespacesTab project={project} workspace={workspace} />}
                {activeTab === 'releases' && <ReleasesTab project={project} workspace={workspace} />}
                {activeTab === 'screenshots' && <ScreenshotsTab project={project} workspace={workspace} />}
                {activeTab === 'api keys' && <ApiKeysTab project={project} workspace={workspace} />}
                {activeTab === 'settings' && <SettingsTab project={project} workspace={workspace} />}
            </main>
        </div>
    );
}
