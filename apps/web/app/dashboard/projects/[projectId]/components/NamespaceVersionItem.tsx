import { useQuery } from 'convex/react';
import { NamespaceVersion } from '../types';
import { api } from '@/convex/_generated/api';
import { useEffect } from 'react';
import { Package, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';

interface Props {
    namespaceVersion: NamespaceVersion;
    workspaceId: Id<'workspaces'>;
    index: number;
    onRemove: (index: number) => void;
    onVersionNameUpdate: (index: number, versionName: string) => void;
}

const NamespaceVersionItem = ({ namespaceVersion, workspaceId, index, onRemove, onVersionNameUpdate }: Props) => {
    const version = useQuery(
        api.namespaceVersions.getNamespaceVersion,
        namespaceVersion.versionName === 'Loading...' && workspaceId
            ? {
                  namespaceVersionId: namespaceVersion.versionId,
                  workspaceId,
              }
            : 'skip'
    );

    useEffect(() => {
        if (version && namespaceVersion.versionName === 'Loading...') {
            onVersionNameUpdate(index, version.version);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version, namespaceVersion.versionName, index]);

    return (
        <div className='flex items-center justify-between bg-gray-900/50 border border-gray-800/50 rounded-lg p-3'>
            <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                    <Package className='h-4 w-4 text-cyan-400' />
                    <span className='text-sm font-medium text-white'>{namespaceVersion.namespaceName}</span>
                </div>
                <div className='w-px h-4 bg-gray-700'></div>
                <div className='flex items-center gap-2'>
                    <Tag className='h-4 w-4 text-lime-400' />
                    <span className='text-sm text-gray-300'>{namespaceVersion.versionName}</span>
                </div>
            </div>
            <Button
                variant='ghost'
                size='icon'
                onClick={() => onRemove(index)}
                className='text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8'>
                <Trash2 className='h-4 w-4' />
            </Button>
        </div>
    );
};

export default NamespaceVersionItem;
