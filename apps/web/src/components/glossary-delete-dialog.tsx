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
    term: Doc<'glossaryTerms'>;
}

const GlossaryDeleteDialog = ({ isOpen, setIsOpen, workspace, term }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const deleteTerm = useMutation(api.glossary.deleteTerm);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!term || !workspace) return;

        setIsLoading(true);

        try {
            await deleteTerm({
                workspaceId: workspace._id,
                termId: term._id,
            });

            toastManager.add({
                description: 'Glossary term deleted successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to delete glossary term: ${error}`,
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
                        <AlertDialogTitle>Delete Glossary Term</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. To confirm, please type the term below: <strong>{term.term}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === term.term) {
                                    return null;
                                } else {
                                    return 'Input value does not match the term';
                                }
                            }}
                        >
                            <FieldLabel>Term</FieldLabel>
                            <Input name="term" required />
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

export default GlossaryDeleteDialog;
