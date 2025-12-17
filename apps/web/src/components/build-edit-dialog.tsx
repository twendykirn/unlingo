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
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    build: Doc<'builds'>;
}

const BuildEditDialog = ({ isOpen, setIsOpen, workspace, build }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const updateBuild = useMutation(api.builds.updateBuild);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const tag = formData.get('tag') as string;

        if (!build || !workspace || !tag.trim()) return;

        const hasChanges = tag.trim() !== build.tag;

        if (!hasChanges) {
            toastManager.add({
                description: 'Build updated successfully',
                type: 'success',
            });
            setIsOpen(false);
            return;
        }

        setIsLoading(true);

        try {
            await updateBuild({
                workspaceId: workspace._id,
                buildId: build._id,
                tag: tag.trim(),
            });
            toastManager.add({
                description: 'Build updated successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to update build: ${error}`,
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
                        <DialogTitle>Update Build</DialogTitle>
                        <DialogDescription>
                            Update the build tag.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Tag</FieldLabel>
                            <Input type="text" name="tag" required defaultValue={build.tag} />
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

export default BuildEditDialog;
