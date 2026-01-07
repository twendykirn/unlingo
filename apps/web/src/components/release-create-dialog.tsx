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
import { PlusIcon, TrashIcon } from "lucide-react";
import BuildSearchDialog from "./build-search-dialog";

interface SelectedBuild {
    build: Doc<'builds'>;
    selectionChance: number;
}

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const ReleaseCreateDialog = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBuilds, setSelectedBuilds] = useState<SelectedBuild[]>([]);
    const [isBuildSearchOpen, setIsBuildSearchOpen] = useState(false);

    const createRelease = useMutation(api.releases.createRelease);

    const buildsByNamespace = selectedBuilds.reduce((acc, item) => {
        const namespace = item.build.namespace;
        if (!acc[namespace]) {
            acc[namespace] = [];
        }
        acc[namespace].push(item);
        return acc;
    }, {} as Record<string, SelectedBuild[]>);

    const handleAddBuild = (build: Doc<'builds'>) => {
        const existingInNamespace = selectedBuilds.filter(
            (item) => item.build.namespace === build.namespace
        );

        const newChance = 100 / (existingInNamespace.length + 1);

        const updatedBuilds = selectedBuilds.map((item) => {
            if (item.build.namespace === build.namespace) {
                return { ...item, selectionChance: newChance };
            }
            return item;
        });

        setSelectedBuilds([...updatedBuilds, { build, selectionChance: newChance }]);
    };

    const handleRemoveBuild = (buildId: Id<'builds'>) => {
        const buildToRemove = selectedBuilds.find((item) => item.build._id === buildId);
        if (!buildToRemove) return;

        const namespace = buildToRemove.build.namespace;
        const remainingInNamespace = selectedBuilds.filter(
            (item) => item.build.namespace === namespace && item.build._id !== buildId
        );

        const newChance = remainingInNamespace.length > 0 ? 100 / remainingInNamespace.length : 0;

        const updatedBuilds = selectedBuilds
            .filter((item) => item.build._id !== buildId)
            .map((item) => {
                if (item.build.namespace === namespace) {
                    return { ...item, selectionChance: newChance };
                }
                return item;
            });

        setSelectedBuilds(updatedBuilds);
    };

    const handleChanceChange = (buildId: Id<'builds'>, chance: number) => {
        setSelectedBuilds(
            selectedBuilds.map((item) =>
                item.build._id === buildId ? { ...item, selectionChance: chance } : item
            )
        );
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const tag = formData.get('tag') as string;

        if (!tag.trim() || selectedBuilds.length === 0) return;

        setIsLoading(true);

        try {
            const buildsArray = selectedBuilds.map((item) => ({
                buildId: item.build._id,
                selectionChance: item.selectionChance,
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
            setSelectedBuilds([]);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setSelectedBuilds([]);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
                                <div className="flex items-center justify-between mb-3 w-full">
                                    <FieldLabel className="mb-0">Builds</FieldLabel>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsBuildSearchOpen(true)}
                                    >
                                        <PlusIcon />
                                    </Button>
                                </div>
                                {selectedBuilds.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg w-full">
                                        No builds added yet.
                                    </p>
                                ) : (
                                    <div className="border rounded-lg divide-y w-full">
                                        {Object.entries(buildsByNamespace).map(([namespace, builds]) => (
                                            <div key={namespace}>
                                                <div className="px-3 py-2 bg-muted/50 text-sm font-medium text-muted-foreground">
                                                    {namespace}
                                                </div>
                                                <div className="divide-y">
                                                    {builds.map((item) => (
                                                        <div key={item.build._id} className="flex items-center gap-3 px-3 py-2">
                                                            <span className="text-sm flex-1 truncate">{item.build.tag}</span>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={item.selectionChance}
                                                                    onChange={(e) => handleChanceChange(item.build._id, Number(e.target.value))}
                                                                    className="w-16 text-sm"
                                                                />
                                                                <span className="text-sm text-muted-foreground">%</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveBuild(item.build._id)}
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <TrashIcon className="size-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Field>
                        </DialogPanel>
                        <DialogFooter>
                            <DialogClose render={<Button variant="ghost" />}>
                                Cancel
                            </DialogClose>
                            <Button type="submit" disabled={selectedBuilds.length === 0}>
                                {isLoading ? <Spinner /> : 'Create'}
                            </Button>
                        </DialogFooter>
                    </Form>
                </DialogPopup>
            </Dialog>
            <BuildSearchDialog
                isOpen={isBuildSearchOpen}
                setIsOpen={setIsBuildSearchOpen}
                projectId={project._id}
                workspaceId={workspace._id}
                excludeBuildIds={selectedBuilds.map((item) => item.build._id)}
                onSelectBuild={handleAddBuild}
            />
        </>
    );
};

export default ReleaseCreateDialog;
