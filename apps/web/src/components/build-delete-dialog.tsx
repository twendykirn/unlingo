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
    build: Doc<'builds'>;
}

const BuildDeleteDialog = ({ isOpen, setIsOpen, workspace, build }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const deleteBuild = useMutation(api.builds.deleteBuild);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!build || !workspace) return;

        setIsLoading(true);

        try {
            await deleteBuild({
                workspaceId: workspace._id,
                buildId: build._id,
            });

            toastManager.add({
                description: 'Build deleted successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to delete build: ${error}`,
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
                        <AlertDialogTitle>Delete Build</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. To confirm, please type the build tag below: <strong>{build.tag}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === build.tag) {
                                    return null;
                                } else {
                                    return 'Input value does not match build tag';
                                }
                            }}
                        >
                            <FieldLabel>Tag</FieldLabel>
                            <Input name="tag" required />
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

export default BuildDeleteDialog;
