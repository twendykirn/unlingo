'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { ArrowLeft, Plus, Languages, Star, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';

export default function VersionLanguagesPage() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;
    const namespaceId = params?.namespaceId as Id<'namespaces'>;
    const versionId = params?.versionId as Id<'namespaceVersions'>;

    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;

    // Local state
    const [isCreateLanguageOpen, setIsCreateLanguageOpen] = useState(false);
    const [newLanguageCode, setNewLanguageCode] = useState('');

    // Mutations
    const createLanguage = useMutation(api.languages.createLanguage);
    const deleteLanguage = useMutation(api.languages.deleteLanguage);
    const setPrimaryLanguage = useMutation(api.namespaces.setPrimaryLanguage);

    // Queries
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

    const versionQuery = useQuery(
        api.namespaceVersions.getNamespaceVersion,
        workspaceQuery && versionId
            ? {
                  namespaceVersionId: versionId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );

    // Paginated query for languages
    const {
        results: languages,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.languages.getLanguages,
        workspaceQuery && versionId
            ? {
                  namespaceVersionId: versionId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Loading states
    if (!workspaceQuery || !projectQuery || !namespaceQuery || !versionQuery) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    // Handlers
    const handleCreateLanguage = async () => {
        if (!newLanguageCode.trim() || !versionId || !workspaceQuery) return;

        try {
            await createLanguage({
                namespaceVersionId: versionId,
                workspaceId: workspaceQuery._id,
                languageCode: newLanguageCode.trim(),
            });

            setNewLanguageCode('');
            setIsCreateLanguageOpen(false);
        } catch (error) {
            console.error('Failed to create language:', error);
        }
    };

    const handleSetPrimaryLanguage = async (languageId: Id<'languages'>) => {
        if (!namespaceId || !workspaceQuery) return;

        try {
            await setPrimaryLanguage({
                namespaceId,
                workspaceId: workspaceQuery._id,
                languageId,
            });
        } catch (error) {
            console.error('Failed to set primary language:', error);
        }
    };

    const handleDeleteLanguage = async (languageId: Id<'languages'>) => {
        if (!workspaceQuery) return;

        try {
            await deleteLanguage({
                languageId,
                workspaceId: workspaceQuery._id,
            });
        } catch (error) {
            console.error('Failed to delete language:', error);
        }
    };

    const handleEditLanguage = (language: any) => {
        // Navigate to editor page
        router.push(`/dashboard/editor?languageId=${language._id}`);
    };

    return (
        <div className='p-6 space-y-6'>
            {/* Header */}
            <div className='flex items-center space-x-4'>
                <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => router.back()}
                    className='text-gray-400 hover:text-white'>
                    <ArrowLeft className='h-4 w-4 mr-2' />
                    Back
                </Button>
                <div>
                    <h1 className='text-2xl font-bold text-white'>
                        {namespaceQuery.name} - {versionQuery.version}
                    </h1>
                    <p className='text-gray-400'>Manage languages for this version</p>
                    {namespaceQuery?.primaryLanguageId && (
                        <div className='text-sm text-gray-400 mt-1'>
                            {(() => {
                                const primaryLang = languages.find(l => l._id === namespaceQuery.primaryLanguageId);
                                return (
                                    <p className='flex items-center gap-1'>
                                        <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' />
                                        Primary: {primaryLang?.languageCode.toUpperCase() || 'Unknown'}
                                    </p>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Language Button */}
            <div className='flex justify-end'>
                <Dialog open={isCreateLanguageOpen} onOpenChange={setIsCreateLanguageOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className='bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                            disabled={languages.length >= workspaceQuery.limits.languagesPerNamespace}>
                            <Plus className='h-4 w-4 mr-2' />
                            Add Language
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white max-w-md'>
                        <DialogHeader>
                            <DialogTitle>Add Language</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Create a new language for this namespace version. You can edit translations later in the
                                JSON editor.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='language-code'>Language Code</Label>
                                <Input
                                    id='language-code'
                                    placeholder='e.g., en, es, fr, pt-BR'
                                    value={newLanguageCode}
                                    onChange={e => setNewLanguageCode(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white'
                                />
                                <p className='text-xs text-gray-500 mt-1'>
                                    Use ISO language codes like "en", "es", "fr", or "en-US", "pt-BR"
                                </p>
                            </div>

                            {languages.length > 0 && (
                                <div className='p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
                                    <p className='text-sm text-blue-400 mb-1'>✨ Automatic Copy</p>
                                    <p className='text-xs text-gray-400'>
                                        This language will automatically copy the structure from your primary language
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => {
                                    setIsCreateLanguageOpen(false);
                                    setNewLanguageCode('');
                                }}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateLanguage}
                                disabled={!newLanguageCode.trim()}
                                className='bg-green-500 text-white hover:bg-green-600'>
                                Create Language
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Languages List */}
            {languages.length > 0 ? (
                <div className='space-y-4'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                        {languages.map((language: any) => (
                            <div
                                key={language._id}
                                className='bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-600 transition-colors'>
                                <div className='flex items-center justify-between mb-4'>
                                    <div className='flex items-center space-x-3'>
                                        <div className='w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center'>
                                            <Languages
                                                className={`h-5 w-5 ${language.fileId ? 'text-white' : 'text-gray-300'}`}
                                            />
                                        </div>
                                        <div>
                                            <h4 className='font-semibold text-white flex items-center gap-2'>
                                                {language.languageCode.toUpperCase()}
                                                {/* Show star for primary language */}
                                                {namespaceQuery?.primaryLanguageId === language._id && (
                                                    <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' />
                                                )}
                                            </h4>
                                            <p className='text-xs text-gray-400'>
                                                Status:{' '}
                                                {language.fileId ? (
                                                    <span className='text-green-400'>
                                                        {Math.round((language.fileSize || 0) / 1024)} KB
                                                    </span>
                                                ) : (
                                                    <span className='text-yellow-400'>Empty</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className='flex gap-2 mt-4'>
                                    {/* Set as primary button - only show if not already primary */}
                                    {namespaceQuery?.primaryLanguageId !== language._id && (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            onClick={() => handleSetPrimaryLanguage(language._id)}
                                            className='flex-1 border-gray-700 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400'>
                                            <Star className='h-3 w-3 mr-1' />
                                            Set Primary
                                        </Button>
                                    )}
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => handleEditLanguage(language)}
                                        className='flex-1 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'>
                                        <Edit2 className='h-3 w-3 mr-1' />
                                        Edit
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => handleDeleteLanguage(language._id)}
                                        disabled={namespaceQuery?.primaryLanguageId === language._id}
                                        className={`${
                                            namespaceQuery?.primaryLanguageId === language._id
                                                ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                                                : 'border-red-700 text-red-400 hover:bg-red-900/20 hover:border-red-600'
                                        }`}>
                                        <Trash2 className='h-3 w-3' />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More Button */}
                    {status === 'CanLoadMore' && (
                        <div className='flex justify-center mt-6'>
                            <Button
                                onClick={() => loadMore(20)}
                                variant='outline'
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Load More Languages
                            </Button>
                        </div>
                    )}
                    {status === 'LoadingMore' && (
                        <div className='flex justify-center mt-6'>
                            <Button disabled variant='outline' className='border-gray-700 text-gray-300'>
                                Loading...
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-center py-12 border border-gray-800 rounded-lg'>
                    <Languages className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                    <h3 className='text-xl font-medium text-gray-400 mb-2'>No languages yet</h3>
                    <p className='text-gray-500 mb-6'>Create your first language to start managing translations.</p>
                </div>
            )}
        </div>
    );
}
