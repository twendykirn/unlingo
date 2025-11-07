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
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';
import NamespaceSelector from '../../components/namespace-selector';
import EnvironmentSelector from '../../components/environment-selector';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import { FieldError, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const ReleaseCreateSheet = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [namespace, setNamespace] = useState<Doc<'namespaces'> | null>(null);
    const [environment, setEnvironment] = useState<Doc<'namespaceVersions'> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [releaseNamespaces, setReleaseNamespaces] = useState<
        {
            namespace: Doc<'namespaces'>;
            environment: Doc<'namespaceVersions'>;
        }[]
    >([]);

    const createRelease = useMutation(api.releases.createRelease);

    const resetStates = () => {
        setName('');
        setTag('');
        setNamespace(null);
        setEnvironment(null);
        setReleaseNamespaces([]);
    };

    const handleCreate = async (close: () => void) => {
        if (!releaseNamespaces.length) {
            toast.error('Failed to create release: Add at least one namespace');
            return;
        }

        setIsLoading(true);

        try {
            await createRelease({
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
                tag: tag.trim(),
                namespaceVersions: releaseNamespaces.map(item => ({
                    namespaceId: item.namespace._id,
                    versionId: item.environment._id,
                })),
            });

            resetStates();

            toast.success('Release created successfully');
            close();
        } catch (err) {
            toast.error(`Failed to create release: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

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
                        <SheetTitle>Create Release</SheetTitle>
                        <SheetDescription>Add release name, tag and select needed namespaces here.</SheetDescription>
                    </SheetHeader>
                    <Form
                        onSubmit={e => {
                            e.preventDefault();
                            handleCreate(close);
                        }}>
                        <SheetBody className='space-y-4'>
                            <TextField isRequired value={name} onChange={setName}>
                                <Label>Name</Label>
                                <Input placeholder='Enter release name' />
                                <FieldError />
                            </TextField>
                            <TextField isRequired value={tag} onChange={setTag}>
                                <Label>Tag</Label>
                                <Textarea placeholder='Enter release tag for the api' />
                                <FieldError />
                            </TextField>
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
                                    <PlusIcon />
                                </Button>
                            </div>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Release namespaces'>
                                <TableHeader>
                                    <TableColumn isRowHeader>Namespace</TableColumn>
                                    <TableColumn>Environment</TableColumn>
                                    <TableColumn />
                                </TableHeader>
                                <TableBody items={releaseNamespaces}>
                                    {item => (
                                        <TableRow id={item.environment._id}>
                                            <TableCell>{item.namespace.name}</TableCell>
                                            <TableCell>{item.environment.version}</TableCell>
                                            <TableCell className='text-end last:pr-2.5'>
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
                                                    <TrashIcon />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </SheetBody>
                        <SheetFooter>
                            <SheetClose>Cancel</SheetClose>
                            <Button isPending={isLoading} type='submit'>
                                {isLoading ? <Loader /> : 'Create Release'}
                            </Button>
                        </SheetFooter>
                    </Form>
                </>
            )}
        </SheetContent>
    );
};

export default ReleaseCreateSheet;
