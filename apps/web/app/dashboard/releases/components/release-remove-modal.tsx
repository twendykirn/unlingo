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
    release: Doc<'releases'>;
}

const ReleaseRemoveModal = ({ isOpen, setIsOpen, workspace, release }: Props) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const deleteRelease = useMutation(api.releases.deleteRelease);

    const canDelete = deleteConfirmation === release.name;

    const handleDelete = async () => {
        setIsLoading(true);

        try {
            await deleteRelease({
                releaseId: release._id,
                workspaceId: workspace._id,
            });

            toast.success('Release deleted successfully');
            setIsOpen(false);
        } catch (error) {
            toast.error(`Failed to delete release: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent role='alertdialog' isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalHeader>
                <ModalTitle>Delete Release</ModalTitle>
                <ModalDescription>
                    This action is permanent and cannot be undone. Any applications or services using this release will
                    no longer be able to access the API. To confirm, please type the release name below:
                </ModalDescription>
                <Snippet size='sm' hideSymbol>
                    {release.name}
                </Snippet>
            </ModalHeader>
            <ModalBody>
                <TextField value={deleteConfirmation} onChange={setDeleteConfirmation}>
                    <Label>Name</Label>
                    <Input placeholder='Enter release name' />
                </TextField>
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent='danger' isPending={isLoading} isDisabled={!canDelete} onClick={handleDelete}>
                    {isLoading ? <Loader /> : 'Delete Release'}
                </Button>
            </ModalFooter>
        </ModalContent>
    );
};

export default ReleaseRemoveModal;
