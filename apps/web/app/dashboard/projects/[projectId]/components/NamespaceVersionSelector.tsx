import { Label } from '@/components/ui/label';
import NamespaceVersionItem from './NamespaceVersionItem';
import { Button } from '@/components/ui/button';
import { Package, Plus, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NamespaceVersion } from '../types';
import { useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';

interface Props {
    selectedVersions: NamespaceVersion[];
    setSelectedVersions: (versions: NamespaceVersion[]) => void;
    workspaceId: Id<'workspaces'>;
    namespaces: Doc<'namespaces'>[];
    loadMoreNamespaces: (num: number) => void;
    namespacesStatus: 'CanLoadMore' | 'LoadingFirstPage' | 'LoadingMore' | 'Exhausted';
}

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
            <Label className='text-sm font-medium text-gray-300'>Namespace Versions</Label>
            <div className='space-y-3'>
                <div className='flex gap-3'>
                    <Select
                        value={selectedNamespace}
                        onValueChange={v => {
                            setSelectedNamespace(v);
                            setSelectedVersion('');
                        }}>
                        <SelectTrigger className='bg-black/30 border-gray-700/50 text-white h-11'>
                            <SelectValue placeholder='Select namespace' />
                        </SelectTrigger>
                        <SelectContent className='bg-gray-950/95 border-gray-800/50 text-white backdrop-blur-md'>
                            {namespaces?.map(namespace => (
                                <SelectItem key={namespace._id} value={namespace._id}>
                                    <div className='flex items-center gap-2'>
                                        <Package className='h-4 w-4 text-cyan-400' />
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
                                        className='text-gray-400 hover:text-white w-full'>
                                        Load more...
                                    </Button>
                                </div>
                            )}
                        </SelectContent>
                    </Select>

                    <Select value={selectedVersion} onValueChange={setSelectedVersion} disabled={!selectedNamespace}>
                        <SelectTrigger className='bg-black/30 border-gray-700/50 text-white h-11'>
                            <SelectValue placeholder='Select version' />
                        </SelectTrigger>
                        <SelectContent className='bg-gray-950/95 border-gray-800/50 text-white backdrop-blur-md'>
                            {namespaceVersions?.map(version => (
                                <SelectItem key={version._id} value={version._id}>
                                    <div className='flex items-center gap-2'>
                                        <Tag className='h-4 w-4 text-lime-400' />
                                        {version.version}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={addNamespaceVersion}
                        disabled={!selectedNamespace || !selectedVersion}
                        className='bg-white text-black hover:bg-gray-200'>
                        <Plus className='h-4 w-4' />
                    </Button>
                </div>

                {selectedVersions.length > 0 && (
                    <div className='space-y-3 pt-2'>
                        <Label className='text-xs font-medium text-gray-400'>
                            Selected ({selectedVersions.length})
                        </Label>
                        <div className='space-y-2 max-h-48 overflow-y-auto pr-2'>
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
