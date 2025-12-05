import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    LanguagesIcon,
    PlusIcon,
    SearchIcon,
    SparklesIcon,
    TrashIcon,
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

export const Route = createFileRoute(
    '/_auth/projects/$projectId/namespaces/$namespaceId/versions/$versionId/editor'
)({
    component: EditorComponent,
});

// --- Types ---
type TranslationRow = {
    id: string;
    key: string;
    values: Record<string, string>;
};

type Language = {
    code: string;
    name: string;
    isPrimary: boolean;
};

// --- Dummy Data ---
const DUMMY_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', isPrimary: true },
    { code: 'fr', name: 'French', isPrimary: false },
    { code: 'de', name: 'German', isPrimary: false },
    { code: 'es', name: 'Spanish', isPrimary: false },
    { code: 'it', name: 'Italian', isPrimary: false },
    { code: 'pt', name: 'Portuguese', isPrimary: false },
    { code: 'nl', name: 'Dutch', isPrimary: false },
    { code: 'pl', name: 'Polish', isPrimary: false },
    { code: 'ru', name: 'Russian', isPrimary: false },
    { code: 'ja', name: 'Japanese', isPrimary: false },
    { code: 'ko', name: 'Korean', isPrimary: false },
    { code: 'zh', name: 'Chinese', isPrimary: false },
    { code: 'ar', name: 'Arabic', isPrimary: false },
    { code: 'hi', name: 'Hindi', isPrimary: false },
    { code: 'tr', name: 'Turkish', isPrimary: false },
    { code: 'vi', name: 'Vietnamese', isPrimary: false },
    { code: 'th', name: 'Thai', isPrimary: false },
    { code: 'sv', name: 'Swedish', isPrimary: false },
    { code: 'no', name: 'Norwegian', isPrimary: false },
    { code: 'da', name: 'Danish', isPrimary: false },
    { code: 'fi', name: 'Finnish', isPrimary: false },
    { code: 'cs', name: 'Czech', isPrimary: false },
    { code: 'sk', name: 'Slovak', isPrimary: false },
    { code: 'hu', name: 'Hungarian', isPrimary: false },
    { code: 'ro', name: 'Romanian', isPrimary: false },
    { code: 'bg', name: 'Bulgarian', isPrimary: false },
    { code: 'uk', name: 'Ukrainian', isPrimary: false },
    { code: 'el', name: 'Greek', isPrimary: false },
    { code: 'he', name: 'Hebrew', isPrimary: false },
    { code: 'id', name: 'Indonesian', isPrimary: false },
];

const generateDummyData = (count: number): TranslationRow[] => {
    const keys = [
        'common.welcome',
        'common.goodbye',
        'common.yes',
        'common.no',
        'common.cancel',
        'common.confirm',
        'common.save',
        'common.delete',
        'common.edit',
        'common.create',
        'auth.login',
        'auth.logout',
        'auth.register',
        'auth.forgotPassword',
        'auth.resetPassword',
        'errors.notFound',
        'errors.serverError',
        'errors.unauthorized',
        'errors.forbidden',
        'errors.validation',
        'dashboard.title',
        'dashboard.overview',
        'dashboard.stats',
        'settings.general',
        'settings.profile',
        'settings.notifications',
        'settings.privacy',
        'settings.security',
        'navigation.home',
        'navigation.about',
    ];

    const translations: Record<string, Record<string, string>> = {
        'common.welcome': {
            en: 'Welcome',
            fr: 'Bienvenue',
            de: 'Willkommen',
            es: 'Bienvenido',
            it: 'Benvenuto',
        },
        'common.goodbye': {
            en: 'Goodbye',
            fr: 'Au revoir',
            de: 'Auf Wiedersehen',
            es: 'Adios',
            it: 'Arrivederci',
        },
        'common.yes': { en: 'Yes', fr: 'Oui', de: 'Ja', es: 'Si', it: 'Si' },
        'common.no': { en: 'No', fr: 'Non', de: 'Nein', es: 'No', it: 'No' },
        'common.cancel': {
            en: 'Cancel',
            fr: 'Annuler',
            de: 'Abbrechen',
            es: 'Cancelar',
            it: 'Annulla',
        },
        'common.confirm': {
            en: 'Confirm',
            fr: 'Confirmer',
            de: 'Bestatigen',
            es: 'Confirmar',
            it: 'Conferma',
        },
        'common.save': {
            en: 'Save',
            fr: 'Enregistrer',
            de: 'Speichern',
            es: 'Guardar',
            it: 'Salva',
        },
        'common.delete': {
            en: 'Delete',
            fr: 'Supprimer',
            de: 'Loschen',
            es: 'Eliminar',
            it: 'Elimina',
        },
        'common.edit': {
            en: 'Edit',
            fr: 'Modifier',
            de: 'Bearbeiten',
            es: 'Editar',
            it: 'Modifica',
        },
        'common.create': {
            en: 'Create',
            fr: 'Creer',
            de: 'Erstellen',
            es: 'Crear',
            it: 'Crea',
        },
        'auth.login': {
            en: 'Login',
            fr: 'Connexion',
            de: 'Anmelden',
            es: 'Iniciar sesion',
            it: 'Accedi',
        },
        'auth.logout': {
            en: 'Logout',
            fr: 'Deconnexion',
            de: 'Abmelden',
            es: 'Cerrar sesion',
            it: 'Esci',
        },
        'auth.register': {
            en: 'Register',
            fr: "S'inscrire",
            de: 'Registrieren',
            es: 'Registrarse',
            it: 'Registrati',
        },
        'auth.forgotPassword': {
            en: 'Forgot Password',
            fr: 'Mot de passe oublie',
            de: 'Passwort vergessen',
            es: 'Olvidaste tu contrasena',
            it: 'Password dimenticata',
        },
        'auth.resetPassword': {
            en: 'Reset Password',
            fr: 'Reinitialiser le mot de passe',
            de: 'Passwort zurucksetzen',
            es: 'Restablecer contrasena',
            it: 'Reimposta password',
        },
    };

    return keys.slice(0, count).map((key, index) => ({
        id: `row-${index}`,
        key,
        values: translations[key] || { en: key },
    }));
};

