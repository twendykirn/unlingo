import { Label } from '@/components/ui/label';
import NamespaceVersionItem from './NamespaceVersionItem';
import { Button } from '@/components/ui/button';
import { Package, Plus, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NamespaceVersion } from '../types';
import { useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface Props {
    selectedVersions: NamespaceVersion[];
    setSelectedVersions: (versions: NamespaceVersion[]) => void;
    workspaceId: Id<'workspaces'>;
    namespaces: {
        _id: Id<'namespaces'>;
        _creationTime: number;
        usage?:
            | {
                  languages: number;
                  versions: number;
              }
            | undefined;
        primaryLanguageId?: Id<'languages'> | undefined;
        name: string;
        projectId: Id<'projects'>;
    }[];
    loadMoreNamespaces: (num: number) => void;
    namespacesStatus: 'CanLoadMore' | 'LoadingFirstPage' | 'LoadingMore' | 'Exhausted';
}

// Component for namespace version selection
const NamespaceVersionSelector = ({
    selectedVersions,
    setSelectedVersions,
    workspaceId,
    namespaces,
    loadMoreNamespaces,
    namespacesStatus,
}: Props) => {
    const [selectedNamespace, setSelectedNamespace] = useState<string>('');
    const [selectedVersion, setSelectedVersion] = useState<string>('');

    // Get versions for selected namespace
    const { results: namespaceVersions } = usePaginatedQuery(
        api.namespaceVersions.getNamespaceVersions,
        selectedNamespace && workspaceId
            ? {
                  namespaceId: selectedNamespace as Id<'namespaces'>,
                  workspaceId,
              }
            : 'skip',
        { initialNumItems: 50 }
    );

    const addNamespaceVersion = () => {
        if (!selectedNamespace || !selectedVersion) return;

        const namespace = namespaces?.find(ns => ns._id === selectedNamespace);
        const version = namespaceVersions?.find(v => v._id === selectedVersion);

        if (namespace && version) {
            const newSelection = {
                namespaceId: selectedNamespace as Id<'namespaces'>,
                versionId: selectedVersion as Id<'namespaceVersions'>,
                namespaceName: namespace.name,
                versionName: version.version,
            };

            // Check if already exists
            if (
                !selectedVersions.find(
                    sv => sv.namespaceId === newSelection.namespaceId && sv.versionId === newSelection.versionId
                )
            ) {
                setSelectedVersions([...selectedVersions, newSelection]);
            }

            setSelectedNamespace('');
            setSelectedVersion('');
        }
    };

    const removeNamespaceVersion = (index: number) => {
        setSelectedVersions(selectedVersions.filter((_, i) => i !== index));
    };

    const updateVersionName = (index: number, versionName: string) => {
        const updatedVersions = [...selectedVersions];
        const item = updatedVersions[index];

        if (item) {
            updatedVersions[index] = { ...item, versionName };
            setSelectedVersions(updatedVersions);
        }
    };

    return (
        <div className='space-y-4'>
            <Label>Namespace Versions</Label>
            <div className='space-y-2'>
                <div className='flex gap-2'>
                    <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                        <SelectTrigger className='bg-gray-900 border-gray-700 text-white flex-1'>
                            <SelectValue placeholder='Select namespace' />
                        </SelectTrigger>
                        <SelectContent className='bg-gray-900 border-gray-700 text-white'>
                            {namespaces?.map(namespace => (
                                <SelectItem key={namespace._id} value={namespace._id} className='hover:bg-gray-800'>
                                    <div className='flex items-center gap-2'>
                                        <Package className='h-4 w-4' />
                                        {namespace.name}
                                    </div>
                                </SelectItem>
                            ))}
                            {namespacesStatus === 'CanLoadMore' && (
                                <div className='p-2 text-center'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => loadMoreNamespaces(20)}
                                        className='text-gray-400 hover:text-white'>
                                        Load more namespaces...
                                    </Button>
                                </div>
                            )}
                        </SelectContent>
                    </Select>

                    <Select value={selectedVersion} onValueChange={setSelectedVersion} disabled={!selectedNamespace}>
                        <SelectTrigger className='bg-gray-900 border-gray-700 text-white flex-1'>
                            <SelectValue placeholder='Select version' />
                        </SelectTrigger>
                        <SelectContent className='bg-gray-900 border-gray-700 text-white'>
                            {namespaceVersions?.map(version => (
                                <SelectItem key={version._id} value={version._id} className='hover:bg-gray-800'>
                                    <div className='flex items-center gap-2'>
                                        <Tag className='h-4 w-4' />
                                        {version.version}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={addNamespaceVersion}
                        disabled={!selectedNamespace || !selectedVersion}
                        className='bg-blue-600 hover:bg-blue-700 text-white'>
                        <Plus className='h-4 w-4' />
                    </Button>
                </div>

                {/* Selected namespace versions */}
                {selectedVersions.length > 0 && (
                    <div className='space-y-2'>
                        <Label className='text-sm text-gray-400'>Selected ({selectedVersions.length})</Label>
                        <div className='space-y-1 max-h-32 overflow-y-auto'>
                            {selectedVersions.map((nv, index) => (
                                <NamespaceVersionItem
                                    key={`${nv.namespaceId}-${nv.versionId}`}
                                    namespaceVersion={nv}
                                    workspaceId={workspaceId}
                                    index={index}
                                    onRemove={removeNamespaceVersion}
                                    onVersionNameUpdate={updateVersionName}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NamespaceVersionSelector;
