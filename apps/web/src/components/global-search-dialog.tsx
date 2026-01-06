import { useCallback, useState } from "react";
import {
    Dialog,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTrigger,
} from "./ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { KeyRoundIcon, SearchIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Card, CardHeader } from "./ui/card";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { Link } from "@tanstack/react-router";
import { Spinner } from "./ui/spinner";
import { Button } from "./ui/button";
import { debounce } from "@tanstack/pacer";
import { useQuery } from "convex/react";
import { api } from "@unlingo/backend/convex/_generated/api";
import type { Id } from "@unlingo/backend/convex/_generated/dataModel";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "./ui/select";

interface Props {
    workspaceId?: Id<'workspaces'>;
    projectId?: Id<'projects'>;
}

const SORT_BY_OPTIONS = [
    { value: 'key', label: 'By key' },
    { value: 'value', label: 'By value' },
];

const GlobalSearchDialog = ({ workspaceId, projectId }: Props) => {
    const [search, setSearch] = useState('');
    const [searchBy, setSearchBy] = useState<'key' | 'value' | null>('key');

    const translationKeys = useQuery(
        api.translationKeys.getTranslationKeysGlobalSearch,
        workspaceId && projectId && searchBy && search
            ? {
                projectId,
                workspaceId,
                search,
                searchBy,
            }
            : 'skip'
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearch = useCallback(
        debounce((value: string) => setSearch(value), { wait: 500 }),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSetSearch(e.target.value);
    };

    return (
        <Dialog
            onOpenChange={value => {
                if (!value) {
                    setSearch('');
                    setSearchBy('key');
                }
            }}
        >
            <DialogTrigger render={<Button variant="outline" />}>
                <SearchIcon />
                Global Search
            </DialogTrigger>
            <DialogPopup showCloseButton={false}>
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <InputGroup className="flex-1">
                            <InputGroupInput
                                aria-label="Search"
                                placeholder={searchBy === 'key' ? "Search keys" : "Search values"}
                                type="search"
                                onChange={handleSearchChange}
                            />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                        </InputGroup>
                        <Select
                            value={searchBy}
                            onValueChange={setSearchBy}
                        >
                            <SelectTrigger className='w-4'>
                                <SelectValue>
                                    {(item) => (
                                        item === 'key' ? (
                                            'By key'
                                        ) : (
                                            'By value'
                                        )
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectPopup>
                                {SORT_BY_OPTIONS.map(({ label, value }) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectPopup>
                        </Select>
                    </div>
                </DialogHeader>
                <DialogPanel className="grid gap-2">
                    {!workspaceId || !projectId || (translationKeys === undefined && searchBy && search) ? (
                        <Spinner className="mx-auto mt-2" />
                    ) : !translationKeys || translationKeys?.length === 0 || (!searchBy || !search) ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <KeyRoundIcon />
                                </EmptyMedia>
                                <EmptyTitle>No keys</EmptyTitle>
                                <EmptyDescription>We didn't find any keys matching your search.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        translationKeys?.map(item => (
                            <Link
                                key={item._id}
                                to="/projects/$projectId/namespaces/$namespaceId/editor"
                                params={{
                                    projectId,
                                    namespaceId: item.namespaceId,
                                }}
                            >
                                <Card className="py-4 hover:border-primary/30">
                                    <CardHeader className="px-4 flex flex-col gap-1">
                                        <div className="flex justify-between items-center gap-8 w-full">
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="truncate" />}>
                                                    {item.key}
                                                </TooltipTrigger>
                                                <TooltipPopup>{item.key}</TooltipPopup>
                                            </Tooltip>
                                            <div className='flex items-center gap-1 text-muted-foreground'>
                                                <Tooltip>
                                                    <TooltipTrigger render={<span className="text-xs p-0" />}>
                                                        {item.namespaceName}
                                                    </TooltipTrigger>
                                                    <TooltipPopup>Namespace</TooltipPopup>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        {item.matchedValue ? (
                                            <Tooltip>
                                                <TooltipTrigger render={<p className="text-xs text-muted-foreground truncate max-w-full" />}>
                                                    {item.matchedValue}
                                                </TooltipTrigger>
                                                <TooltipPopup className="max-w-md">{item.matchedValue}</TooltipPopup>
                                            </Tooltip>
                                        ) : null}
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))
                    )}
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
};

export default GlobalSearchDialog;