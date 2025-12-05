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
    namespace: Doc<'namespaces'>;
}

const NamespaceEditDialog = ({ isOpen, setIsOpen, project, workspace, namespace }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const updateNamespace = useMutation(api.namespaces.updateNamespace);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!project || !workspace || !namespace || !name.trim()) return;

        const hasChanges = name.trim() !== namespace.name;

        if (!hasChanges) {
            toastManager.add({
                description: 'Namespace updated successfully',
                type: 'success',
            });
            setIsOpen(false);
            return;
        }

        setIsLoading(true);

        try {
            await updateNamespace({
                namespaceId: namespace._id,
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
            });
            toastManager.add({
                description: 'Namespace updated successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to update namespace: ${error}`,
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
                        <DialogTitle>Update Namespace</DialogTitle>
                        <DialogDescription>
                            Adjust namespace name here.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input type="text" name="name" required defaultValue={namespace.name} />
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

export default NamespaceEditDialog;