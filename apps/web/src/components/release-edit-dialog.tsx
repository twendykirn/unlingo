import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc, Id } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Checkbox } from "./ui/checkbox";
import { debounce } from "@tanstack/pacer";

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
    const [search, setSearch] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    const updateRelease = useMutation(api.releases.updateRelease);

    const {
        results: builds,
        loadMore,
        status: buildsStatus,
    } = usePaginatedQuery(
        api.builds.getBuilds,
        {
            projectId: project._id,
            workspaceId: workspace._id,
            search: search || undefined,
        },
        { initialNumItems: 20 }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearch = useCallback(
        debounce((value: string) => setSearch(value), { wait: 500 }),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSetSearch(e.target.value);
    };

    const handleScroll = useCallback(() => {
        if (!listRef.current) return;

        const { scrollHeight, scrollTop, clientHeight } = listRef.current;

        if (scrollHeight - scrollTop - clientHeight < 100 && buildsStatus === 'CanLoadMore') {
            loadMore(20);
        }
    }, [loadMore, buildsStatus]);

    const buildsByNamespace = (builds || []).reduce((acc, build) => {
        if (!acc[build.namespace]) {
            acc[build.namespace] = [];
        }
        acc[build.namespace].push(build);
        return acc;
    }, {} as Record<string, Doc<'builds'>[]>);

    useEffect(() => {
        const initialBuilds = new Map<Id<'builds'>, number>();
        release.builds.forEach(b => {
            initialBuilds.set(b.buildId, b.selectionChance);
        });
        setSelectedBuilds(initialBuilds);
    }, [release]);

    const handleBuildToggle = (buildId: Id<'builds'>, namespace: string) => {
        setSelectedBuilds(prev => {
            const newMap = new Map(prev);
            if (newMap.has(buildId)) {
                newMap.delete(buildId);
            } else {
                const namespaceBuilds = buildsByNamespace[namespace];
                const currentlySelectedInNamespace = namespaceBuilds.filter(b =>
                    newMap.has(b._id) || b._id === buildId
                ).length;
                const newChance = 100 / currentlySelectedInNamespace;

                namespaceBuilds.forEach(b => {
                    if (newMap.has(b._id) || b._id === buildId) {
                        newMap.set(b._id === buildId ? buildId : b._id, newChance);
                    }
                });
            }

            const selectedInNamespace = Array.from(newMap.entries())
                .filter(([id]) => buildsByNamespace[namespace]?.some(b => b._id === id));

            if (selectedInNamespace.length > 0) {
                const evenChance = 100 / selectedInNamespace.length;
                selectedInNamespace.forEach(([id]) => {
                    newMap.set(id, evenChance);
                });
            }

            return newMap;
        });
    };

    const handleChanceChange = (buildId: Id<'builds'>, chance: number) => {
        setSelectedBuilds(prev => {
            const newMap = new Map(prev);
            newMap.set(buildId, chance);
            return newMap;
        });
    };

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
                        <div className="border-t pt-4">
                            <FieldLabel className="mb-3">Select Builds</FieldLabel>
                            <Input
                                type="search"
                                placeholder="Search builds..."
                                onChange={handleSearchChange}
                                className="mb-3"
                            />
                            <div
                                ref={listRef}
                                className="max-h-[200px] overflow-y-auto border rounded-lg p-3"
                                onScroll={handleScroll}
                            >
                                {builds === undefined ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Spinner />
                                    </div>
                                ) : Object.keys(buildsByNamespace).length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center">No active builds available.</p>
                                ) : (
                                    <>
                                        {Object.entries(buildsByNamespace).map(([namespace, namespaceBuilds]) => (
                                            <div key={namespace} className="mb-4 last:mb-0">
                                                <div className="text-sm font-medium text-muted-foreground mb-2">
                                                    {namespace}
                                                </div>
                                                <div className="grid gap-2">
                                                    {namespaceBuilds.map((build) => (
                                                        <div key={build._id} className="flex items-center gap-3">
                                                            <Checkbox
                                                                checked={selectedBuilds.has(build._id)}
                                                                onCheckedChange={() => handleBuildToggle(build._id, namespace)}
                                                            />
                                                            <span className="text-sm flex-1">{build.tag}</span>
                                                            {selectedBuilds.has(build._id) && (
                                                                <div className="flex items-center gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        value={selectedBuilds.get(build._id) || 0}
                                                                        onChange={(e) => handleChanceChange(build._id, Number(e.target.value))}
                                                                        className="w-16 text-sm"
                                                                    />
                                                                    <span className="text-sm text-muted-foreground">%</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {buildsStatus === 'CanLoadMore' && (
                                            <div className="flex items-center justify-center py-2">
                                                <Spinner />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
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
