import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toastManager } from "./ui/toast";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "./ui/alert-dialog";
import { AlertDialogPanel } from "./ui/alert-dialog-panel";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Form } from "./ui/form";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
}

const ProjectDeleteDialog = ({ isOpen, setIsOpen, project, workspace }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const deleteProject = useMutation(api.projects.deleteProject);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!project || !workspace) return;

        setIsLoading(true);

        try {
            await deleteProject({
                projectId: project._id,
                workspaceId: workspace._id,
            });

            toastManager.add({
                description: 'Project deleted successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to delete project: ${error}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogPopup className="sm:max-w-sm">
                <Form className="contents" onSubmit={handleDelete}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. To confirm, please type the project name below: <strong>{project.name}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === project.name) {
                                    return null;
                                } else {
                                    return 'Input value does not match project name';
                                }
                            }}
                        >
                            <FieldLabel>Name</FieldLabel>
                            <Input name="name" required />
                            <FieldError />
                        </Field>
                    </AlertDialogPanel>
                    <AlertDialogFooter variant="bare">
                        <AlertDialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </AlertDialogClose>
                        <Button type="submit" variant='destructive'>
                            {isLoading ? <Spinner /> : 'Delete'}
                        </Button>
                    </AlertDialogFooter>
                </Form>
            </AlertDialogPopup>
        </AlertDialog>
    );
};

export default ProjectDeleteDialog;