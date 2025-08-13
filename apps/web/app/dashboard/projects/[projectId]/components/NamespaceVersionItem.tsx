import { useQuery } from 'convex/react';
import { NamespaceVersion } from '../types';
import { api } from '@/convex/_generated/api';
import { useEffect } from 'react';
import { Package, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';

// Component to handle individual namespace version loading
const NamespaceVersionItem = ({
    namespaceVersion,
    workspaceId,
    index,
    onRemove,
    onVersionNameUpdate,
}: {
    namespaceVersion: NamespaceVersion;
    workspaceId: Id<'workspaces'>;
    index: number;
    onRemove: (index: number) => void;
    onVersionNameUpdate: (index: number, versionName: string) => void;
}) => {
    // Fetch the actual version name if we only have the ID
    const version = useQuery(
        api.namespaceVersions.getNamespaceVersion,
        namespaceVersion.versionName === 'Loading...' && workspaceId
            ? {
                  namespaceVersionId: namespaceVersion.versionId,
                  workspaceId,
              }
            : 'skip'
    );

    // Update the version name once we have it
    useEffect(() => {
        if (version && namespaceVersion.versionName === 'Loading...') {
            onVersionNameUpdate(index, version.version);
        }
    }, [version, namespaceVersion.versionName, index, onVersionNameUpdate]);

    return (
        <div className='flex items-center justify-between bg-gray-800 rounded p-2'>
            <div className='flex items-center gap-2'>
                <Package className='h-3 w-3 text-blue-400' />
                <span className='text-sm text-white'>{namespaceVersion.namespaceName}</span>
                <Tag className='h-3 w-3 text-green-400' />
                <span className='text-sm text-gray-300'>{namespaceVersion.versionName}</span>
            </div>
            <Button
                variant='ghost'
                size='sm'
                onClick={() => onRemove(index)}
                className='text-red-400 hover:text-red-300 h-6 w-6 p-0'>
                <Trash2 className='h-3 w-3' />
            </Button>
        </div>
    );
};

export default NamespaceVersionItem;
