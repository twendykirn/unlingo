import { useCallback, useRef, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { Input } from './ui/input';
import { Spinner } from './ui/spinner';
import { Button } from './ui/button';
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle
} from './ui/dialog';

interface BuildSearchDialogProps {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    projectId: Id<'projects'>;
    workspaceId: Id<'workspaces'>;
    excludeBuildIds: Id<'builds'>[];
    onSelectBuild: (build: Doc<'builds'>) => void;
}

export function BuildSearchDialog({
    isOpen,
    setIsOpen,
    projectId,
    workspaceId,
    excludeBuildIds,
    onSelectBuild,
}: BuildSearchDialogProps) {
    const [search, setSearch] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    const {
        results: builds,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.builds.getBuilds,
        isOpen ? {
            projectId,
            workspaceId,
            search: search || undefined,
        } : 'skip',
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

        if (scrollHeight - scrollTop - clientHeight < 100 && status === 'CanLoadMore') {
            loadMore(20);
        }
    }, [loadMore, status]);

    const filteredBuilds = (builds || []).filter(
        (build) => build.status === 1 && !excludeBuildIds.includes(build._id)
    );

    const buildsByNamespace = filteredBuilds.reduce((acc, build) => {
        if (!acc[build.namespace]) {
            acc[build.namespace] = [];
        }
        acc[build.namespace].push(build);
        return acc;
    }, {} as Record<string, Doc<'builds'>[]>);

    const handleSelectBuild = (build: Doc<'builds'>) => {
        onSelectBuild(build);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Build</DialogTitle>
                    <DialogDescription>
                        Search and select a build to add to this release.
                    </DialogDescription>
                </DialogHeader>
                <DialogPanel className="grid gap-4">
                    <Input
                        type="search"
                        placeholder="Search builds by tag..."
                        onChange={handleSearchChange}
                    />
                    <div
                        ref={listRef}
                        className="max-h-[300px] overflow-y-auto border rounded-lg"
                        onScroll={handleScroll}
                    >
                        {builds === undefined ? (
                            <div className="flex items-center justify-center py-8">
                                <Spinner />
                            </div>
                        ) : Object.keys(buildsByNamespace).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No available builds found.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {Object.entries(buildsByNamespace).map(([namespace, namespaceBuilds]) => (
                                    <div key={namespace}>
                                        <div className="px-3 py-2 bg-muted/50 text-sm font-medium text-muted-foreground sticky top-0">
                                            {namespace}
                                        </div>
                                        <div className="divide-y">
                                            {namespaceBuilds.map((build) => (
                                                <button
                                                    key={build._id}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => handleSelectBuild(build)}
                                                >
                                                    <span className="text-sm">{build.tag}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {status === 'CanLoadMore' && (
                                    <div className="flex items-center justify-center py-4">
                                        <Spinner />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogPanel>
                <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>
                        Cancel
                    </DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}

export default BuildSearchDialog;
