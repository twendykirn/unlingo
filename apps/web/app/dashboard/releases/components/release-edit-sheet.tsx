import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Loader } from '@/components/ui/loader';
import {
    SheetBody,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useConvex, useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import NamespaceSelector from '../../components/namespace-selector';
import EnvironmentSelector from '../../components/environment-selector';
import { IconPlus, IconTrash } from '@intentui/icons';
import { Table } from '@/components/ui/table';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    release: Doc<'releases'>;
}

interface ReleaseNamespaceItem {
    namespace: Doc<'namespaces'>;
    environment: Doc<'namespaceVersions'>;
}

const ReleaseEditSheet = ({ isOpen, setIsOpen, workspace, project, release }: Props) => {
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [namespace, setNamespace] = useState<Doc<'namespaces'> | null>(null);
    const [environment, setEnvironment] = useState<Doc<'namespaceVersions'> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [releaseNamespaces, setReleaseNamespaces] = useState<ReleaseNamespaceItem[]>([]);

    const convex = useConvex();

    const updateRelease = useMutation(api.releases.updateRelease);

    const resetStates = () => {
        setName('');
        setTag('');
        setNamespace(null);
        setEnvironment(null);
        setReleaseNamespaces([]);
    };

    const handleUpdate = async (close: () => void) => {
        if (!releaseNamespaces.length) {
            toast.error('Failed to update release: Add at least one namespace');
            return;
        }

        setIsLoading(true);

        try {
            await updateRelease({
                releaseId: release._id,
                workspaceId: workspace._id,
                name: name.trim(),
                tag: tag.trim(),
                namespaceVersions: releaseNamespaces.map(item => ({
                    namespaceId: item.namespace._id,
                    versionId: item.environment._id,
                })),
            });

            resetStates();

            toast.success('Release updated successfully');
            close();
        } catch (err) {
            toast.error(`Failed to update release: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNamespaces = async () => {
        const data: ReleaseNamespaceItem[] = [];

        for (const nv of release.namespaceVersions) {
            const namespace = await convex.query(api.namespaces.getNamespace, {
                namespaceId: nv.namespaceId,
                projectId: project._id,
                workspaceId: workspace._id,
            });

            const environment = await convex.query(api.namespaceVersions.getNamespaceVersion, {
                namespaceVersionId: nv.versionId,
                workspaceId: workspace._id,
            });

            data.push({
                namespace,
                environment,
            });
        }

        setReleaseNamespaces(data);
    };

    useEffect(() => {
        if (isOpen) {
            setName(release.name);
            setTag(release.tag);
            fetchNamespaces();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, release]);

    return (
        <SheetContent
            isOpen={isOpen}
            onOpenChange={isOpen => {
                if (!isOpen) {
                    resetStates();
                }

                setIsOpen(isOpen);
            }}>
            {({ close }) => (
                <>
                    <SheetHeader>
                        <SheetTitle>Edit Release</SheetTitle>
                        <SheetDescription>Change release name, tag and needed namespaces here.</SheetDescription>
                    </SheetHeader>
                    <Form
                        onSubmit={e => {
                            e.preventDefault();
                            handleUpdate(close);
                        }}>
                        <SheetBody className='space-y-4'>
                            <TextField
                                label='Name'
                                type='text'
                                placeholder='Enter release name'
                                value={name}
                                onChange={setName}
                                isRequired
                            />
                            <Textarea
                                label='Tag'
                                placeholder='Enter release tag for the api'
                                value={tag}
                                onChange={setTag}
                                isRequired
                            />
                            <div className='flex items-end space-x-3'>
                                <NamespaceSelector
                                    workspace={workspace}
                                    project={project}
                                    selectedNamespace={namespace}
                                    setSelectedNamespace={setNamespace}
                                    label='Namespace'
                                    isPreSelectLonelyItem
                                />
                                <EnvironmentSelector
                                    workspace={workspace}
                                    namespace={namespace ?? undefined}
                                    selectedEnvironment={environment}
                                    setSelectedEnvironment={setEnvironment}
                                    label='Environment'
                                    isPreSelectLonelyItem
                                />
                                <Button
                                    intent='outline'
                                    isDisabled={!namespace || !environment}
                                    onClick={() => {
                                        if (!namespace || !environment) return;

                                        const isAlreadyAdded = releaseNamespaces.some(
                                            ns =>
                                                ns.namespace._id === namespace._id &&
                                                ns.environment._id === environment._id
                                        );

                                        if (isAlreadyAdded) return;

                                        setReleaseNamespaces(s => [
                                            ...s,
                                            {
                                                namespace,
                                                environment,
                                            },
                                        ]);
                                    }}>
                                    <IconPlus />
                                </Button>
                            </div>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Release namespaces'>
                                <Table.Header>
                                    <Table.Column isRowHeader>Namespace</Table.Column>
                                    <Table.Column>Environment</Table.Column>
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body items={releaseNamespaces}>
                                    {item => (
                                        <Table.Row id={item.environment._id}>
                                            <Table.Cell>{item.namespace.name}</Table.Cell>
                                            <Table.Cell>{item.environment.version}</Table.Cell>
                                            <Table.Cell className='text-end last:pr-2.5'>
                                                <Button
                                                    intent='danger'
                                                    size='sq-xs'
                                                    onClick={() => {
                                                        const filteredNamespaces = releaseNamespaces.filter(
                                                            ns =>
                                                                ns.namespace._id !== item.namespace._id &&
                                                                ns.environment._id !== item.environment._id
                                                        );

                                                        setReleaseNamespaces(filteredNamespaces);
                                                    }}>
                                                    <IconTrash />
                                                </Button>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                        </SheetBody>
                        <SheetFooter>
                            <SheetClose>Cancel</SheetClose>
                            <Button isPending={isLoading} type='submit'>
                                {isLoading ? <Loader /> : 'Save Changes'}
                            </Button>
                        </SheetFooter>
                    </Form>
                </>
            )}
        </SheetContent>
    );
};

export default ReleaseEditSheet;
