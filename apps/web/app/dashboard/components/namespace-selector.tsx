import { Loader } from '@/components/ui/loader';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { usePaginatedQuery } from 'convex/react';
import { useEffect } from 'react';

interface Props {
    workspace?: Doc<'workspaces'>;
    project?: Doc<'projects'>;
    selectedNamespace: Doc<'namespaces'> | null;
    defaultNamespace?: Doc<'namespaces'>;
    setSelectedNamespace: (namespaceId: Doc<'namespaces'> | null) => void;
    label?: string;
    isPreSelectLonelyItem?: boolean;
}

const NamespaceSelector = ({
    workspace,
    project,
    defaultNamespace,
    selectedNamespace,
    setSelectedNamespace,
    label,
    isPreSelectLonelyItem,
}: Props) => {
    const { results: namespaces, status } = usePaginatedQuery(
        api.namespaces.getNamespaces,
        workspace && project
            ? {
                  projectId: project._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 50 }
    );

    useEffect(() => {
        if (isPreSelectLonelyItem && namespaces?.length === 1 && namespaces[0]) {
            setSelectedNamespace(namespaces[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [namespaces, isPreSelectLonelyItem]);

    if (status === 'LoadingFirstPage' || status === 'LoadingMore') {
        <Loader />;
    }

    return (
        <Select
            selectedKey={selectedNamespace?._id}
            aria-label='namespaces-selector'
            placeholder='namespace'
            label={label}
            isDisabled={!workspace || !project}
            onSelectionChange={value => {
                if (value) {
                    const namespace = namespaces?.find(ns => ns._id === value);
                    if (namespace?._id === selectedNamespace?._id) return;
                    setSelectedNamespace(namespace ?? null);
                }
            }}
            defaultSelectedKey={defaultNamespace?._id}>
            <SelectTrigger />
            <SelectContent items={namespaces}>
                {item => (
                    <SelectItem id={item._id} textValue={item.name}>
                        {item.name}
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
};

export default NamespaceSelector;
