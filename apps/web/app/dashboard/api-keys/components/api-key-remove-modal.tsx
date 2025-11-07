import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/field';
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
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Snippet } from '@heroui/react';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    apiKey: Doc<'apiKeys'>;
}

const ApiKeyRemoveModal = ({ isOpen, setIsOpen, workspace, apiKey }: Props) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

    const canDelete = deleteConfirmation === apiKey.name;

    const handleDelete = async () => {
        if (!workspace) return;

        setIsLoading(true);

        try {
            await deleteApiKey({
                keyId: apiKey._id,
                workspaceId: workspace._id,
            });

            toast.success('API key deleted successfully');
            setIsOpen(false);
            setDeleteConfirmation('');
        } catch (error) {
            toast.error(`Failed to delete API key: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent role='alertdialog' isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalHeader>
                <ModalTitle>Delete API Key</ModalTitle>
                <ModalDescription>
                    This action is permanent and cannot be undone. Any applications or services using this key will no
                    longer be able to access the API. To confirm, please type the API key name below:
                </ModalDescription>
                <Snippet size='sm' hideSymbol>
                    {apiKey.name}
                </Snippet>
            </ModalHeader>
            <ModalBody>
                <TextField value={deleteConfirmation} onChange={setDeleteConfirmation}>
                    <Label>Name</Label>
                    <Input placeholder='Enter API key name' />
                </TextField>
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent='danger' isPending={isLoading} isDisabled={!canDelete} onClick={handleDelete}>
                    {isLoading ? <Loader /> : 'Delete API Key'}
                </Button>
            </ModalFooter>
        </ModalContent>
    );
};

export default ApiKeyRemoveModal;
