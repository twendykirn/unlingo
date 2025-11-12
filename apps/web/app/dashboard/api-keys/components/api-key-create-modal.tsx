import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/field';
import { GridList, GridListItem } from '@/components/ui/grid-list';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import {
    ModalBody,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';
import { Doc } from '@/convex/_generated/dataModel';
import { Snippet } from '@heroui/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Selection } from 'react-aria-components';

const PERMISSIONS = [
    { id: 'translations.read', name: 'Translations Read' },
    { id: 'translations.load', name: 'Translations Load' },
    { id: 'translations.write', name: 'Translations Write' },
];

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    onCreated?: () => void;
}

const ApiKeyCreateModal = ({ isOpen, setIsOpen, workspace, project, onCreated }: Props) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));

    const handleGenerate = async () => {
        setIsLoading(true);

        try {
            const permissions = Array.from(selectedKeys);

            if (!name.trim()) {
                throw new Error('Name is required');
            }

            if (permissions.length === 0) {
                throw new Error('At least one permission is required');
            }

            const response = await fetch('/api/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: project._id,
                    workspaceId: workspace._id,
                    name: name.trim(),
                    permissions: Array.from(selectedKeys),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create API key');
            }

            const result = await response.json();
            setNewlyGeneratedKey(result.key);
            setName('');
            toast.success('API key created successfully');

            if (onCreated) {
                onCreated();
            }
        } catch (err) {
            toast.error(`Failed to create API key: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent
            isOpen={isOpen}
            onOpenChange={value => {
                if (!value) {
                    setName('');
                    setNewlyGeneratedKey(null);
                    setSelectedKeys(new Set([]));
                }

                setIsOpen(value);
            }}>
            <ModalHeader>
                <ModalTitle>{newlyGeneratedKey ? 'API Key Generated!' : 'Generate New API Key'}</ModalTitle>
                <ModalDescription>
                    {newlyGeneratedKey ? 'WARNING: This key is shown only once.' : `Create a key for ${project.name}`}
                </ModalDescription>
            </ModalHeader>
            <ModalBody>
                {newlyGeneratedKey ? (
                    <Snippet hideSymbol classNames={{ pre: 'truncate' }}>
                        {newlyGeneratedKey}
                    </Snippet>
                ) : (
                    <div className='space-y-4'>
                        <TextField value={name} onChange={setName}>
                            <Label>Name</Label>
                            <Input placeholder='Enter key name' />
                        </TextField>
                        <div>
                            <Label>Permissions</Label>
                            <GridList
                                items={PERMISSIONS}
                                selectedKeys={selectedKeys}
                                onSelectionChange={setSelectedKeys}
                                aria-label='Select permissions'
                                selectionMode='multiple'
                                className='min-w-64 mt-2'>
                                {item => <GridListItem>{item.name}</GridListItem>}
                            </GridList>
                        </div>
                    </div>
                )}{' '}
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                {newlyGeneratedKey ? (
                    <Button
                        intent='warning'
                        onClick={() => {
                            setIsOpen(false);
                            setName('');
                            setNewlyGeneratedKey(null);
                            setSelectedKeys(new Set([]));
                        }}>
                        Done
                    </Button>
                ) : (
                    <Button isPending={isLoading} onClick={handleGenerate}>
                        {isLoading ? <Loader /> : 'Generate Key'}
                    </Button>
                )}
            </ModalFooter>
        </ModalContent>
    );
};

export default ApiKeyCreateModal;