const ITEMS_PER_PAGE = 10;
const TOTAL_ITEMS = 30;

const columnHelper = createColumnHelper<TranslationRow>();

// --- CSS Helper for Sticky Columns ---
function getCommonPinningStyles(column: Column<TranslationRow>): CSSProperties & { key?: string } {
    const isPinned = column.getIsPinned();

    if (!isPinned) return { key: column.id };

    return {
        key: column.id,
        position: 'sticky',
        left: `${column.getStart('left')}px`,
        zIndex: 10,
        backgroundColor: 'inherit',
        width: column.getSize(),
        boxShadow:
            column.id === 'primary_lang' ? '4px 0 4px -2px rgba(0,0,0,0.1)' : undefined,
    };
}

// --- Editable Cell Component ---
function EditableCell({
    value,
    onSave,
    isKey = false,
    isPrimary = false,
}: {
    value: string;
    onSave: (newValue: string) => void;
    isKey?: boolean;
    isPrimary?: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSave(editValue);
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    onSave(editValue);
                    setIsEditing(false);
                }}
                autoFocus
                className="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-primary"
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer truncate text-sm ${
                isKey
                    ? 'font-mono font-semibold text-gray-700'
                    : isPrimary
                      ? 'font-medium text-gray-900'
                      : 'text-gray-600'
            }`}
        >
            {value || <span className="text-gray-300 italic">Empty</span>}
        </div>
    );
}

// --- Column Header with Selection ---
function SelectableColumnHeader({
    column,
    label,
    isSelectable,
    isSelected,
    onSelect,
}: {
    column: Column<TranslationRow>;
    label: string;
    isSelectable: boolean;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            {isSelectable && (
                <Checkbox checked={isSelected} onCheckedChange={onSelect} />
            )}
            <span>{label}</span>
        </div>
    );
}

function EditorComponent() {
    const { projectId, namespaceId, versionId } = Route.useParams();
    const { organization } = useOrganization();

    const [search, setSearch] = useState('');
    const [pageIndex, setPageIndex] = useState(0);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
    const [data, setData] = useState<TranslationRow[]>(() => generateDummyData(TOTAL_ITEMS));
    const [languages, setLanguages] = useState<Language[]>(DUMMY_LANGUAGES);

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

    const namespaceVersion = useQuery(
        api.namespaceVersions.getNamespaceVersion,
        workspace
            ? {
                  namespaceVersionId: versionId as Id<'namespaceVersions'>,
                  workspaceId: workspace._id,
              }
            : 'skip'
    );

    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!search) return data;
        return data.filter(
            (row) =>
                row.key.toLowerCase().includes(search.toLowerCase()) ||
                Object.values(row.values).some((v) =>
                    v.toLowerCase().includes(search.toLowerCase())
                )
        );
    }, [data, search]);

    // Paginate data
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = pageIndex * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, pageIndex]);

    // Handle cell update
    const handleCellUpdate = useCallback(
        (rowId: string, field: string, newValue: string) => {
            setData((prev) =>
                prev.map((row) => {
                    if (row.id !== rowId) return row;
                    if (field === 'key') {
                        return { ...row, key: newValue };
                    }
                    return {
                        ...row,
                        values: { ...row.values, [field]: newValue },
                    };
                })
            );
        },
        []
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

    // Delete selected rows
    const deleteSelectedRows = useCallback(() => {
        const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
        setData((prev) => prev.filter((row) => !selectedIds.includes(row.id)));
        setRowSelection({});
    }, [rowSelection]);

    // Delete selected columns (languages)
    const deleteSelectedColumns = useCallback(() => {
        const columnsToDelete = Array.from(selectedColumns);
        setLanguages((prev) => prev.filter((lang) => !columnsToDelete.includes(lang.code)));
        setData((prev) =>
            prev.map((row) => {
                const newValues = { ...row.values };
                columnsToDelete.forEach((col) => delete newValues[col]);
                return { ...row, values: newValues };
            })
        );
        setSelectedColumns(new Set());
    }, [selectedColumns]);

    // Add new key
    const addNewKey = useCallback(() => {
        const newKey: TranslationRow = {
            id: `row-${Date.now()}`,
            key: 'new.key',
            values: languages.reduce(
                (acc, lang) => {
                    acc[lang.code] = '';
                    return acc;
                },
                {} as Record<string, string>
            ),
        };
        setData((prev) => [...prev, newKey]);
    }, [languages]);

    // Add new language
    const addNewLanguage = useCallback(() => {
        const newLangCode = prompt('Enter language code (e.g., "pt", "ru"):');
        if (!newLangCode) return;

        const newLangName = prompt('Enter language name (e.g., "Portuguese"):');
        if (!newLangName) return;

        if (languages.some((l) => l.code === newLangCode)) {
            alert('Language already exists');
            return;
        }

        setLanguages((prev) => [...prev, { code: newLangCode, name: newLangName, isPrimary: false }]);
        setData((prev) =>
            prev.map((row) => ({
                ...row,
                values: { ...row.values, [newLangCode]: '' },
            }))
        );
    }, [languages]);

    // Define columns dynamically
    const columns = useMemo<ColumnDef<TranslationRow, string>[]>(() => {
        const primaryLang = languages.find((l) => l.isPrimary) || languages[0];
        const otherLangs = languages.filter((l) => l.code !== primaryLang?.code);

        return [
            // Selection column
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
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
            } as ColumnDef<TranslationRow, string>,
            // Key column (pinned)
            columnHelper.accessor('key', {
                id: 'key',
                header: 'Key',
                cell: (info) => (
                    <EditableCell
                        value={info.getValue()}
                        onSave={(newValue) =>
                            handleCellUpdate(info.row.original.id, 'key', newValue)
                        }
                        isKey
                    />
                ),
                size: 200,
            }),
            // Primary language column (pinned)
            ...(primaryLang
                ? [
                      columnHelper.accessor((row) => row.values[primaryLang.code] || '', {
                          id: 'primary_lang',
                          header: `${primaryLang.name} (${primaryLang.code.toUpperCase()})`,
                          cell: (info) => (
                              <EditableCell
                                  value={info.getValue()}
                                  onSave={(newValue) =>
                                      handleCellUpdate(
                                          info.row.original.id,
                                          primaryLang.code,
                                          newValue
                                      )
                                  }
                                  isPrimary
                              />
                          ),
                          size: 250,
                      }),
                  ]
                : []),
            // Other language columns (scrollable)
            ...otherLangs.map((lang) =>
                columnHelper.accessor((row) => row.values[lang.code] || '', {
                    id: lang.code,
                    header: () => (
                        <SelectableColumnHeader
                            column={{} as Column<TranslationRow>}
                            label={`${lang.name} (${lang.code.toUpperCase()})`}
                            isSelectable
                            isSelected={selectedColumns.has(lang.code)}
                            onSelect={() => toggleColumnSelection(lang.code)}
                        />
                    ),
                    cell: (info) => (
                        <EditableCell
                            value={info.getValue()}
                            onSave={(newValue) =>
                                handleCellUpdate(info.row.original.id, lang.code, newValue)
                            }
                        />
                    ),
                    size: 250,
                })
            ),
        ];
    }, [languages, handleCellUpdate, selectedColumns, toggleColumnSelection]);

    // Initialize table
    const table = useReactTable({
        data: paginatedData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            columnPinning: {
                left: ['select', 'key', 'primary_lang'],
            },
            rowSelection,
        },
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getRowId: (row) => row.id,
        defaultColumn: {
            minSize: 150,
            maxSize: 500,
        },
    });

    const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;
    const selectedColumnCount = selectedColumns.size;

    if (!workspace || !project || !namespace) {
        return (
            <SidebarProvider>
                <ProjectSidebar activeItem="namespaces" />
                <SidebarInset>
                    <div className="flex items-center justify-center h-full">
                        <Spinner />
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem="namespaces" />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <div className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-background">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/projects/$projectId"
                                params={{ projectId }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeftIcon className="size-5" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-semibold">
                                    {namespace.name} - {namespaceVersion?.version || 'Loading...'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {filteredData.length} keys | {languages.length} languages
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search keys or translations..."
                                    type="search"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPageIndex(0);
                                    }}
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={addNewKey}>
                                <PlusIcon className="size-4" />
                                Add Key
                            </Button>
                            <Button variant="outline" size="sm" onClick={addNewLanguage}>
                                <LanguagesIcon className="size-4" />
                                Add Language
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            {(selectedRowCount > 0 || selectedColumnCount > 0) && (
                                <>
                                    <span className="text-sm text-muted-foreground">
                                        {selectedRowCount > 0 && `${selectedRowCount} rows`}
                                        {selectedRowCount > 0 && selectedColumnCount > 0 && ', '}
                                        {selectedColumnCount > 0 && `${selectedColumnCount} columns`}
                                        {' selected'}
                                    </span>
                                    <Menu>
                                        <MenuTrigger
                                            render={
                                                <Button variant="outline" size="sm">
                                                    Actions
                                                    <ChevronDownIcon className="size-4" />
                                                </Button>
                                            }
                                        />
                                        <MenuPopup>
                                            <MenuGroup>
                                                <MenuItem
                                                    onClick={() => {
                                                        alert('AI Translation coming soon!');
                                                    }}
                                                >
                                                    <SparklesIcon className="size-4" />
                                                    Translate with AI
                                                </MenuItem>
                                                {selectedRowCount > 0 && (
                                                    <MenuItem
                                                        variant="destructive"
                                                        onClick={deleteSelectedRows}
                                                    >
                                                        <TrashIcon className="size-4" />
                                                        Delete Selected Rows
                                                    </MenuItem>
                                                )}
                                                {selectedColumnCount > 0 && (
                                                    <MenuItem
                                                        variant="destructive"
                                                        onClick={deleteSelectedColumns}
                                                    >
                                                        <TrashIcon className="size-4" />
                                                        Delete Selected Languages
                                                    </MenuItem>
                                                )}
                                            </MenuGroup>
                                        </MenuPopup>
                                    </Menu>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hint */}
                    <div className="px-4 py-1 text-xs text-muted-foreground bg-muted/20 border-b">
                        Click on any cell to edit. Press Enter to save, Escape to cancel.
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto relative">
                        <table className="w-full border-collapse text-left">
                            <thead className="bg-muted/50 sticky top-0 z-20">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            const { key, ...style } = getCommonPinningStyles(
                                                header.column
                                            );
                                            return (
                                                <th
                                                    key={key}
                                                    style={style}
                                                    className="px-4 py-3 border-b border-r text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-muted/50"
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
                            <tbody className="divide-y divide-border">
                                {table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-muted/30 transition-colors"
                                        data-selected={row.getIsSelected()}
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const { key, ...style } = getCommonPinningStyles(
                                                cell.column
                                            );
                                            return (
                                                <td
                                                    key={key}
                                                    style={style}
                                                    className="px-4 py-2 border-r whitespace-nowrap bg-background"
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

                        {/* Empty State */}
                        {paginatedData.length === 0 && (
                            <div className="p-10 text-center text-muted-foreground">
                                No keys found matching your search.
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
                        <span className="text-sm text-muted-foreground">
                            Showing {pageIndex * ITEMS_PER_PAGE + 1} to{' '}
                            {Math.min((pageIndex + 1) * ITEMS_PER_PAGE, filteredData.length)} of{' '}
                            {filteredData.length} keys
                        </span>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                                        aria-disabled={pageIndex === 0}
                                        className={pageIndex === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink
                                            isActive={i === pageIndex}
                                            onClick={() => setPageIndex(i)}
                                            className="cursor-pointer"
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() =>
                                            setPageIndex((p) => Math.min(totalPages - 1, p + 1))
                                        }
                                        aria-disabled={pageIndex >= totalPages - 1}
                                        className={pageIndex >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
