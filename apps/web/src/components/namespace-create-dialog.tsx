import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toastManager } from "./ui/toast";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "./ui/dialog";
import { Form } from "./ui/form";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const NamespaceCreateDialog = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const createNamespace = useMutation(api.namespaces.createNamespace);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!name.trim()) return;

        if (project.usage.namespaces >= workspace.limits.namespacesPerProject) {
            toastManager.add({
                description: 'Cannot create namespace. Please check your subscription limits.',
                type: 'error',
            });
            setIsOpen(false);
            return;
        }

        setIsLoading(true);

        try {
            const namespaceId = await createNamespace({
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
            });

            if (namespaceId) {
                toastManager.add({
                    description: 'Namespace created successfully',
                    type: 'success',
                });
            }
        } catch (err) {
            toastManager.add({
                description: `Failed to create namespace: ${err instanceof Error ? err.message : 'Unknown error'}`,
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
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Namespace</DialogTitle>
                        <DialogDescription>
                            Add namespace name here. Development and production environments will be created
                            automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input type="text" name="name" required />
                        </Field>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit">{isLoading ? <Spinner /> : 'Create'}</Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default NamespaceCreateDialog;