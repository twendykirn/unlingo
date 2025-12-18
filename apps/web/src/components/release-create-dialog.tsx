import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc, Id } from "@unlingo/backend/convex/_generated/dataModel";
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
import BuildSelect from "./build-select";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const ReleaseCreateDialog = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBuilds, setSelectedBuilds] = useState<Map<Id<'builds'>, number>>(new Map());

    const createRelease = useMutation(api.releases.createRelease);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const tag = formData.get('tag') as string;

        if (!tag.trim() || selectedBuilds.size === 0) return;

        setIsLoading(true);

        try {
            const buildsArray = Array.from(selectedBuilds.entries()).map(([buildId, selectionChance]) => ({
                buildId,
                selectionChance,
            }));

            const releaseId = await createRelease({
                workspaceId: workspace._id,
                projectId: project._id,
                tag: tag.trim(),
                builds: buildsArray,
            });

            if (releaseId) {
                toastManager.add({
                    description: 'Release created successfully',
                    type: 'success',
                });
            }
        } catch (err) {
            toastManager.add({
                description: `Failed to create release: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
            setSelectedBuilds(new Map());
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-md">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Release</DialogTitle>
                        <DialogDescription>
                            Create a new release with selected builds.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <Field>
                            <FieldLabel>Tag</FieldLabel>
                            <Input type="text" name="tag" placeholder="e.g., v1.0.0" required />
                        </Field>
                        <Field className="border-t pt-4">
                            <FieldLabel className="mb-3">Select Builds</FieldLabel>
                            <BuildSelect
                                projectId={project._id}
                                workspaceId={workspace._id}
                                selectedBuilds={selectedBuilds}
                                setSelectedBuilds={setSelectedBuilds}
                            />
                        </Field>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={selectedBuilds.size === 0}>
                            {isLoading ? <Spinner /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default ReleaseCreateDialog;
