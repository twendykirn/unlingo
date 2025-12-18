import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc, Id } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
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
    release: Doc<'releases'>;
}

const ReleaseEditDialog = ({ isOpen, setIsOpen, workspace, project, release }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBuilds, setSelectedBuilds] = useState<Map<Id<'builds'>, number>>(new Map());

    const updateRelease = useMutation(api.releases.updateRelease);

    useEffect(() => {
        const initialBuilds = new Map<Id<'builds'>, number>();
        release.builds.forEach(b => {
            initialBuilds.set(b.buildId, b.selectionChance);
        });
        setSelectedBuilds(initialBuilds);
    }, [release]);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const tag = formData.get('tag') as string;

        if (!tag.trim()) return;

        setIsLoading(true);

        try {
            const buildsArray = Array.from(selectedBuilds.entries()).map(([buildId, selectionChance]) => ({
                buildId,
                selectionChance,
            }));

            await updateRelease({
                workspaceId: workspace._id,
                projectId: project._id,
                releaseId: release._id,
                tag: tag.trim(),
                builds: buildsArray.length > 0 ? buildsArray : undefined,
            });

            toastManager.add({
                description: 'Release updated successfully',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to update release: ${err instanceof Error ? err.message : 'Unknown error'}`,
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
                <Form className="contents" onSubmit={handleUpdate}>
                    <DialogHeader>
                        <DialogTitle>Edit Release</DialogTitle>
                        <DialogDescription>
                            Update the release tag and builds.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <Field>
                            <FieldLabel>Tag</FieldLabel>
                            <Input type="text" name="tag" defaultValue={release.tag} required />
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
                        <Button type="submit">{isLoading ? <Spinner /> : 'Update'}</Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default ReleaseEditDialog;
