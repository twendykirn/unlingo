import GlobalSearchDialog from '@/components/global-search-dialog';
import GlossaryCreateDialog from '@/components/glossary-create-dialog';
import GlossaryDeleteDialog from '@/components/glossary-delete-dialog';
import GlossaryEditDialog from '@/components/glossary-edit-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toggle, ToggleGroup, ToggleGroupSeparator } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router'
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { BookIcon, BookOpenIcon, Edit, EllipsisVerticalIcon, LayoutGridIcon, SearchIcon, TableIcon, TrashIcon, AlertTriangleIcon, ShieldOffIcon, CaseSensitiveIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

export const Route = createFileRoute(
    '/_auth/_org/projects/$projectId/glossary',
)({
    component: RouteComponent,
})

function RouteComponent() {
    const { projectId } = Route.useParams();
    const { organization } = useOrganization();

    const [layout, setLayout] = useState<'grid' | 'table'>('table');
    const [search, setSearch] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTerm, setSelectedTerm] = useState<Doc<'glossaryTerms'> | null>(null);

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
        results: glossaryTerms,
        loadMore,
        status: glossaryStatus
    } = usePaginatedQuery(
        api.glossary.getAllTerms,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                search: search || undefined,
            }
            : 'skip',
        { initialNumItems: 40 }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearch = useCallback(
        debounce((value: string) => setSearch(value), { wait: 500 }),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSetSearch(e.target.value);
    };

    const getTermFlags = (term: Doc<'glossaryTerms'>) => {
        const flags = [];
        if (term.isNonTranslatable) {
            flags.push(
                <Badge key="non-translatable" variant="outline" className="text-xs">
                    <ShieldOffIcon className="w-3 h-3 mr-1" />
                    Non-translatable
                </Badge>
            );
        }
        if (term.isCaseSensitive) {
            flags.push(
                <Badge key="case-sensitive" variant="outline" className="text-xs">
                    <CaseSensitiveIcon className="w-3 h-3 mr-1" />
                    Case sensitive
                </Badge>
            );
        }
        if (term.isForbidden) {
            flags.push(
                <Badge key="forbidden" variant="error" className="text-xs">
                    <AlertTriangleIcon className="w-3 h-3 mr-1" />
                    Forbidden
                </Badge>
            );
        }
        return flags;
    };

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='glossary' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog workspaceId={workspace?._id} projectId={project?._id} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Glossary</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <ToggleGroup
                                variant="outline"
                                value={[layout]}
                                onValueChange={(value) => {
                                    setLayout(value[0]);
                                }}
                            >
                                <Toggle aria-label="Toggle layout grid" value="grid">
                                    <LayoutGridIcon />
                                </Toggle>
                                <ToggleGroupSeparator />
                                <Toggle aria-label="Toggle layout table" value="table">
                                    <TableIcon />
                                </Toggle>
                            </ToggleGroup>
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search terms"
                                    type="search"
                                    onChange={handleSearchChange}
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <Button
                                onClick={() => setIsCreateDialogOpen(true)}
                            >
                                Add term
                            </Button>
                        </div>
                    </div>
                    {workspace === undefined || project === undefined || glossaryTerms === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : glossaryTerms.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <BookOpenIcon />
                                </EmptyMedia>
                                <EmptyTitle>No glossary terms</EmptyTitle>
                                <EmptyDescription>Add terms to your glossary to ensure consistent translations.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                    >
                                        Add term
                                    </Button>
                                    <Button size="sm" variant="outline" render={<a href="https://docs.unlingo.com" target="_blank" />}>
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    ) : null}
                    {workspace && project && glossaryTerms && glossaryTerms.length > 0 ? (
                        <>
                            {layout === 'grid' ? (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {glossaryTerms.map(term => (
                                            <Card key={term._id} className="py-4 hover:border-primary/30">
                                                <CardHeader className="px-4 flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h6 className="font-medium">{term.term}</h6>
                                                        {term.description && (
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                                {term.description}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {getTermFlags(term)}
                                                        </div>
                                                    </div>
                                                    <Menu>
                                                        <MenuTrigger render={<Button variant="ghost" size="icon" />} onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}>
                                                            <EllipsisVerticalIcon />
                                                        </MenuTrigger>
                                                        <MenuPopup>
                                                            <MenuGroup>
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        setIsEditDialogOpen(true);
                                                                        setSelectedTerm(term);
                                                                    }}
                                                                >
                                                                    <Edit className="opacity-72" />
                                                                    Edit
                                                                </MenuItem>
                                                            </MenuGroup>
                                                            <MenuSeparator />
                                                            <MenuItem
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setIsDeleteDialogOpen(true);
                                                                    setSelectedTerm(term);
                                                                }}
                                                            >
                                                                <TrashIcon />
                                                                Delete
                                                            </MenuItem>
                                                        </MenuPopup>
                                                    </Menu>
                                                </CardHeader>
                                            </Card>
                                        ))}
                                    </div>
                                    {glossaryStatus === 'CanLoadMore' && (
                                        <div className="flex justify-center mt-4">
                                            <Button variant="outline" onClick={() => loadMore(40)}>
                                                Load more
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : null}
                            {layout === 'table' ? (
                                <Card>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Term</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Flags</TableHead>
                                                    <TableHead>Translations</TableHead>
                                                    <TableHead className="text-right" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {glossaryTerms.map(term => (
                                                    <TableRow key={term._id}>
                                                        <TableCell className="font-medium">{term.term}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate">
                                                            {term.description || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {getTermFlags(term)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {term.isNonTranslatable
                                                                ? <span className="text-muted-foreground">-</span>
                                                                : `${Object.keys(term.translations).length} language(s)`}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Menu>
                                                                <MenuTrigger render={<Button variant="ghost" size="icon" />}>
                                                                    <EllipsisVerticalIcon />
                                                                </MenuTrigger>
                                                                <MenuPopup>
                                                                    <MenuGroup>
                                                                        <MenuItem
                                                                            onClick={() => {
                                                                                setIsEditDialogOpen(true);
                                                                                setSelectedTerm(term);
                                                                            }}
                                                                        >
                                                                            <Edit className="opacity-72" />
                                                                            Edit
                                                                        </MenuItem>
                                                                    </MenuGroup>
                                                                    <MenuSeparator />
                                                                    <MenuItem
                                                                        variant="destructive"
                                                                        onClick={() => {
                                                                            setIsDeleteDialogOpen(true);
                                                                            setSelectedTerm(term);
                                                                        }}
                                                                    >
                                                                        <TrashIcon />
                                                                        Delete
                                                                    </MenuItem>
                                                                </MenuPopup>
                                                            </Menu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {glossaryStatus === 'CanLoadMore' && (
                                            <div className="flex justify-center mt-4">
                                                <Button variant="outline" onClick={() => loadMore(40)}>
                                                    Load more
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : null}
                        </>
                    ) : null}
                </div>
                {workspace && project && languages ? (
                    <>
                        <GlossaryCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            project={project}
                            workspace={workspace}
                            languages={languages}
                        />
                        {selectedTerm ? (
                            <>
                                <GlossaryEditDialog
                                    isOpen={isEditDialogOpen}
                                    setIsOpen={setIsEditDialogOpen}
                                    workspace={workspace}
                                    project={project}
                                    term={selectedTerm}
                                    languages={languages}
                                />
                                <GlossaryDeleteDialog
                                    isOpen={isDeleteDialogOpen}
                                    setIsOpen={setIsDeleteDialogOpen}
                                    workspace={workspace}
                                    term={selectedTerm}
                                />
                            </>
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    )
}
