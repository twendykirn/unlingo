import ApiKeyCreateDialog from '@/components/api-key-create-dialog';
import ApiKeyDeleteDialog from '@/components/api-key-delete-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toastManager } from '@/components/ui/toast';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate, formatTimeAgo } from '@/utils/time';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { BookIcon, EllipsisVerticalIcon, KeyRoundIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const formatKeyDisplay = (key: string) => {
    if (!key) return '';
    const parts = key.split('_');
    if (parts.length < 2) return 'Invalid Key';
    const prefix = parts[0];
    return `${prefix}_${'*'.repeat(20)}`;
};

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: number;
    permissions: string[];
}

export const Route = createFileRoute('/_auth/projects/$projectId/api-keys')({
    component: RouteComponent,
})

function RouteComponent() {
    const { projectId } = Route.useParams();
    const { organization } = useOrganization();

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
    const [search, setSearch] = useState('');

    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    const project = useQuery(
        api.projects.getProject,
        workspace && projectId
            ? {
                projectId: projectId as Id<'projects'>,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const filteredApiKeys = useMemo(() => {
        if (!apiKeys) return [];

        return apiKeys.filter(item => {
            return item.name.toLowerCase().includes(search.toLowerCase());
        });
    }, [apiKeys, search]);

    const fetchApiKeys = async () => {
        if (!workspace || !project) return;

        setIsLoading(true);
        try {

            const response = await fetch(`/api/api-keys/${workspace._id}/${project._id}`);

            if (!response.ok) {
                throw new Error('Bad response');
            }

            const data = await response.json();

            setApiKeys(data.keys || []);
        } catch (error) {
            toastManager.add({
                description: `Failed to fetch API keys: ${error}`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApiKeys();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace, project]);

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='api-keys' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>API Keys</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search namespaces"
                                    type="search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <Button
                                onClick={() => setIsCreateDialogOpen(true)}
                                disabled={isLoading || apiKeys.length === 50}
                            >
                                {isLoading ? <Spinner /> : 'Create key'}
                            </Button>
                        </div>
                    </div>
                    {project === undefined || workspace === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : filteredApiKeys.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <KeyRoundIcon />
                                </EmptyMedia>
                                <EmptyTitle>No keys</EmptyTitle>
                                <EmptyDescription>Create a key to get started.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                        disabled={isLoading || apiKeys.length === 50}
                                    >
                                        Create key
                                    </Button>
                                    <Button size="sm" variant="outline" render={<a href="https://docs.unlingo.com" target="_blank" />}>
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <Card>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Key</TableHead>
                                            <TableHead>Permissions</TableHead>
                                            <TableHead>Created At</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApiKeys.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    {formatKeyDisplay(item.prefix)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className='flex flex-wrap gap-2'>
                                                        {item.permissions.map(permission =>
                                                            <Badge key={permission} variant='outline'>{permission}</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger render={<span className="text-sm text-gray-500 mt-2" />}>
                                                            {formatTimeAgo(item.createdAt)}
                                                        </TooltipTrigger>
                                                        <TooltipPopup>{formatDate(item.createdAt)}</TooltipPopup>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Menu>
                                                        <MenuTrigger render={<Button variant="ghost" size="icon" />}>
                                                            <EllipsisVerticalIcon />
                                                        </MenuTrigger>
                                                        <MenuPopup>
                                                            <MenuItem
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setIsDeleteDialogOpen(true);
                                                                    setSelectedApiKey(item);
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
                            </CardContent>
                        </Card>
                    )}
                </div>
                {workspace && project ? (
                    <>
                        <ApiKeyCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            workspace={workspace}
                            project={project}
                            onCreated={fetchApiKeys}
                        />
                        {selectedApiKey ? (
                            <>
                                <ApiKeyDeleteDialog
                                    isOpen={isDeleteDialogOpen}
                                    setIsOpen={setIsDeleteDialogOpen}
                                    workspace={workspace}
                                    project={project}
                                    apiKey={selectedApiKey}
                                    onDeleted={fetchApiKeys}
                                />
                            </>
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    );
}
