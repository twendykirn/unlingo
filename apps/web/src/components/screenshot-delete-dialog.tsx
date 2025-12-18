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
    screenshot: Doc<'screenshots'>;
}

const ScreenshotDeleteDialog = ({ isOpen, setIsOpen, workspace, screenshot }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const deleteScreenshot = useMutation(api.screenshots.deleteScreenshot);

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!screenshot || !workspace) return;

        setIsLoading(true);

        try {
            await deleteScreenshot({
                workspaceId: workspace._id,
                screenshotId: screenshot._id,
            });

            toastManager.add({
                description: 'Screenshot deleted successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to delete screenshot: ${error}`,
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
                        <AlertDialogTitle>Delete Screenshot</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone. All containers and key mappings associated with this screenshot will also be deleted. To confirm, please type the screenshot name below: <strong>{screenshot.name}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel>
                        <Field
                            validate={(value) => {
                                if (value === screenshot.name) {
                                    return null;
                                } else {
                                    return 'Input value does not match screenshot name';
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

export default ScreenshotDeleteDialog;
