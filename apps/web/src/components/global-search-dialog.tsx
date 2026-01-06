import { useCallback, useState } from "react";
import {
    Dialog,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTrigger,
} from "./ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { KeyRoundIcon, PencilIcon, SearchIcon, TrashIcon } from "lucide-react";
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
import TranslationKeyEditDialog from "./translation-key-edit-dialog";
import TranslationKeyDeleteDialog from "./translation-key-delete-dialog";

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
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedKeyId, setSelectedKeyId] = useState<Id<'translationKeys'> | null>(null);
    const [selectedKeyData, setSelectedKeyData] = useState<{
        key: string;
        namespaceId: Id<'namespaces'>;
    } | null>(null);

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

    const workspace = useQuery(
        api.workspaces.getWorkspace,
        workspaceId
            ? { workspaceId }
            : 'skip'
    );

    const project = useQuery(
        api.projects.getProject,
        workspaceId && projectId
            ? { projectId, workspaceId }
            : 'skip'
    );

    const namespace = useQuery(
        api.namespaces.getNamespace,
        workspaceId && projectId && selectedKeyData?.namespaceId
            ? { namespaceId: selectedKeyData.namespaceId, projectId, workspaceId }
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

    const handleSelectKey = (item: {
        _id: Id<'translationKeys'>;
        key: string;
        namespaceId: Id<'namespaces'>;
    }) => {
        setSelectedKeyId(item._id);
        setSelectedKeyData({
            key: item.key,
            namespaceId: item.namespaceId,
        });
    };

    const handleEditKey = () => {
        if (selectedKeyId) {
            setIsEditDialogOpen(true);
        }
    };

    const handleDeleteKey = () => {
        if (selectedKeyId) {
            setIsDeleteDialogOpen(true);
        }
    };

    const handleDeleted = () => {
        setSelectedKeyId(null);
        setSelectedKeyData(null);
    };

    return (
        <Dialog
            onOpenChange={value => {
                if (!value) {
                    setSearch('');
                    setSearchBy('key');
                    setSelectedKeyId(null);
                    setSelectedKeyData(null);
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
                            <Card
                                key={item._id}
                                className={`py-4 cursor-pointer hover:border-primary/30 ${selectedKeyId === item._id ? 'border-primary ring-1 ring-primary' : ''}`}
                                onClick={() => handleSelectKey(item)}
                            >
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
                        ))
                    )}
                </DialogPanel>
                {selectedKeyId && selectedKeyData && projectId && (
                    <DialogFooter variant="bare">
                        <Link
                            to="/projects/$projectId/namespaces/$namespaceId/editor"
                            params={{
                                projectId,
                                namespaceId: selectedKeyData.namespaceId,
                            }}
                            search={{
                                key: selectedKeyData.key,
                            }}
                        >
                            <Button variant="outline">
                                <SearchIcon className="size-4" />
                                Go to Editor
                            </Button>
                        </Link>
                        <Button onClick={handleEditKey}>
                            <PencilIcon className="size-4" />
                            Edit Values
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteKey}>
                            <TrashIcon className="size-4" />
                            Delete Key
                        </Button>
                    </DialogFooter>
                )}
                {workspaceId && projectId && (
                    <TranslationKeyEditDialog
                        isOpen={isEditDialogOpen}
                        setIsOpen={setIsEditDialogOpen}
                        workspaceId={workspaceId}
                        projectId={projectId}
                        translationKeyId={selectedKeyId}
                    />
                )}
                {workspace && project && namespace && selectedKeyId && (
                    <TranslationKeyDeleteDialog
                        isOpen={isDeleteDialogOpen}
                        setIsOpen={setIsDeleteDialogOpen}
                        workspace={workspace}
                        project={project}
                        namespace={namespace}
                        translationKeys={[selectedKeyId]}
                        onDeleted={handleDeleted}
                    />
                )}
            </DialogPopup>
        </Dialog>
    );
};

export default GlobalSearchDialog;