import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toastManager } from "./ui/toast";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle
} from "./ui/dialog";
import { Form } from "./ui/form";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    namespace: Doc<'namespaces'>;
}

const TranslationKeyCreateDialog = ({ isOpen, setIsOpen, workspace, project, namespace }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const createTranslationKey = useMutation(api.translationKeys.createTranslationKey);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const key = formData.get('key') as string;
        const primaryValue = formData.get('primaryValue') as string;

        if (!key.trim() || !primaryValue.trim()) return;

        setIsLoading(true);

        try {
            const keyId = await createTranslationKey({
                workspaceId: workspace._id,
                projectId: project._id,
                namespaceId: namespace._id,
                key: key.trim(),
                primaryValue: primaryValue.trim(),
            });

            if (keyId) {
                toastManager.add({
                    description: 'Translation key created successfully',
                    type: 'success',
                });
            }
        } catch (err) {
            toastManager.add({
                description: `Failed to create translation key: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-md">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Translation Key</DialogTitle>
                        <DialogDescription>
                            Add a new translation key to the namespace.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Key</FieldLabel>
                            <Input type="text" name="key" placeholder="e.g., common.buttons.submit" required />
                        </Field>
                        <Field>
                            <FieldLabel>Primary Value</FieldLabel>
                            <Textarea name="primaryValue" placeholder="Enter the primary language translation..." required />
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

export default TranslationKeyCreateDialog;
