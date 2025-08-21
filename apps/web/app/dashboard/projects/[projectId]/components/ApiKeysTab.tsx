'use client';

import { useState } from 'react';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { Key, Copy, Trash2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface ApiKeysTabProps {
    project: {
        _id: Id<'projects'>;
        name: string;
    };
    workspace: {
        _id: Id<'workspaces'>;
    };
}

export function ApiKeysTab({ project, workspace }: ApiKeysTabProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
    const [showNewKey, setShowNewKey] = useState(false);
    const [deleteKeyId, setDeleteKeyId] = useState<Id<'apiKeys'> | null>(null);
    const [deleteKeyName, setDeleteKeyName] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const {
        results: apiKeys,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.apiKeys.getApiKeys,
        project && workspace
            ? {
                  projectId: project._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 10 }
    );

    const generateApiKey = useMutation(api.apiKeys.generateApiKey);
    const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

    const handleGenerateKey = async () => {
        if (!keyName.trim()) return;

        setIsGenerating(true);
        try {
            const result = await generateApiKey({
                projectId: project._id,
                workspaceId: workspace._id,
                name: keyName.trim(),
            });

            setNewlyGeneratedKey(result.key);
            setShowNewKey(true);
            setKeyName('');
            setIsCreateOpen(false);
        } catch (error) {
            console.error('Failed to generate API key:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteKey = async () => {
        if (!deleteKeyId) return;

        setIsDeleting(true);
        try {
            await deleteApiKey({
                keyId: deleteKeyId,
                workspaceId: workspace._id,
            });
            setDeleteKeyId(null);
            setDeleteKeyName('');
        } catch (error) {
            console.error('Failed to delete API key:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 600);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const formatKeyDisplay = (key: string) => {
        if (!key) return '';
        const parts = key.split('_');
        if (parts.length < 2) return 'Invalid Key';
        const prefix = parts[0];
        return `${prefix}_${'*'.repeat(20)}`;
    };

    if (status === 'LoadingFirstPage' || status === 'LoadingMore') {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
            </div>
        );
    }

    if (!apiKeys || apiKeys.length === 0) {
        return (
            <div className='space-y-6'>
                <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                                <Key className='h-6 w-6 text-purple-400' />
                            </div>
                            <div>
                                <h3 className='text-2xl font-semibold text-white'>API Keys</h3>
                                <p className='text-gray-400 text-sm'>Manage programmatic access to your project</p>
                            </div>
                        </div>
                        <div className='flex items-center space-x-3'>
                            <Button
                                className='bg-white text-black hover:bg-gray-200 transition-all'
                                onClick={() => setIsCreateOpen(true)}>
                                <Plus className='h-4 w-4 mr-2' />
                                Generate Key
                            </Button>
                        </div>
                    </div>
                </div>

                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <Key className='h-8 w-8 text-purple-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No API keys yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Generate your first API key to access translations for {project.name}.
                    </p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                        <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                            <div className='w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-purple-500/30'>
                                <Key className='h-6 w-6 text-purple-400' />
                            </div>
                            <div>
                                <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                    Generate New API Key
                                </DialogTitle>
                                <DialogDescription className='text-gray-400 text-sm'>
                                    Create a key for {project.name}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className='space-y-6 py-6'>
                            <div className='space-y-3'>
                                <Label htmlFor='key-name' className='text-sm font-medium text-gray-300'>
                                    Key Name
                                </Label>
                                <div className='relative'>
                                    <Input
                                        id='key-name'
                                        placeholder='e.g., Production, Staging, My App'
                                        value={keyName}
                                        onChange={e => setKeyName(e.target.value)}
                                        className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all'
                                    />
                                    <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                        <Key className='h-4 w-4 text-gray-500' />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                            <div className='flex space-x-3'>
                                <Button
                                    variant='ghost'
                                    onClick={() => setIsCreateOpen(false)}
                                    className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleGenerateKey}
                                    disabled={!keyName.trim() || isGenerating}
                                    className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                    {isGenerating ? 'Generating...' : 'Generate Key'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <Key className='h-6 w-6 text-purple-400' />
                        </div>
                        <div>
                            <h3 className='text-2xl font-semibold text-white'>API Keys</h3>
                            <p className='text-gray-400 text-sm'>Manage programmatic access to your project</p>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <Button
                            className='bg-white text-black hover:bg-gray-200 transition-all'
                            onClick={() => setIsCreateOpen(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            Generate Key
                        </Button>
                    </div>
                </div>
            </div>

            <div className='space-y-4'>
                <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='divide-y divide-gray-800/50'>
                        {apiKeys.map(key => (
                            <div key={key._id} className='px-6 py-4 flex items-center justify-between'>
                                <div className='flex-1'>
                                    <div className='flex items-center gap-3'>
                                        <div className='w-10 h-10 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center border border-purple-500/30'>
                                            <Key className='h-5 w-5 text-purple-400' />
                                        </div>
                                        <div>
                                            <h5 className='font-medium text-white'>{key.name}</h5>
                                            <p className='text-sm text-gray-400 font-mono'>
                                                {formatKeyDisplay(key.prefix)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className='flex items-center gap-4'>
                                    <p className='text-xs text-gray-500'>
                                        Created {new Date(key._creationTime).toLocaleDateString()}
                                    </p>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => {
                                            setDeleteKeyId(key._id);
                                            setDeleteKeyName(key.name);
                                        }}
                                        className='text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all p-2'>
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {status === 'CanLoadMore' && (
                    <div className='text-center'>
                        <Button
                            variant='outline'
                            onClick={() => loadMore(10)}
                            className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                            Load More
                        </Button>
                    </div>
                )}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-purple-500/30'>
                            <Key className='h-6 w-6 text-purple-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                Generate New API Key
                            </DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                Create a key for {project.name}
                            </DialogDescription>
                        </div>
                    </div>
                    <div className='space-y-6 py-6'>
                        <div className='space-y-3'>
                            <Label htmlFor='key-name' className='text-sm font-medium text-gray-300'>
                                Key Name
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='key-name'
                                    placeholder='e.g., Production, Staging, My App'
                                    value={keyName}
                                    onChange={e => setKeyName(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all'
                                />
                                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                    <Key className='h-4 w-4 text-gray-500' />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                        <div className='flex space-x-3'>
                            <Button
                                variant='ghost'
                                onClick={() => setIsCreateOpen(false)}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGenerateKey}
                                disabled={!keyName.trim() || isGenerating}
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                {isGenerating ? 'Generating...' : 'Generate Key'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {newlyGeneratedKey && (
                <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
                    <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                        <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                            <div className='w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center border border-green-500/30'>
                                <Check className='h-6 w-6 text-green-400' />
                            </div>
                            <div>
                                <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                    API Key Generated
                                </DialogTitle>
                                <DialogDescription className='text-gray-400 text-sm'>
                                    Copy this key now. You won&apos;t see it again.
                                </DialogDescription>
                            </div>
                        </div>
                        <div className='py-6 space-y-4'>
                            <div className='bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4'>
                                <div className='flex items-center space-x-2 mb-2'>
                                    <div className='w-5 h-5 flex items-center justify-center'>
                                        <span className='text-yellow-400 text-xs'>⚠️</span>
                                    </div>
                                    <p className='text-sm font-medium text-yellow-400'>Store this key securely</p>
                                </div>
                                <p className='text-xs text-gray-400 leading-relaxed'>
                                    For security reasons, this key will not be shown again.
                                </p>
                            </div>
                            <div className='relative'>
                                <Input
                                    value={newlyGeneratedKey}
                                    readOnly
                                    className='bg-black/30 border-gray-700/50 text-white h-12 px-4 font-mono text-sm pr-12'
                                />
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => copyToClipboard(newlyGeneratedKey)}
                                    className='absolute right-2 top-1/2 -translate-y-1/2 p-2 h-auto'>
                                    {copySuccess ? (
                                        <Check className='h-4 w-4 text-green-400' />
                                    ) : (
                                        <Copy className='h-4 w-4 text-gray-400' />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className='flex items-center justify-end pt-6 border-t border-gray-800/50'>
                            <Button
                                onClick={() => {
                                    setShowNewKey(false);
                                    setNewlyGeneratedKey(null);
                                    setCopySuccess(false);
                                }}
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                Done
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30'>
                            <Trash2 className='h-6 w-6 text-red-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>Delete API Key</DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                This action cannot be undone.
                            </DialogDescription>
                        </div>
                    </div>
                    <div className='py-6 space-y-4'>
                        <p className='text-sm text-gray-300'>
                            Are you sure you want to delete the API key{' '}
                            <span className='font-semibold text-white'>{deleteKeyName}</span>?
                        </p>
                        <div className='bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4'>
                            <div className='flex items-center space-x-2 mb-2'>
                                <div className='w-5 h-5 flex items-center justify-center'>
                                    <span className='text-red-400 text-xs'>⚠️</span>
                                </div>
                                <p className='text-sm font-medium text-red-400'>Permanent Deletion</p>
                            </div>
                            <p className='text-xs text-gray-400 leading-relaxed'>
                                Any applications or services using this key will no longer be able to access the API.
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                        <Button
                            variant='ghost'
                            onClick={() => setDeleteKeyId(null)}
                            disabled={isDeleting}
                            className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteKey}
                            disabled={isDeleting}
                            className='bg-red-600 text-white hover:bg-red-700 transition-all px-6'>
                            {isDeleting ? 'Deleting...' : 'Delete Key'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
