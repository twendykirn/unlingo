import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toastManager } from "./ui/toast";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import {
    AlertDialog,
    AlertDialogClose,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogPopup,
    AlertDialogTitle
} from "./ui/alert-dialog";
import { AlertDialogPanel } from "./ui/alert-dialog-panel";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Form } from "./ui/form";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    namespace: Doc<'namespaces'>;
    translationKey: Doc<'translationKeys'>;
}

const TranslationKeyDeleteDialog = ({ isOpen, setIsOpen, workspace, project, namespace, translationKey }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const deleteTranslationKeys = useMutation(api.translationKeys.deleteTranslationKeys);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!translationKey || !workspace || !project || !namespace) return;

        setIsLoading(true);

        try {
            await deleteTranslationKeys({
                workspaceId: workspace._id,
                projectId: project._id,
                namespaceId: namespace._id,
                keyIds: [translationKey._id],
            });

            toastManager.add({
                description: 'Translation key deleted successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to delete translation key: ${error}`,
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
                        <AlertDialogTitle>Delete Translation Key</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. All translations for this key will be deleted. To confirm, please type the key below: <strong>{translationKey.key}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === translationKey.key) {
                                    return null;
                                } else {
                                    return 'Input value does not match the key';
                                }
                            }}
                        >
                            <FieldLabel>Key</FieldLabel>
                            <Input name="key" required />
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

export default TranslationKeyDeleteDialog;
