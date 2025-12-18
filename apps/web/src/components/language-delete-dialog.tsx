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
    language: Doc<'languages'>;
}

const LanguageDeleteDialog = ({ isOpen, setIsOpen, workspace, project, language }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const deleteLanguage = useMutation(api.languages.deleteLanguage);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!language || !workspace || !project) return;

        setIsLoading(true);

        try {
            await deleteLanguage({
                workspaceId: workspace._id,
                projectId: project._id,
                languageId: language._id,
            });

            toastManager.add({
                description: 'Language deleted successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to delete language: ${error}`,
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
                        <AlertDialogTitle>Delete Language</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. {language._id === project.primaryLanguageId ? "Please be careful - all translation keys will be deleted as well because this is the last language of the project." : "All translations for this language will be deleted"}. To confirm, please type the language code below: <strong>{language.languageCode}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === language.languageCode) {
                                    return null;
                                } else {
                                    return 'Input value does not match language code';
                                }
                            }}
                        >
                            <FieldLabel>Language Code</FieldLabel>
                            <Input name="languageCode" required />
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

export default LanguageDeleteDialog;
