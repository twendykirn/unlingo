import { Label } from '@/components/ui/field';
import { Loader } from '@/components/ui/loader';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { usePaginatedQuery } from 'convex/react';
import { useEffect } from 'react';

interface Props {
    workspace?: Doc<'workspaces'>;
    namespace?: Doc<'namespaces'>;
    selectedEnvironment: Doc<'namespaceVersions'> | null;
    defaultEnvironment?: Doc<'namespaceVersions'>;
    setSelectedEnvironment: (environmentId: Doc<'namespaceVersions'> | null) => void;
    label?: string;
    isPreSelectLonelyItem?: boolean;
}

const EnvironmentSelector = ({
    workspace,
    namespace,
    defaultEnvironment,
    selectedEnvironment,
    setSelectedEnvironment,
    label,
    isPreSelectLonelyItem,
}: Props) => {
    const { results: environments, status } = usePaginatedQuery(
        api.namespaceVersions.getNamespaceVersions,
        workspace && namespace
            ? {
                  namespaceId: namespace._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 50 }
    );

    useEffect(() => {
        if (environments?.length === 1) {
            if (isPreSelectLonelyItem && environments[0]) {
                setSelectedEnvironment(environments[0]);
            }
        } else if (environments?.length === 2) {
            const devEnv = environments.find(env => env.version === 'development');

            if (devEnv) {
                setSelectedEnvironment(devEnv);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [environments, isPreSelectLonelyItem]);

    if (status === 'LoadingFirstPage' || status === 'LoadingMore') {
        <Loader />;
    }

    return (
        <Select
            value={selectedEnvironment?._id}
            aria-label='environments-selector'
            placeholder='env'
            isDisabled={!workspace || !namespace}
            onChange={value => {
                if (value) {
                    const environment = environments?.find(env => env._id === value);
                    if (environment?._id === selectedEnvironment?._id) return;
                    setSelectedEnvironment(environment ?? null);
                }
            }}
            defaultValue={defaultEnvironment?._id}>
            <Label>{label}</Label>
            <SelectTrigger />
            <SelectContent items={environments}>
                {item => (
                    <SelectItem id={item._id} textValue={item.version}>
                        {item.version}
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
};

export default EnvironmentSelector;
