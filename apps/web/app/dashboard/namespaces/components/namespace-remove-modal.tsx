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
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
    namespace: Doc<'namespaces'>;
}

const NamespaceRemoveModal = ({ isOpen, setIsOpen, project, workspace, namespace }: Props) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const deleteNamespace = useMutation(api.namespaces.deleteNamespace);

    const canDelete = deleteConfirmation === namespace.name;

    const handleDelete = async () => {
        if (!project || !workspace) return;

        setIsLoading(true);

        try {
            await deleteNamespace({
                namespaceId: namespace._id,
                projectId: project._id,
                workspaceId: workspace._id,
            });

            toast.success('Namespace deleted successfully');
            setIsOpen(false);
        } catch (error) {
            toast.error(`Failed to delete namespace: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent role='alertdialog' isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalHeader>
                <ModalTitle>Delete Namespace</ModalTitle>
                <ModalDescription>
                    This action is permanent and cannot be undone. To confirm, please type the namespace name below:
                </ModalDescription>
                <Snippet size='sm' hideSymbol>
                    {namespace.name}
                </Snippet>
            </ModalHeader>
            <ModalBody>
                <TextField value={deleteConfirmation} onChange={setDeleteConfirmation}>
                    <Label>Name</Label>
                    <Input placeholder='Enter namespace name' />
                </TextField>
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent='danger' isPending={isLoading} isDisabled={!canDelete} onClick={handleDelete}>
                    {isLoading ? <Loader /> : 'Delete Namespace'}
                </Button>
            </ModalFooter>
        </ModalContent>
    );
};

export default NamespaceRemoveModal;
