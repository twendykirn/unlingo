import GlobalSearchDialog from '@/components/global-search-dialog';
import LanguageCreateDialog from '@/components/language-create-dialog';
import LanguageDeleteDialog from '@/components/language-delete-dialog';
import LanguageEditDialog from '@/components/language-edit-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { LANGUAGES } from '@/constants/languages';
import { formatDate, formatTimeAgo } from '@/utils/time';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { BookIcon, Edit, EllipsisVerticalIcon, LanguagesIcon, SearchIcon, StarIcon, TrashIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

export const Route = createFileRoute(
  '/_auth/_org/projects/$projectId/languages',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams();
  const { organization } = useOrganization();

  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Doc<'languages'> | null>(null);

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

  const filteredLanguages = useMemo(() => {
    if (!languages) return [];

    return languages.filter(language => {
      return language.languageCode.toLowerCase().includes(search.toLowerCase());
    });
  }, [languages, search]);


  const availableLanguages = useMemo(() => {
    if (!languages) return [];

    return LANGUAGES.filter(language => {
      return !languages.some(l => l.languageCode === language.id);
    });
  }, [languages]);

  return (
    <SidebarProvider>
      <ProjectSidebar activeItem='languages' projectId={projectId} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
          <GlobalSearchDialog projectId={projectId} />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center">
            <h1>Languages</h1>
            <div className="flex items-center ml-auto gap-2">
              <InputGroup>
                <InputGroupInput
                  aria-label="Search"
                  placeholder="Search projects"
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
                disabled={availableLanguages.length === 0}
              >
                Create language
              </Button>
            </div>
          </div>
          {languages === undefined || workspace === undefined ? (
            <div className="flex items-center justify-center w-full mt-4">
              <Spinner />
            </div>
          ) : filteredLanguages.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LanguagesIcon />
                </EmptyMedia>
                <EmptyTitle>No languages</EmptyTitle>
                <EmptyDescription>Create a language to get started.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={availableLanguages.length === 0}
                  >
                    Create language
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
                      <TableHead>Status</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLanguages.map((language) => (
                      <TableRow key={language._id}>
                        <TableCell className="font-medium">{language.languageCode}</TableCell>
                        <TableCell>
                          {
                            language.status === 1 ?
                              <Badge variant='success'>Active</Badge> :
                              <Badge variant="warning">Processing</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {
                            language._id === project?.primaryLanguageId ?
                              <StarIcon className='size-4 text-yellow-400' /> :
                              null
                          }
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger render={<span className="text-sm text-gray-500 mt-2" />}>
                              {formatTimeAgo(language._creationTime)}
                            </TooltipTrigger>
                            <TooltipPopup>{formatDate(language._creationTime)}</TooltipPopup>
                          </Tooltip>
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
                                    setSelectedLanguage(language);
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
                                  setSelectedLanguage(language);
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
        {workspace && project && languages ? (
          <>
            <LanguageCreateDialog
              isOpen={isCreateDialogOpen}
              setIsOpen={setIsCreateDialogOpen}
              workspace={workspace}
              project={project}
              availableLanguages={availableLanguages}
              isFirstLanguage={languages.length === 0}
            />
            {selectedLanguage ? (
              <>
                <LanguageEditDialog
                  isOpen={isEditDialogOpen}
                  setIsOpen={setIsEditDialogOpen}
                  workspace={workspace}
                  project={project}
                  language={selectedLanguage}
                  isLastLanguage={languages.length === 1}
                />
                <LanguageDeleteDialog
                  isOpen={isDeleteDialogOpen}
                  setIsOpen={setIsDeleteDialogOpen}
                  workspace={workspace}
                  project={project}
                  language={selectedLanguage}
                />
              </>
            ) : null}
          </>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
