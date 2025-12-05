import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
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

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: number;
    permissions: string[];
}

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    apiKey: ApiKey;
    onDeleted?: () => void;
}

const ApiKeyDeleteDialog = ({ isOpen, setIsOpen, project, workspace, apiKey, onDeleted }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!project || !workspace) return;

        setIsLoading(true);

        try {
            const response = await fetch(
                `/api/api-keys/${workspace._id}/${project._id}/${apiKey.id}`,
                {
                    method: 'DELETE',
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete API key');
            }

            toastManager.add({
                description: 'API key deleted successfully',
                type: 'success',
            });
            onDeleted?.();
        } catch (error) {
            toastManager.add({
                description: `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
                        <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. Any applications or services using this key will no
                            longer be able to access the API. To confirm, please type the API key name below:
                            <strong>{apiKey.name}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === apiKey.name) {
                                    return null;
                                } else {
                                    return 'Input value does not match key name';
                                }
                            }}
                        >
                            <FieldLabel>Name</FieldLabel>
                            <Input name="name" required autoComplete="off" />
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

export default ApiKeyDeleteDialog;