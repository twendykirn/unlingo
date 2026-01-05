import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import {
    BookIcon,
    ChevronDownIcon,
    CopyIcon,
    LanguagesIcon,
    PlusIcon,
    SearchIcon,
    StarIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    type Column,
    type ColumnDef,
    type RowSelectionState,
} from '@tanstack/react-table';
import GlobalSearchDialog from '@/components/global-search-dialog';
import AutoSizer from "react-virtualized-auto-sizer";
import { toastManager } from '@/components/ui/toast';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import TranslationKeyCreateDialog from '@/components/translation-key-create-dialog';
import TranslationKeyDeleteDialog from '@/components/translation-key-delete-dialog';
import { debounce } from '@tanstack/pacer';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

export const Route = createFileRoute(
    '/_auth/_org/projects/$projectId/namespaces/$namespaceId/editor'
)({
    component: EditorComponent,
});

const columnHelper = createColumnHelper<Doc<'translationKeys'>>();

const getCommonPinningStyles = (column: Column<Doc<'translationKeys'>>): CSSProperties => {
    const isPinned = column.getIsPinned()
    const isLastLeftPinnedColumn =
        isPinned === 'left' && column.getIsLastColumn('left');

    return {
        boxShadow: isLastLeftPinnedColumn
            ? '-4px 0 4px -4px gray inset'
            : undefined,
        left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
        position: isPinned ? 'sticky' : 'relative',
        width: column.getSize(),
        zIndex: isPinned ? 1 : 0,
    }
}

function EditableCell({
    value,
    onSave,
    isKey = false,
    status,
}: {
    value: string;
    onSave?: (newValue: string) => void;
    isKey?: boolean;
    status?: 1 | 2;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (value !== editValue && editValue.trim()) {
                onSave?.(editValue);
            };

            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        toastManager.add({
            description: isKey ? 'Key copied to clipboard' : 'Value copied to clipboard',
            type: 'info',
        });
    };

    if (status === 2) {
        return <Spinner />;
    }

    if (isEditing) {
        return (
            <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    setEditValue(value);
                    setIsEditing(false);
                }}
                autoFocus
                className="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-primary"
            />
        );
    }

    return (
        <div
            onClick={() => {
                if (!isKey) {
                    setIsEditing(true);
                } else {
                    handleCopy({ stopPropagation: () => { } } as React.MouseEvent);
                }
            }}
            className='cursor-pointer max-w-[250px] relative group flex items-center'
        >
            <Tooltip>
                <TooltipTrigger delay={0} render={<div className={`truncate text-sm pr-6 w-full ${!isKey && 'text-muted-foreground'}`} />}>
                    {value || <span className="text-gray-300 italic">Empty</span>}
                </TooltipTrigger>
                <TooltipPopup>
                    <div className='max-w-[300px] text-pretty'>
                        {value}
                    </div>
                </TooltipPopup>
            </Tooltip>
            {!isKey && value ? (
                <Button
                    onClick={handleCopy}
                    className="absolute right-0 opacity-0 group-hover:opacity-100"
                    size="icon-xs"
                    variant="ghost"
                >
                    <CopyIcon />
                </Button>
            ) : null}
        </div>
    );
}

function SelectableColumnHeader({
    label,
    isSelectable,
    isSelected,
    onSelect,
    isPrimary,
}: {
    label: string;
    isSelectable?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    isPrimary?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            {isSelectable ? (
                <Checkbox checked={isSelected} onCheckedChange={onSelect} />
            ) : null}
            <span>{label}</span>
            {isPrimary ? <StarIcon className="size-3 text-yellow-400" /> : null}
        </div>
    );
}

