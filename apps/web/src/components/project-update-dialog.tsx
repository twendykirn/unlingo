import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toastManager } from "./ui/toast";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "./ui/dialog";
import { Form } from "./ui/form";
import { Field, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
}

const ProjectEditDialog = ({ isOpen, setIsOpen, project, workspace }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const updateProject = useMutation(api.projects.updateProject);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!project || !workspace || !name.trim()) return;

        const hasChanges = name.trim() !== project.name;

        if (!hasChanges) {
            toastManager.add({
                description: 'Project updated successfully',
                type: 'success',
            });
            setIsOpen(false);
            return;
        }

        setIsLoading(true);

        try {
            await updateProject({
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
            });
            toastManager.add({
                description: 'Project updated successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to update project: ${error}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-sm">
                <Form className="contents" onSubmit={handleUpdate}>
                    <DialogHeader>
                        <DialogTitle>Update Project</DialogTitle>
                        <DialogDescription>
                            Adjust project name and description here.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input type="text" name="name" required defaultValue={project.name} />
                        </Field>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit">{isLoading ? <Spinner /> : 'Update'}</Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default ProjectEditDialog;