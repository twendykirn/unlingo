import { useCallback, useState } from "react";
import {
    Dialog,
    DialogClose,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTrigger,
} from "./ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { KeyRoundIcon, MoreVerticalIcon, PencilIcon, SearchIcon, TrashIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Card, CardHeader } from "./ui/card";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { Link } from "@tanstack/react-router";
import { Spinner } from "./ui/spinner";
import { Button } from "./ui/button";
import { debounce } from "@tanstack/pacer";
import { useQuery } from "convex/react";
import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc, Id } from "@unlingo/backend/convex/_generated/dataModel";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "./ui/select";
import TranslationKeyEditDialog from "./translation-key-edit-dialog";
import TranslationKeyDeleteDialog from "./translation-key-delete-dialog";
import { Menu, MenuTrigger, MenuPopup, MenuItem, MenuSeparator } from "./ui/menu";

interface Props {
    workspace?: Doc<'workspaces'> | null;
    project?: Doc<'projects'> | null;
}

const SORT_BY_OPTIONS = [
    { value: 'key', label: 'By key' },
    { value: 'value', label: 'By value' },
];

const GlobalSearchDialog = ({ workspace, project }: Props) => {
    const [search, setSearch] = useState('');
    const [searchBy, setSearchBy] = useState<'key' | 'value' | null>('key');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [activeKeyId, setActiveKeyId] = useState<Id<'translationKeys'> | null>(null);
    const [activeKeyData, setActiveKeyData] = useState<{
        key: string;
        namespaceId: Id<'namespaces'>;
        status: -1 | 1 | 2;
    } | null>(null);

    const translationKeys = useQuery(
        api.translationKeys.getTranslationKeysGlobalSearch,
        workspace && project && searchBy && search
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                search,
                searchBy,
            }
            : 'skip'
    );

    const namespace = useQuery(
        api.namespaces.getNamespace,
        workspace && project && activeKeyData?.namespaceId
            ? {
                namespaceId: activeKeyData.namespaceId,
                projectId: project._id,
                workspaceId: workspace._id
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

    const handleEditKey = (item: {
        _id: Id<'translationKeys'>;
        key: string;
        namespaceId: Id<'namespaces'>;
        status: -1 | 1 | 2;
    }) => {
        setActiveKeyId(item._id);
        setActiveKeyData({
            key: item.key,
            namespaceId: item.namespaceId,
            status: item.status,
        });
        setIsEditDialogOpen(true);
    };

    const handleDeleteKey = (item: {
        _id: Id<'translationKeys'>;
        key: string;
        namespaceId: Id<'namespaces'>;
        status: -1 | 1 | 2;
    }) => {
        setActiveKeyId(item._id);
        setActiveKeyData({
            key: item.key,
            namespaceId: item.namespaceId,
            status: item.status,
        });
        setIsDeleteDialogOpen(true);
    };

    const handleDeleted = () => {
        setActiveKeyId(null);
        setActiveKeyData(null);
    };

    return (
        <Dialog
            onOpenChange={value => {
                if (!value) {
                    setSearch('');
                    setSearchBy('key');
                    setActiveKeyId(null);
                    setActiveKeyData(null);
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
                            onValueChange={value => {
                                setSearchBy(value);
                            }}
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
                    {!workspace || !project || (translationKeys === undefined && searchBy && search) ? (
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
                            <Card
                                key={item._id}
                                className="py-4 hover:border-primary/30 group relative"
                            >
                                <DialogClose
                                    render={
                                        <Link
                                            to="/projects/$projectId/namespaces/$namespaceId/editor"
                                            params={{
                                                projectId: project!._id,
                                                namespaceId: item.namespaceId,
                                            }}
                                            search={{
                                                key: item.key,
                                            }}
                                        />
                                    }
                                >
                                    <CardHeader className="px-4 flex flex-col gap-1 cursor-pointer">
                                        <div className="flex justify-between items-center gap-2 w-full">
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="truncate flex-1 min-w-0" />}>
                                                    {item.key}
                                                </TooltipTrigger>
                                                <TooltipPopup>{item.key}</TooltipPopup>
                                            </Tooltip>
                                            <div className='flex items-center gap-1 text-muted-foreground shrink-0'>
                                                <Tooltip>
                                                    <TooltipTrigger render={<span className="text-xs p-0 truncate max-w-24" />}>
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
                                </DialogClose>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Menu>
                                        <MenuTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            }
                                        >
                                            <MoreVerticalIcon className="h-4 w-4" />
                                        </MenuTrigger>
                                        <MenuPopup align="end">
                                            <MenuItem
                                                disabled={item.status !== 1}
                                                onClick={() => handleEditKey(item)}
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                                Edit Values
                                            </MenuItem>
                                            <MenuSeparator />
                                            <MenuItem
                                                variant="destructive"
                                                disabled={item.status !== 1}
                                                onClick={() => handleDeleteKey(item)}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                                Delete Key
                                            </MenuItem>
                                        </MenuPopup>
                                    </Menu>
                                </div>
                            </Card>
                        ))
                    )}
                </DialogPanel>
                {workspace && project && activeKeyId && activeKeyData && (
                    <>
                        <TranslationKeyEditDialog
                            isOpen={isEditDialogOpen}
                            setIsOpen={setIsEditDialogOpen}
                            workspaceId={workspace._id}
                            projectId={project._id}
                            translationKeyId={activeKeyId}
                        />
                        {namespace ? (
                            <TranslationKeyDeleteDialog
                                isOpen={isDeleteDialogOpen}
                                setIsOpen={setIsDeleteDialogOpen}
                                workspace={workspace}
                                project={project}
                                namespace={namespace}
                                translationKeys={[activeKeyId]}
                                onDeleted={handleDeleted}
                            />
                        ) : null}
                    </>
                )}
            </DialogPopup>
        </Dialog>
    );
};

export default GlobalSearchDialog;