function EditorComponent() {
    const { projectId, namespaceId } = Route.useParams();
    const { organization } = useOrganization();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

    const [isCreateKeyDialogOpen, setIsCreateKeyDialogOpen] = useState(false);
    const [isDeleteKeyDialogOpen, setIsDeleteKeyDialogOpen] = useState(false);

    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    const project = useQuery(
        api.projects.getProject,
        workspace
            ? {
                projectId: projectId as Id<'projects'>,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const namespace = useQuery(
        api.namespaces.getNamespace,
        workspace && project
            ? {
                namespaceId: namespaceId as Id<'namespaces'>,
                projectId: project._id,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const languages = useQuery(
        api.languages.getLanguages,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const {
        results: translationKeys,
        loadMore,
        status: translationKeysStatus,
    } = usePaginatedQuery(
        api.translationKeys.getTranslationKeys,
        workspace && project && namespace
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                namespaceId: namespace._id,
                search: search ? search.trim() : undefined,
            }
            : 'skip',
        { initialNumItems: 50 }
    );

    const fetchMoreOnBottomReached = useCallback(
        (containerRefElement?: HTMLDivElement | null) => {
            if (containerRefElement) {
                const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
                // Once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
                if (
                    scrollHeight - scrollTop - clientHeight < 500 &&
                    translationKeysStatus === 'CanLoadMore'
                ) {
                    loadMore(50);
                }
            }
        },
        [loadMore, translationKeysStatus]
    );

    const updateTranslationKey = useMutation(api.translationKeys.updateTranslationKey);
    const triggerBatchTranslation = useMutation(api.translationKeys.triggerBatchTranslation);

    const splittedLanguages = useMemo(() => {
        if (!languages || !project) return [];

        const primaryLanguage = languages.find((l) => l._id === project.primaryLanguageId);
        const others = languages.filter((l) => l._id !== project.primaryLanguageId);

        if (!primaryLanguage) {
            return others;
        }

        return [primaryLanguage, ...others];
    }, [languages]);

    const handleCellUpdate = useCallback(
        async (keyId: Id<'translationKeys'>, languageId: Id<'languages'>, newValue: string) => {
            if (!workspace || !project || !namespace) return;

            try {
                await updateTranslationKey({
                    keyId,
                    workspaceId: workspace._id,
                    projectId: project._id,
                    namespaceId: namespace._id,
                    languageId,
                    value: newValue,
                });
            } catch (error) {
                toastManager.add({
                    description: `Failed to update translation key: ${error}`,
                    type: 'error',
                })
            }
        },
        [workspace, project, namespace]
    );

    // Toggle column selection
    const toggleColumnSelection = useCallback((columnId: string) => {
        setSelectedColumns((prev) => {
            const next = new Set(prev);
            if (next.has(columnId)) {
                next.delete(columnId);
            } else {
                next.add(columnId);
            }
            return next;
        });
    }, []);

    const deleteSelectedRows = useCallback(async () => {
        if (!workspace || !project || !namespace) return;

        setIsDeleteKeyDialogOpen(true);
    }, [rowSelection, workspace, project, namespace]);

    const syncSelectedRows = useCallback(async () => {
        const selectedLanguagesIds = Array.from(selectedColumns);
        const selectedKeysIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

        if (!workspace || !project || !namespace) return;

        try {
            await triggerBatchTranslation({
                workspaceId: workspace._id,
                projectId: project._id,
                namespaceId: namespace._id,
                keyIds: selectedKeysIds as Id<'translationKeys'>[],
                targetLanguageIds: selectedLanguagesIds as Id<'languages'>[],
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to sync translation keys: ${error}`,
                type: 'error',
            })
        } finally {
            setSelectedColumns(new Set());
            setRowSelection({});
        }
    }, [selectedColumns, rowSelection, workspace, project, namespace]);

    const handleCreateKey = () => {
        setIsCreateKeyDialogOpen(true);
    };

    const columns = useMemo<ColumnDef<Doc<'translationKeys'>, string>[]>(() => {
        return [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            table.getIsSomePageRowsSelected()
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                ),
                size: 40,
                enablePinning: true,
            } as ColumnDef<Doc<'translationKeys'>, string>,
            columnHelper.accessor('key', {
                id: 'key',
                header: () => (
                    <SelectableColumnHeader label='Keys' />
                ),
                cell: (info) => (
                    <EditableCell
                        value={info.getValue()}
                        isKey
                    />
                ),
                size: 200,
            }),
            ...splittedLanguages.map((lang) =>
                columnHelper.accessor((row) => row.values[lang._id] || '', {
                    id: lang._id,
                    header: () => (
                        <SelectableColumnHeader
                            label={`${lang.languageCode.toUpperCase()}`}
                            isSelectable
                            isSelected={selectedColumns.has(lang._id)}
                            onSelect={() => toggleColumnSelection(lang._id)}
                            isPrimary={lang._id === project?.primaryLanguageId}
                        />
                    ),
                    cell: (info) => (
                        <EditableCell
                            value={info.getValue()}
                            onSave={(newValue) =>
                                handleCellUpdate(info.row.original._id, lang._id, newValue)
                            }
                            status={
                                info.row.original.status === 2 || lang.status === 2 ? 2 : 1
                            }
                        />
                    ),
                    size: 250,
                })
            ),
        ];
    }, [splittedLanguages, handleCellUpdate, selectedColumns, toggleColumnSelection]);

    const table = useReactTable({
        data: translationKeys,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            rowSelection,
        },
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getRowId: (row) => row._id,
        defaultColumn: {
            minSize: 40,
            maxSize: 500,
        },
    });

    const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;
    const selectedKeys = Object.keys(rowSelection).filter((id) => rowSelection[id]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearch = useCallback(
        debounce((value: string) => setSearch(value), { wait: 500 }),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSetSearch(e.target.value);
    };

    if (!workspace || !project || !namespace || !languages) {
        return (
            <SidebarProvider>
                <ProjectSidebar activeItem="namespaces" projectId={projectId} />
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                        </div>
                        <GlobalSearchDialog workspaceId={workspace?._id} projectId={project?._id} />
                    </header>
                    <div className="flex items-center justify-center h-full">
                        <Spinner />
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    if (workspace && project && namespace && languages && (languages.length === 0 || !project.primaryLanguageId)) {
        return (
            <SidebarProvider>
                <ProjectSidebar activeItem="namespaces" projectId={projectId} />
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                        </div>
                        <GlobalSearchDialog workspaceId={workspace._id} projectId={project._id} />
                    </header>
                    <div className="flex items-center justify-center h-full">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <LanguagesIcon />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {languages.length === 0 ? 'No languages' : 'No primary language'}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {
                                        languages.length === 0 ?
                                            'Create a language to get started.' :
                                            'Set a language to get started.'
                                    }
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            navigate({
                                                to: '/projects/$projectId/languages',
                                                params: {
                                                    projectId: project._id,
                                                },
                                            })
                                        }}
                                    >
                                        {languages.length === 0 ? 'Create language' : 'Set primary language'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        render={<a href="https://docs.unlingo.com" target="_blank" />}
                                    >
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem="namespaces" projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog workspaceId={workspace._id} projectId={project._id} />
                </header>
                <div className="flex flex-col gap-4 p-4 pt-0 max-w-full flex-1">
                    <div className="flex items-center">
                        <div>
                            <h1>{namespace.name} • {namespace.currentUsage.translationKeys} keys</h1>
                            <span className="text-xs text-muted-foreground">
                                Click on any cell to edit. Press Enter to save, Escape to cancel.
                            </span>
                        </div>
                        <div className="flex items-center ml-auto gap-2">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search namespaces"
                                    type="search"
                                    onChange={handleSearchChange}
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <Button onClick={handleCreateKey}>
                                <PlusIcon />
                                Add Key
                            </Button>
                            {selectedRowCount > 0 ? (
                                <Menu>
                                    <MenuTrigger
                                        render={
                                            <Button variant="outline">
                                                Actions
                                                <ChevronDownIcon className="size-4" />
                                            </Button>
                                        }
                                    />
                                    <MenuPopup>
                                        <MenuGroup>
                                            {selectedRowCount > 0 && (
                                                <>
                                                    <MenuItem
                                                        onClick={syncSelectedRows}
                                                    >
                                                        Sync Values
                                                    </MenuItem>
                                                    <MenuItem
                                                        variant="destructive"
                                                        onClick={deleteSelectedRows}
                                                    >
                                                        Delete Values
                                                    </MenuItem>
                                                </>
                                            )}
                                        </MenuGroup>
                                    </MenuPopup>
                                </Menu>
                            ) : null}
                        </div>
                    </div>
                    <div className='h-full'>
                        <AutoSizer>
                            {({ width, height }) => (
                                <div
                                    className='overflow-auto relative'
                                    onScroll={e => fetchMoreOnBottomReached(e.currentTarget)}
                                    style={{
                                        width: width + 'px',
                                        height: height + 'px',
                                    }}
                                >
                                    <table style={{
                                        width: table.getTotalSize() + 'px',
                                    }}>
                                        <thead className="sticky top-0 z-20">
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => {
                                                        const { ...style } = getCommonPinningStyles(
                                                            header.column
                                                        );
                                                        return (
                                                            <th
                                                                key={header.id}
                                                                style={style}
                                                                className="px-4 py-2 border-b border-r text-xs font-bold uppercase tracking-wider whitespace-nowrap bg-zinc-900"
                                                            >
                                                                {header.isPlaceholder
                                                                    ? null
                                                                    : flexRender(
                                                                        header.column.columnDef.header,
                                                                        header.getContext()
                                                                    )}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody>
                                            {table.getRowModel().rows.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    data-selected={row.getIsSelected()}
                                                    className='border-b'
                                                >
                                                    {row.getVisibleCells().map((cell) => {
                                                        const { ...style } = getCommonPinningStyles(
                                                            cell.column
                                                        );
                                                        return (
                                                            <td
                                                                key={cell.id}
                                                                style={style}
                                                                className="px-4 py-2 border-r whitespace-nowrap bg-background hover:bg-muted"
                                                            >
                                                                {flexRender(
                                                                    cell.column.columnDef.cell,
                                                                    cell.getContext()
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {translationKeysStatus === 'LoadingMore' && (
                                        <div className="flex justify-center py-4">
                                            <Spinner />
                                        </div>
                                    )}
                                </div>
                            )}
                        </AutoSizer>
                    </div>
                </div>
                {workspace && project && namespace ? (
                    <>
                        <TranslationKeyCreateDialog
                            isOpen={isCreateKeyDialogOpen}
                            setIsOpen={setIsCreateKeyDialogOpen}
                            workspace={workspace}
                            project={project}
                            namespace={namespace}
                        />
                        <TranslationKeyDeleteDialog
                            isOpen={isDeleteKeyDialogOpen}
                            setIsOpen={setIsDeleteKeyDialogOpen}
                            workspace={workspace}
                            project={project}
                            namespace={namespace}
                            translationKeys={selectedKeys as Id<'translationKeys'>[]}
                            onDeleted={() => {
                                setRowSelection({});
                            }}
                        />
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    );
}
