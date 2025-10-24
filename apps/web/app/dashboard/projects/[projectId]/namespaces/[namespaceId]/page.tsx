'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { useOrganization } from '@clerk/nextjs';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function NamespaceVersionsPage() {
    const { organization } = useOrganization();
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;
    const namespaceId = params?.namespaceId as Id<'namespaces'>;

    const clerkId = organization?.id;

    const workspaceQuery = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const projectQuery = useQuery(
        api.projects.getProject,
        workspaceQuery && projectId
            ? {
                  projectId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );

    const namespaceQuery = useQuery(
        api.namespaces.getNamespace,
        workspaceQuery && projectQuery && namespaceId
            ? {
                  namespaceId,
                  projectId: projectQuery._id,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );

    const {
        results: versions,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.namespaceVersions.getNamespaceVersions,
        workspaceQuery && namespaceId
            ? {
                  namespaceId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Loading states
    if (
        !workspaceQuery ||
        !projectQuery ||
        !namespaceQuery ||
        status === 'LoadingFirstPage' ||
        status === 'LoadingMore'
    ) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    const handleVersionCardClick = (versionId: Id<'namespaceVersions'>) => {
        router.push(`/dashboard/projects/${projectId}/namespaces/${namespaceId}/versions/${versionId}`);
    };

    return (
        <div className='p-6 space-y-6'>
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center space-x-4'>
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                            router.push(`/dashboard/projects/${projectId}`);
                        }}
                        className='w-10 h-10 p-0 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg'>
                        <ArrowLeft className='h-4 w-4' />
                    </Button>
                    <div className='flex items-center space-x-3'>
                        <div className='w-12 h-12 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <GitBranch className='h-6 w-6 text-pink-400' />
                        </div>
                        <div>
                            <h1 className='text-2xl font-semibold text-white'>{namespaceQuery.name}</h1>
                            <p className='text-gray-400 text-sm'>Manage versions and languages for this namespace</p>
                        </div>
                    </div>
                </div>
            </div>

            {versions && versions.length > 0 ? (
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                        {versions.map(version => (
                            <div
                                key={version._id}
                                className='group bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-gray-600/50 hover:bg-gray-900/70 backdrop-blur-sm'
                                onClick={() => handleVersionCardClick(version._id)}>
                                <div className='flex items-center space-x-3 mb-4'>
                                    <div className='w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-pink-500/30 group-hover:border-pink-500/50 transition-all'>
                                        <GitBranch className='h-6 w-6 text-pink-400' />
                                    </div>
                                    <div>
                                        <h4 className='text-lg font-semibold text-white group-hover:text-pink-400 transition-colors mb-1'>
                                            {version.version}
                                        </h4>
                                        <p className='text-xs text-gray-400 font-medium'>Version</p>
                                    </div>
                                </div>

                                <div className='space-y-3'>
                                    <div className='flex items-center justify-between text-xs'>
                                        <span className='text-gray-400'>Languages</span>
                                        <div className='flex items-center space-x-1'>
                                            <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                                            <span className='text-gray-300 font-medium'>
                                                {version.usage?.languages || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex items-center justify-between text-xs'>
                                        <span className='text-gray-400'>Created</span>
                                        <span className='text-gray-300 font-medium'>
                                            {new Date(version._creationTime).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {status === 'CanLoadMore' && (
                        <div className='flex justify-center'>
                            <Button
                                onClick={() => loadMore(20)}
                                variant='outline'
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Load More Versions
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <GitBranch className='h-8 w-8 text-pink-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No versions yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Create your first version to start managing translations for this namespace.
                    </p>
                </div>
            )}
        </div>
    );
}
