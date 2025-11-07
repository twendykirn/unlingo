import { Label } from '@/components/ui/field';
import { Loader } from '@/components/ui/loader';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { usePaginatedQuery } from 'convex/react';
import { useEffect } from 'react';

interface Props {
    workspace: Doc<'workspaces'>;
    selectedProjectId: Id<'projects'> | null;
    defaultProjectId: Id<'projects'> | undefined;
    setSelectedProjectId: (projectId: Id<'projects'> | null) => void;
    label?: string;
    isPreSelectLonelyItem?: boolean;
}

const ProjectsSelector = ({
    workspace,
    defaultProjectId,
    selectedProjectId,
    setSelectedProjectId,
    label,
    isPreSelectLonelyItem,
}: Props) => {
    const { results: projects, status } = usePaginatedQuery(
        api.projects.getProjects,
        workspace ? { workspaceId: workspace._id } : 'skip',
        {
            initialNumItems: 30,
        }
    );

    useEffect(() => {
        if (isPreSelectLonelyItem && projects?.length === 1 && projects[0]) {
            setSelectedProjectId(projects[0]._id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects, isPreSelectLonelyItem]);

    if (status === 'LoadingFirstPage' || status === 'LoadingMore') {
        <Loader />;
    }

    return (
        <Select
            value={selectedProjectId}
            aria-label='projects-selector'
            placeholder='Select project'
            onChange={value => {
                if (value) {
                    setSelectedProjectId(value as Id<'projects'>);
                }
            }}
            defaultValue={defaultProjectId}>
            <Label>{label}</Label>
            <SelectTrigger />
            <SelectContent items={projects}>
                {item => (
                    <SelectItem id={item._id} textValue={item.name}>
                        {item.name}
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
};

export default ProjectsSelector;
