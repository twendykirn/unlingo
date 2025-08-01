'use client';

import { Key, Copy, Trash2, Eye, EyeOff, Plus, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

interface ApiKeysTabProps {
    project: {
        _id: string;
        name: string;
    };
    workspace: {
        _id: string;
    };
}

export function ApiKeysTab({ project, workspace }: ApiKeysTabProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
    const [showNewKey, setShowNewKey] = useState(false);
    const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Paginated query for API keys
    const {
        results: apiKeys,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.apiKeys.getApiKeys,
        project && workspace
            ? {
                  projectId: project._id as any,
                  workspaceId: workspace._id as any,
              }
            : 'skip',
        { initialNumItems: 10 }
    );

    // Mutations
    const generateApiKey = useMutation(api.apiKeys.generateApiKey);
    const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

    const handleGenerateKey = async () => {
        if (!keyName.trim()) return;

        setIsGenerating(true);
        try {
            const result = await generateApiKey({
                projectId: project._id as any,
                workspaceId: workspace._id as any,
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

    const handleDeleteKey = async (keyId: string) => {
        setIsDeleting(true);
        try {
            await deleteApiKey({
                keyId: keyId as any,
                workspaceId: workspace._id as any,
            });
            setDeleteKeyId(null);
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
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const formatKeyDisplay = (key: { prefix: string; _creationTime: number }) => {
        return `${key.prefix}${'*'.repeat(40)}`;
    };

    if (status === 'LoadingFirstPage') {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            {/* Header with Create Button */}
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-xl font-semibold text-white'>API Keys</h3>
                    <p className='text-gray-400 mt-1'>Manage API keys for programmatic access to your translations.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                            <Plus className='h-4 w-4 mr-2' />
                            Generate API Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='sm:max-w-[425px] bg-gray-900 border-gray-700'>
                        <DialogHeader>
                            <DialogTitle className='text-white'>Generate API Key</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Create a new API key for this project. The key will only be shown once.
                            </DialogDescription>
                        </DialogHeader>
                        <div className='grid gap-4 py-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='key-name' className='text-gray-300'>
                                    Key Name
                                </Label>
                                <Input
                                    id='key-name'
                                    value={keyName}
                                    onChange={e => setKeyName(e.target.value)}
                                    placeholder='e.g., Production API, Development Key'
                                    className='w-full'
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={() => setIsCreateOpen(false)}
                                disabled={isGenerating}
                                className='cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                type='button'
                                onClick={handleGenerateKey}
                                disabled={isGenerating || !keyName.trim()}
                                className='cursor-pointer'>
                                {isGenerating ? 'Generating...' : 'Generate Key'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Newly Generated Key Modal */}
            {newlyGeneratedKey && (
                <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
                    <DialogContent className='sm:max-w-[425px] bg-gray-900 border-gray-700'>
                        <DialogHeader>
                            <DialogTitle className='text-white flex items-center gap-2'>
                                <Key className='h-5 w-5' />
                                API Key Generated
                            </DialogTitle>
                            <DialogDescription className='text-yellow-400'>
                                ⚠️ This is the only time this key will be displayed. Copy it now!
                            </DialogDescription>
                        </DialogHeader>
                        <div className='grid gap-4 py-4'>
                            <div className='space-y-2'>
                                <Label className='text-gray-300'>Your API Key</Label>
                                <div className='flex items-center gap-2'>
                                    <Input value={newlyGeneratedKey} readOnly className='font-mono text-sm flex-1' />
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => copyToClipboard(newlyGeneratedKey)}
                                        className={`cursor-pointer flex-shrink-0 ${
                                            copySuccess ? 'bg-green-600 border-green-500 text-white' : ''
                                        }`}>
                                        {copySuccess ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                                    </Button>
                                </div>
                            </div>
                            <div className='bg-yellow-900/20 border border-yellow-700 rounded-lg p-3'>
                                <p className='text-yellow-300 text-sm'>
                                    <strong>Important:</strong> Store this key securely. Once you close this dialog, you
                                    won't be able to see it again. You can only delete keys from the list below.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type='button'
                                onClick={() => {
                                    setShowNewKey(false);
                                    setNewlyGeneratedKey(null);
                                    setCopySuccess(false);
                                }}
                                className='cursor-pointer'>
                                I've Copied the Key
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* API Keys List */}
            {apiKeys && apiKeys.length > 0 ? (
                <div className='space-y-4'>
                    <div className='bg-gray-900 border border-gray-800 rounded-lg'>
                        <div className='px-6 py-4 border-b border-gray-800'>
                            <h4 className='font-medium text-white'>Existing API Keys</h4>
                        </div>
                        <div className='divide-y divide-gray-800'>
                            {apiKeys.map(key => (
                                <div key={key._id} className='px-6 py-4 flex items-center justify-between'>
                                    <div className='flex-1'>
                                        <div className='flex items-center gap-3'>
                                            <Key className='h-4 w-4 text-gray-400' />
                                            <div>
                                                <h5 className='font-medium text-white'>{key.name}</h5>
                                                <p className='text-sm text-gray-400 font-mono'>
                                                    {formatKeyDisplay(key)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className='text-xs text-gray-500 mt-1'>
                                            Created {new Date(key._creationTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => setDeleteKeyId(key._id)}
                                        className='text-red-400 border-red-400 hover:bg-red-400 hover:text-white cursor-pointer'>
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Load More Button */}
                    {status === 'CanLoadMore' && (
                        <div className='text-center'>
                            <Button variant='outline' onClick={() => loadMore(10)} className='cursor-pointer'>
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-center py-12'>
                    <Key className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                    <h3 className='text-xl font-medium text-gray-400 mb-2'>No API keys yet</h3>
                    <p className='text-gray-500 mb-6'>
                        Generate API keys to access your translations programmatically.
                    </p>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteKeyId && (
                <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
                    <DialogContent className='sm:max-w-[425px] bg-gray-900 border-gray-700'>
                        <DialogHeader>
                            <div className='flex items-center gap-3'>
                                <AlertTriangle className='h-6 w-6 text-red-400' />
                                <div>
                                    <DialogTitle className='text-white'>Delete API Key</DialogTitle>
                                    <DialogDescription className='text-gray-400'>
                                        This action cannot be undone. Applications using this key will lose access
                                        immediately.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={() => setDeleteKeyId(null)}
                                disabled={isDeleting}
                                className='cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                type='button'
                                onClick={() => handleDeleteKey(deleteKeyId)}
                                disabled={isDeleting}
                                className='bg-red-600 text-white hover:bg-red-700 cursor-pointer'>
                                {isDeleting ? 'Deleting...' : 'Delete Key'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
