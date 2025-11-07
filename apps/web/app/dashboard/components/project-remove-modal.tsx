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
}

const ProjectRemoveModal = ({ isOpen, setIsOpen, project, workspace }: Props) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const deleteProject = useMutation(api.projects.deleteProject);

    const canDelete = deleteConfirmation === project.name;

    const handleDelete = async () => {
        if (!project || !workspace) return;

        setIsLoading(true);

        try {
            await deleteProject({
                projectId: project._id,
                workspaceId: workspace._id,
            });

            toast.success('Project deleted successfully');
            setIsOpen(false);
        } catch (error) {
            toast.error(`Failed to delete project: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent role='alertdialog' isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalHeader>
                <ModalTitle>Delete Project</ModalTitle>
                <ModalDescription>
                    This action is permanent and cannot be undone. To confirm, please type the project name below:
                </ModalDescription>
                <Snippet size='sm' hideSymbol>
                    {project.name}
                </Snippet>
            </ModalHeader>
            <ModalBody>
                <TextField value={deleteConfirmation} onChange={setDeleteConfirmation}>
                    <Label>Name</Label>
                    <Input placeholder='Enter project name' />
                </TextField>
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent='danger' isPending={isLoading} isDisabled={!canDelete} onClick={handleDelete}>
                    {isLoading ? <Loader /> : 'Delete Project'}
                </Button>
            </ModalFooter>
        </ModalContent>
    );
};

export default ProjectRemoveModal;
