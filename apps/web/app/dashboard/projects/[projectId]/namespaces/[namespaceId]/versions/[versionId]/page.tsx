'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery, useAction } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { ArrowLeft, Plus, Languages, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
    const createLanguage = useAction(api.languages.createLanguage);
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
    if (!workspaceQuery || !projectQuery || !versionQuery) {
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
            {/* Elegant Header with Combined Actions */}
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                                router.push(`/dashboard/projects/${projectId}/namespaces/${namespaceId}`);
                            }}
                            className='w-10 h-10 p-0 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg'>
                            <ArrowLeft className='h-4 w-4' />
                        </Button>
                        <div className='flex items-center space-x-3'>
                            <div className='w-12 h-12 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                                <Languages className='h-6 w-6 text-emerald-400' />
                            </div>
                            <div>
                                <div className='flex items-center space-x-3 mb-1'>
                                    <h1 className='text-2xl font-semibold text-white'>{versionQuery.version}</h1>
                                    {versionQuery?.primaryLanguageId && (
                                        <>
                                            <div className='w-1 h-1 bg-gray-600 rounded-full'></div>
                                            <div className='flex items-center space-x-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-1'>
                                                <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' />
                                                <span className='text-xs font-medium text-yellow-400'>
                                                    {(() => {
                                                        const primaryLang = languages.find(
                                                            l => l._id === versionQuery.primaryLanguageId
                                                        );
                                                        return primaryLang?.languageCode.toUpperCase() || 'Unknown';
                                                    })()}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className='text-gray-400 text-sm'>Manage languages for this version</p>
                            </div>
                        </div>
                    </div>
                    <div className='flex items-center space-x-3'>
                        <div className='flex items-center space-x-2 text-xs text-gray-400'>
                            <span>
                                {languages?.length || 0} / {workspaceQuery.limits.languagesPerVersion}
                            </span>
                            <span>languages</span>
                        </div>
                        <Dialog open={isCreateLanguageOpen} onOpenChange={setIsCreateLanguageOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className='bg-white text-black hover:bg-gray-200 transition-all'
                                    disabled={languages.length >= workspaceQuery.limits.languagesPerVersion}>
                                    <Plus className='h-4 w-4 mr-2' />
                                    Add Language
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Elegant Create Language Dialog */}
            <Dialog open={isCreateLanguageOpen} onOpenChange={setIsCreateLanguageOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    {/* Header with Icon */}
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30'>
                            <Languages className='h-6 w-6 text-emerald-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                Add New Language
                            </DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                Create a new language for {versionQuery.version} version
                            </DialogDescription>
                        </div>
                    </div>

                    <div className='space-y-6 py-6'>
                        {/* Language Code Input */}
                        <div className='space-y-3'>
                            <Label htmlFor='language-code' className='text-sm font-medium text-gray-300'>
                                Language Code
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='language-code'
                                    placeholder='e.g., en, es, fr, pt-BR'
                                    value={newLanguageCode}
                                    onChange={e => setNewLanguageCode(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all'
                                />
                                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                    <Languages className='h-4 w-4 text-gray-500' />
                                </div>
                            </div>
                            <div className='bg-gray-900/30 border border-gray-700/30 rounded-lg p-3'>
                                <p className='text-xs text-gray-400 font-medium mb-1'>📝 Format Examples:</p>
                                <div className='flex flex-wrap gap-2 mt-2'>
                                    {['en', 'es', 'fr', 'de', 'pt-BR', 'en-US', 'zh-CN'].map(code => (
                                        <button
                                            key={code}
                                            onClick={() => setNewLanguageCode(code)}
                                            className='px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 rounded text-xs text-gray-300 hover:text-white transition-all cursor-pointer'>
                                            {code}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Auto-copy Feature */}
                        {languages.length > 0 && (
                            <div className='bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4'>
                                <div className='flex items-center space-x-2 mb-2'>
                                    <div className='w-6 h-6 bg-emerald-400/20 rounded-full flex items-center justify-center'>
                                        <span className='text-emerald-400 text-sm'>✨</span>
                                    </div>
                                    <p className='text-sm font-medium text-emerald-400'>Smart Copy</p>
                                </div>
                                <p className='text-xs text-gray-400 leading-relaxed'>
                                    This language will automatically inherit the translation structure from your primary
                                    language, making it easier to start translating.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                        <div className='text-xs text-gray-500'>
                            {languages?.length || 0} / {workspaceQuery.limits.languagesPerVersion} languages
                        </div>
                        <div className='flex space-x-3'>
                            <Button
                                variant='ghost'
                                onClick={() => {
                                    setIsCreateLanguageOpen(false);
                                    setNewLanguageCode('');
                                }}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateLanguage}
                                disabled={!newLanguageCode.trim()}
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                <Plus className='h-4 w-4 mr-2' />
                                Create Language
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Languages List */}
            {languages.length > 0 ? (
                <div className='space-y-4'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                        {languages.map((language: any) => (
                            <div
                                key={language._id}
                                className='group bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 hover:border-gray-600/50 hover:bg-gray-900/70 transition-all duration-300 backdrop-blur-sm cursor-pointer'
                                onClick={() => handleEditLanguage(language)}>
                                {/* Header Section */}
                                <div className='flex items-center justify-between mb-6'>
                                    <div className='flex items-center space-x-3'>
                                        <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                                                language.fileId
                                                    ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30'
                                                    : 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-600/30'
                                            }`}>
                                            <Languages
                                                className={`h-6 w-6 ${
                                                    language.fileId ? 'text-emerald-400' : 'text-gray-400'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <div className='flex items-center space-x-2 mb-1'>
                                                <h4 className='text-lg font-semibold text-white transition-colors'>
                                                    {language.languageCode.toUpperCase()}
                                                </h4>
                                                {versionQuery.primaryLanguageId === language._id && (
                                                    <div className='w-6 h-6 bg-yellow-400/10 border border-yellow-400/30 rounded-full flex items-center justify-center'>
                                                        <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' />
                                                    </div>
                                                )}
                                            </div>
                                            <div className='flex items-center space-x-2'>
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        language.fileId ? 'bg-emerald-400' : 'bg-gray-500'
                                                    }`}></div>
                                                <p className='text-xs text-gray-400 font-medium'>
                                                    {language.fileId ? (
                                                        <span className='text-emerald-400'>
                                                            {Math.round((language.fileSize || 0) / 1024)} KB
                                                        </span>
                                                    ) : (
                                                        <span className='text-gray-500'>Empty</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className='flex items-center justify-between pt-4 border-t border-gray-800/50'>
                                    {/* Left side - Status and Primary indicator */}
                                    <div className='flex items-center space-x-2'>
                                        {versionQuery.primaryLanguageId === language._id ? (
                                            <div className='flex items-center space-x-1 text-yellow-400'>
                                                <Star className='h-3 w-3 fill-yellow-400' />
                                                <span className='text-xs font-medium'>Primary</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleSetPrimaryLanguage(language._id);
                                                }}
                                                className='flex items-center space-x-1 text-gray-400 hover:text-yellow-400 transition-colors text-xs cursor-pointer'>
                                                <Star className='h-3 w-3' />
                                                <span className='font-medium'>Set Primary</span>
                                            </button>
                                        )}
                                    </div>

                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleDeleteLanguage(language._id);
                                        }}
                                        disabled={versionQuery.primaryLanguageId === language._id}
                                        className={`p-2 ${
                                            versionQuery.primaryLanguageId === language._id
                                                ? 'text-gray-500 cursor-not-allowed hover:bg-transparent'
                                                : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all'
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
                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <Languages className='h-8 w-8 text-emerald-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No languages yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Create your first language to start managing translations for this version.
                    </p>
                </div>
            )}
        </div>
    );
}
