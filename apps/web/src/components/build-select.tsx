import { useCallback, useRef, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { Input } from './ui/input';
import { Spinner } from './ui/spinner';
import { Checkbox } from './ui/checkbox';

interface BuildSelectProps {
    projectId: Id<'projects'>;
    workspaceId: Id<'workspaces'>;
    selectedBuilds: Map<Id<'builds'>, number>;
    onBuildToggle: (buildId: Id<'builds'>, namespace: string) => void;
    onChanceChange: (buildId: Id<'builds'>, chance: number) => void;
}

export function BuildSelect({
    projectId,
    workspaceId,
    selectedBuilds,
    onBuildToggle,
    onChanceChange,
}: BuildSelectProps) {
    const [search, setSearch] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    const {
        results: builds,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.builds.getBuilds,
        {
            projectId,
            workspaceId,
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

        if (scrollHeight - scrollTop - clientHeight < 100 && status === 'CanLoadMore') {
            loadMore(20);
        }
    }, [loadMore, status]);

    // Group builds by namespace
    const buildsByNamespace = (builds || []).reduce((acc, build) => {
        if (!acc[build.namespace]) {
            acc[build.namespace] = [];
        }
        acc[build.namespace].push(build);
        return acc;
    }, {} as Record<string, Doc<'builds'>[]>);

    return (
        <div className="space-y-3">
            <Input
                type="search"
                placeholder="Search builds..."
                onChange={handleSearchChange}
            />
            <div
                ref={listRef}
                className="max-h-[300px] overflow-y-auto border rounded-lg p-3"
                onScroll={handleScroll}
            >
                {builds === undefined ? (
                    <div className="flex items-center justify-center py-4">
                        <Spinner />
                    </div>
                ) : Object.keys(buildsByNamespace).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No active builds available.
                    </p>
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
                                                onCheckedChange={() => onBuildToggle(build._id, namespace)}
                                            />
                                            <span className="text-sm flex-1">{build.tag}</span>
                                            {selectedBuilds.has(build._id) && (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={selectedBuilds.get(build._id) || 0}
                                                        onChange={(e) => onChanceChange(build._id, Number(e.target.value))}
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
                        {status === 'CanLoadMore' && (
                            <div className="flex items-center justify-center py-2">
                                <Spinner />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default BuildSelect;
