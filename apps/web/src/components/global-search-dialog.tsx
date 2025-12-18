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

interface Props {
    workspaceId?: Id<'workspaces'>;
    projectId?: Id<'projects'>;
}

const GlobalSearchDialog = ({ workspaceId, projectId }: Props) => {
    const [search, setSearch] = useState('');

    const translationKeys = useQuery(
        api.translationKeys.getTranslationKeysGlobalSearch,
        workspaceId && projectId
            ? {
                projectId,
                workspaceId,
                search,
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

    console.log(translationKeys);

    return (
        <Dialog
            onOpenChange={value => {
                if (!value) {
                    setSearch('');
                }
            }}
        >
            <DialogTrigger render={<Button variant="outline" />}>
                <SearchIcon />
                Global Search
            </DialogTrigger>
            <DialogPopup showCloseButton={false}>
                <DialogHeader>
                    <InputGroup>
                        <InputGroupInput
                            aria-label="Search"
                            placeholder="Search keys"
                            type="search"
                            onChange={handleSearchChange}
                        />
                        <InputGroupAddon>
                            <SearchIcon />
                        </InputGroupAddon>
                    </InputGroup>
                </DialogHeader>
                <DialogPanel className="grid gap-2">
                    {!workspaceId || !projectId || translationKeys === undefined ? (
                        <Spinner className="mx-auto mt-2" />
                    ) : translationKeys?.length === 0 ? (
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
                        translationKeys.map(item => (
                            <Link
                                key={item._id}
                                to="/projects/$projectId/namespaces/$namespaceId/editor"
                                params={{
                                    projectId,
                                    namespaceId: item.namespaceId,
                                }}
                            >
                                <Card className="py-4 hover:border-primary/30">
                                    <CardHeader className="px-4 flex justify-between items-center gap-8">
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
                                            •
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="text-xs p-0" />}>
                                                    {item.status === 1 ? 'Active' : 'Inactive'}
                                                </TooltipTrigger>
                                                <TooltipPopup>Status</TooltipPopup>
                                            </Tooltip>
                                        </div>
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