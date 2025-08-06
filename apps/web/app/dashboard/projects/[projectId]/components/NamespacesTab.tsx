'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import {
    Globe,
    Plus,
    MoreVertical,
    Copy,
    Trash2,
    Tag,
    Languages,
    Upload,
    Download,
    Star,
    Edit2,
    GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

interface NamespacesTabProps {
    project?: {
        _id: Id<'projects'>;
        name: string;
        description?: string;
        workspaceId: Id<'workspaces'>;
    };
    workspace?: {
        _id: Id<'workspaces'>;
        limits: {
            namespacesPerProject: number;
            versionsPerNamespace: number;
            languagesPerNamespace: number;
        };
    };
}

export function NamespacesTab({ project, workspace }: NamespacesTabProps) {
    const { user } = useUser();
    const { organization } = useOrganization();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;
    
    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;
    
    // Local state
    const [isCreateNamespaceOpen, setIsCreateNamespaceOpen] = useState(false);
    const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
    const [isCreateLanguageOpen, setIsCreateLanguageOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [newNamespaceName, setNewNamespaceName] = useState('');
    const [newVersionNumber, setNewVersionNumber] = useState('');
    const [copyFromVersion, setCopyFromVersion] = useState('');
    const [newLanguageCode, setNewLanguageCode] = useState('');
    // Removed newLanguageFile state as we no longer upload files initially
    // Removed primaryLanguage state - now managed automatically
    
    // Mutations
    const createNamespace = useMutation(api.namespaces.createNamespace);
    const createVersion = useMutation(api.namespaceVersions.createNamespaceVersion);
    const createLanguage = useMutation(api.languages.createLanguage);
    const setPrimaryLanguage = useMutation(api.namespaces.setPrimaryLanguage);
    
    // Queries - using provided props or fallback to queries
    const workspaceQuery = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId && !workspace ? { clerkId } : 'skip'
    );
    
    const projectQuery = useQuery(
        api.projects.getProject,
        workspaceQuery && projectId && !project
            ? {
                  projectId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );
    
    const currentWorkspace = workspace || workspaceQuery;
    const currentProject = project || projectQuery;
    
    // Queries for namespaces, versions, and languages
    const namespaces = useQuery(
        api.namespaces.getNamespaces,
        currentWorkspace && currentProject
            ? {
                  projectId: currentProject._id,
                  workspaceId: currentWorkspace._id,
                  paginationOpts: { numItems: 50, cursor: null },
              }
            : 'skip'
    );
    
    const versions = useQuery(
        api.namespaceVersions.getNamespaceVersions,
        selectedNamespace && currentWorkspace
            ? {
                  namespaceId: selectedNamespace as Id<'namespaces'>,
                  workspaceId: currentWorkspace._id,
                  paginationOpts: { numItems: 50, cursor: null },
              }
            : 'skip'
    );
    
    const languages = useQuery(
        api.languages.getLanguages,
        selectedVersion && currentWorkspace
            ? {
                  namespaceVersionId: selectedVersion as Id<'namespaceVersions'>,
                  workspaceId: currentWorkspace._id,
                  paginationOpts: { numItems: 50, cursor: null },
              }
            : 'skip'
    );
    
    // Loading states
    if (!currentWorkspace || !currentProject) {
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
    const handleCreateNamespace = async () => {
        if (!newNamespaceName.trim() || !currentProject || !currentWorkspace) return;
        
        try {
            await createNamespace({
                projectId: currentProject._id,
                workspaceId: currentWorkspace._id,
                name: newNamespaceName.trim(),
            });
            setNewNamespaceName('');
            setIsCreateNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to create namespace:', error);
        }
    };
    
    const handleCreateVersion = async () => {
        if (!newVersionNumber.trim() || !selectedNamespace || !currentWorkspace) return;
        
        try {
            await createVersion({
                namespaceId: selectedNamespace as Id<'namespaces'>,
                workspaceId: currentWorkspace._id,
                version: newVersionNumber.trim(),
                copyFromVersionId: copyFromVersion ? (copyFromVersion as Id<'namespaceVersions'>) : undefined,
            });
            setNewVersionNumber('');
            setCopyFromVersion('');
            setIsCreateVersionOpen(false);
        } catch (error) {
            console.error('Failed to create version:', error);
        }
    };
    
    // File upload functionality removed - languages are created empty initially
    
    const handleCreateLanguage = async () => {
        if (!newLanguageCode.trim() || !selectedVersion || !currentWorkspace) return;
        
        try {
            await createLanguage({
                namespaceVersionId: selectedVersion as Id<'namespaceVersions'>,
                workspaceId: currentWorkspace._id,
                languageCode: newLanguageCode.trim(),
                // copyFromLanguage removed - now handled automatically by primary language logic
            });
            
            setNewLanguageCode('');
            setIsCreateLanguageOpen(false);
        } catch (error) {
            console.error('Failed to create language:', error);
        }
    };

    const handleSetPrimaryLanguage = async (languageId: Id<'languages'>) => {
        if (!selectedNamespace || !currentWorkspace) return;
        
        try {
            await setPrimaryLanguage({
                namespaceId: selectedNamespace as Id<'namespaces'>,
                workspaceId: currentWorkspace._id,
                languageId,
            });
        } catch (error) {
            console.error('Failed to set primary language:', error);
        }
    };
    
    // If no namespaces exist, show the empty state
    if (!namespaces?.page || namespaces.page.length === 0) {
        return (
            <div className='text-center py-12'>
                <Globe className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                <h3 className='text-xl font-medium text-gray-400 mb-2'>No namespaces yet</h3>
                <p className='text-gray-500 mb-6'>
                    Create your first namespace to organize your translations.
                </p>
                
                <Dialog open={isCreateNamespaceOpen} onOpenChange={setIsCreateNamespaceOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Namespace
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                        <DialogHeader>
                            <DialogTitle>Create New Namespace</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Namespaces help organize your translations by feature or section.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='namespace-name'>Namespace Name</Label>
                                <Input
                                    id='namespace-name'
                                    placeholder='e.g., common, auth, dashboard'
                                    value={newNamespaceName}
                                    onChange={(e) => setNewNamespaceName(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white'
                                />
                            </div>
                        </div>
                        
                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setIsCreateNamespaceOpen(false)}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateNamespace}
                                disabled={!newNamespaceName.trim()}
                                className='bg-white text-black hover:bg-gray-200'>
                                Create Namespace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }
    
    return (
        <div className='space-y-6'>
            {/* Header with Create Namespace Button */}
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-lg font-semibold text-white'>
                        Namespaces ({namespaces?.page?.length || 0})
                    </h3>
                    <p className='text-sm text-gray-400'>
                        Limit: {namespaces?.page?.length || 0}/{currentWorkspace.limits.namespacesPerProject}
                    </p>
                </div>
                
                <Dialog open={isCreateNamespaceOpen} onOpenChange={setIsCreateNamespaceOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className='bg-white text-black hover:bg-gray-200 cursor-pointer'
                            disabled={(namespaces?.page?.length || 0) >= currentWorkspace.limits.namespacesPerProject}>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Namespace
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                        <DialogHeader>
                            <DialogTitle>Create New Namespace</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Namespaces help organize your translations by feature or section.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='namespace-name'>Namespace Name</Label>
                                <Input
                                    id='namespace-name'
                                    placeholder='e.g., common, auth, dashboard'
                                    value={newNamespaceName}
                                    onChange={(e) => setNewNamespaceName(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white'
                                />
                            </div>
                        </div>
                        
                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setIsCreateNamespaceOpen(false)}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateNamespace}
                                disabled={!newNamespaceName.trim()}
                                className='bg-white text-black hover:bg-gray-200'>
                                Create Namespace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            {/* Namespaces Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {namespaces?.page?.map((namespace: any) => (
                    <div
                        key={namespace._id}
                        className={`bg-gray-900 border border-gray-800 rounded-lg p-6 cursor-pointer transition-all hover:border-gray-700 ${
                            selectedNamespace === namespace._id ? 'border-blue-500 bg-gray-850' : ''
                        }`}
                        onClick={() => {
                            setSelectedNamespace(namespace._id);
                            setSelectedVersion(null);
                        }}>
                        <div className='flex items-center justify-between mb-4'>
                            <div className='flex items-center space-x-3'>
                                <div className='w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center'>
                                    <Globe className='h-5 w-5 text-white' />
                                </div>
                                <h4 className='font-semibold text-white'>{namespace.name}</h4>
                            </div>
                            <button className='text-gray-400 hover:text-white'>
                                <MoreVertical className='h-4 w-4' />
                            </button>
                        </div>
                        
                        <div className='space-y-2 text-sm text-gray-400'>
                            <div className='flex items-center justify-between'>
                                <span>Versions:</span>
                                <span>{namespace.usage?.versions || 0}</span>
                            </div>
                            <div className='flex items-center justify-between'>
                                <span>Languages:</span>
                                <span>{namespace.usage?.languages || 0}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Selected Namespace Details */}
            {selectedNamespace && (
                <div className='mt-8 bg-gray-900 border border-gray-800 rounded-lg p-6'>
                    <div className='flex items-center justify-between mb-6'>
                        <h3 className='text-lg font-semibold text-white'>Versions</h3>
                        
                        <Dialog open={isCreateVersionOpen} onOpenChange={setIsCreateVersionOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    size='sm'
                                    className='bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                                    disabled={(versions?.page?.length || 0) >= currentWorkspace.limits.versionsPerNamespace}>
                                    <Plus className='h-4 w-4 mr-2' />
                                    Create Version
                                </Button>
                            </DialogTrigger>
                            <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                                <DialogHeader>
                                    <DialogTitle>Create New Version</DialogTitle>
                                    <DialogDescription className='text-gray-400'>
                                        Create a new version for this namespace. Use semantic versioning (e.g., 1.0.0).
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className='space-y-4'>
                                    <div>
                                        <Label htmlFor='version-number'>Version Number</Label>
                                        <Input
                                            id='version-number'
                                            placeholder='e.g., 1.0.0, 1.2.3-beta'
                                            value={newVersionNumber}
                                            onChange={(e) => setNewVersionNumber(e.target.value)}
                                            className='bg-gray-900 border-gray-700 text-white'
                                        />
                                    </div>
                                    
                                    {versions?.page && versions.page.length > 0 && (
                                        <div>
                                            <Label htmlFor='copy-from'>Copy from existing version (optional)</Label>
                                            <Select value={copyFromVersion} onValueChange={setCopyFromVersion}>
                                                <SelectTrigger className='bg-gray-900 border-gray-700 text-white'>
                                                    <SelectValue placeholder='Select version to copy from' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {versions.page.map((version: any) => (
                                                        <SelectItem key={version._id} value={version._id}>
                                                            {version.version}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                                
                                <DialogFooter>
                                    <Button
                                        variant='outline'
                                        onClick={() => {
                                            setIsCreateVersionOpen(false);
                                            setNewVersionNumber('');
                                            setCopyFromVersion('');
                                        }}
                                        className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateVersion}
                                        disabled={!newVersionNumber.trim()}
                                        className='bg-blue-500 text-white hover:bg-blue-600'>
                                        Create Version
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    
                    {/* Versions List */}
                    {versions?.page && versions.page.length > 0 ? (
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
                            {versions.page.map((version: any) => (
                                <div
                                    key={version._id}
                                    className={`bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer transition-all hover:border-gray-600 ${
                                        selectedVersion === version._id ? 'border-blue-500 bg-gray-750' : ''
                                    }`}
                                    onClick={() => setSelectedVersion(version._id)}>
                                    <div className='flex items-center justify-between mb-2'>
                                        <div className='flex items-center space-x-2'>
                                            <GitBranch className='h-4 w-4 text-blue-400' />
                                            <span className='font-medium text-white'>{version.version}</span>
                                        </div>
                                        <button className='text-gray-400 hover:text-white'>
                                            <MoreVertical className='h-3 w-3' />
                                        </button>
                                    </div>
                                    
                                    <div className='text-xs text-gray-400'>
                                        <div className='flex items-center justify-between'>
                                            <span>Languages:</span>
                                            <span>{languages?.page?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='text-center py-8 border border-gray-800 rounded-lg mb-6'>
                            <Tag className='h-8 w-8 text-gray-600 mx-auto mb-2' />
                            <p className='text-gray-400 text-sm'>No versions created yet</p>
                        </div>
                    )}
                    
                    {/* Selected Version Languages */}
                    {selectedVersion && (
                        <div className='border-t border-gray-800 pt-6'>
                            <div className='flex items-center justify-between mb-6'>
                                <div>
                                    <h4 className='text-base font-semibold text-white'>Languages</h4>
                                    <div className='text-sm text-gray-400'>
                                        <p className='mb-1'>
                                            Version: {versions?.page?.find((v: any) => v._id === selectedVersion)?.version}
                                        </p>
                                        {/* Show primary language info */}
                                        {(() => {
                                            const currentNamespace = namespaces?.page?.find(ns => ns._id === selectedNamespace);
                                            if (currentNamespace?.primaryLanguageId && languages?.page) {
                                                const primaryLang = languages.page.find((l: any) => l._id === currentNamespace.primaryLanguageId);
                                                return (
                                                    <p className='text-xs flex items-center gap-1'>
                                                        <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' />
                                                        Primary: {primaryLang?.languageCode.toUpperCase() || 'Unknown'}
                                                    </p>
                                                );
                                            }
                                            return languages?.page?.length === 0 && (
                                                <p className='text-xs text-gray-500'>
                                                    First language will be set as primary
                                                </p>
                                            );
                                        })()}
                                    </div>
                                </div>
                                
                                <Dialog open={isCreateLanguageOpen} onOpenChange={setIsCreateLanguageOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            size='sm'
                                            className='bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                                            disabled={(languages?.page?.length || 0) >= currentWorkspace.limits.languagesPerNamespace}>
                                            <Plus className='h-4 w-4 mr-2' />
                                            Add Language
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className='bg-gray-950 border-gray-800 text-white max-w-md'>
                                        <DialogHeader>
                                            <DialogTitle>Add Language</DialogTitle>
                                            <DialogDescription className='text-gray-400'>
                                                Create a new language for this namespace version. You can edit translations later in the JSON editor.
                                            </DialogDescription>
                                        </DialogHeader>
                                        
                                        <div className='space-y-4'>
                                            <div>
                                                <Label htmlFor='language-code'>Language Code</Label>
                                                <Input
                                                    id='language-code'
                                                    placeholder='e.g., en, es, fr, pt-BR'
                                                    value={newLanguageCode}
                                                    onChange={(e) => setNewLanguageCode(e.target.value)}
                                                    className='bg-gray-900 border-gray-700 text-white'
                                                />
                                                <p className='text-xs text-gray-500 mt-1'>
                                                    Use ISO language codes like "en", "es", "fr", or "en-US", "pt-BR"
                                                </p>
                                            </div>
                                            
                                            {languages?.page && languages.page.length > 0 && (
                                                <div className='p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
                                                    <p className='text-sm text-blue-400 mb-1'>
                                                        ✨ Automatic Copy
                                                    </p>
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
                            {languages?.page && languages.page.length > 0 ? (
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                                    {languages.page.map((language: any) => (
                                        <div
                                            key={language._id}
                                            className='bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors'>
                                            <div className='flex items-center justify-between mb-3'>
                                                <div className='flex items-center space-x-2'>
                                                    <Languages className={`h-4 w-4 ${language.fileId ? 'text-green-400' : 'text-gray-400'}`} />
                                                    <span className='font-medium text-white'>
                                                        {language.languageCode.toUpperCase()}
                                                    </span>
                                                    {/* Show star for primary language */}
                                                    {namespaces?.page?.find(ns => ns._id === selectedNamespace)?.primaryLanguageId === language._id && (
                                                        <Star className='h-3 w-3 text-yellow-400 fill-yellow-400' title='Primary Language' />
                                                    )}
                                                </div>
                                                <div className='flex space-x-1'>
                                                    {/* Set as primary button - only show if not already primary */}
                                                    {namespaces?.page?.find(ns => ns._id === selectedNamespace)?.primaryLanguageId !== language._id && (
                                                        <button 
                                                            className='text-gray-400 hover:text-yellow-400'
                                                            onClick={() => handleSetPrimaryLanguage(language._id)}
                                                            title='Set as primary language'>
                                                            <Star className='h-3 w-3' />
                                                        </button>
                                                    )}
                                                    <button className='text-gray-400 hover:text-white' title='Download'>
                                                        <Download className='h-3 w-3' />
                                                    </button>
                                                    <button className='text-gray-400 hover:text-white' title='Edit'>
                                                        <Edit2 className='h-3 w-3' />
                                                    </button>
                                                    <button className='text-gray-400 hover:text-red-400' title='Delete'>
                                                        <Trash2 className='h-3 w-3' />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className='text-xs text-gray-400'>
                                                <div className='flex items-center justify-between'>
                                                    <span>Status:</span>
                                                    <span className={language.fileId ? 'text-green-400' : 'text-yellow-400'}>
                                                        {language.fileId ? 
                                                            `${Math.round((language.fileSize || 0) / 1024)} KB` : 
                                                            'Empty'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className='text-center py-8 border border-gray-800 rounded-lg'>
                                    <Languages className='h-8 w-8 text-gray-600 mx-auto mb-2' />
                                    <p className='text-gray-400 text-sm'>No languages added yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}