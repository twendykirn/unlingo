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
import NamespaceSelect from "./namespace-select";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const BuildCreateDialog = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedNamespaceId, setSelectedNamespaceId] = useState<string | null>(null);

    const createBuild = useMutation(api.builds.createBuild);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const tag = formData.get('tag') as string;

        if (!tag.trim() || !selectedNamespaceId) return;

        setIsLoading(true);

        try {
            const buildId = await createBuild({
                workspaceId: workspace._id,
                projectId: project._id,
                namespaceId: selectedNamespaceId as Doc<'namespaces'>['_id'],
                tag: tag.trim(),
            });

            if (buildId) {
                toastManager.add({
                    description: 'Build started successfully',
                    type: 'success',
                });
            }
        } catch (err) {
            toastManager.add({
                description: `Failed to start build: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
            setSelectedNamespaceId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-sm">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Build</DialogTitle>
                        <DialogDescription>
                            Create a new build for your translations.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Tag</FieldLabel>
                            <Input type="text" name="tag" placeholder="e.g., v1.0.0" required />
                        </Field>
                        <Field>
                            <FieldLabel>Namespace</FieldLabel>
                            <NamespaceSelect
                                projectId={project._id}
                                workspaceId={workspace._id}
                                value={selectedNamespaceId}
                                onValueChange={setSelectedNamespaceId}
                            />
                        </Field>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={!selectedNamespaceId}>
                            {isLoading ? <Spinner /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default BuildCreateDialog;
