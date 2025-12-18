import { useCallback, useRef, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Spinner } from './ui/spinner';

interface NamespaceSelectProps {
    projectId: Id<'projects'>;
    workspaceId: Id<'workspaces'>;
    value: string | null;
    onValueChange: (value: string | null) => void;
    placeholder?: string;
}

export function NamespaceSelect({
    projectId,
    workspaceId,
    value,
    onValueChange,
    placeholder = 'Select namespace',
}: NamespaceSelectProps) {
    const [search, setSearch] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    const {
        results: namespaces,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.namespaces.getNamespaces,
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

    const selectedNamespace = namespaces?.find(ns => ns._id === value);

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
                <SelectValue placeholder={placeholder}>
                    {selectedNamespace?.name}
                </SelectValue>
            </SelectTrigger>
            <SelectPopup>
                <div className="p-2 border-b">
                    <Input
                        type="search"
                        placeholder="Search namespaces..."
                        onChange={handleSearchChange}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                </div>
                <div
                    ref={listRef}
                    className="max-h-[200px] overflow-y-auto"
                    onScroll={handleScroll}
                >
                    {namespaces === undefined ? (
                        <div className="flex items-center justify-center py-4">
                            <Spinner />
                        </div>
                    ) : namespaces.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                            No namespaces found
                        </div>
                    ) : (
                        <>
                            {namespaces.map((namespace) => (
                                <SelectItem key={namespace._id} value={namespace._id}>
                                    {namespace.name}
                                </SelectItem>
                            ))}
                            {status === 'CanLoadMore' && (
                                <div className="flex items-center justify-center py-2">
                                    <Spinner />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SelectPopup>
        </Select>
    );
}

export default NamespaceSelect;
