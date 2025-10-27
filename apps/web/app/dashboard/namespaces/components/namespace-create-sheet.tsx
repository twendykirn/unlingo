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
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const NamespaceCreateSheet = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const createNamespace = useMutation(api.namespaces.createNamespace);

    const handleCreate = async (close: () => void) => {
        if (project.usage.namespaces >= workspace.limits.namespacesPerProject) {
            toast.error('Cannot create namespace. Please check your subscription limits.');
            return;
        }

        setIsLoading(true);

        try {
            await createNamespace({
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
            });

            setName('');
            toast.success('Namespace created successfully');
            close();
        } catch (err) {
            toast.error(`Failed to create namespace: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SheetContent
            isOpen={isOpen}
            onOpenChange={isOpen => {
                if (!isOpen) {
                    setName('');
                }

                setIsOpen(isOpen);
            }}>
            {({ close }) => (
                <>
                    <SheetHeader>
                        <SheetTitle>Create Namespace</SheetTitle>
                        <SheetDescription>
                            Add namespace name here. Development and production environments will be created
                            automatically.
                        </SheetDescription>
                    </SheetHeader>
                    <Form
                        onSubmit={e => {
                            e.preventDefault();
                            handleCreate(close);
                        }}>
                        <SheetBody className='space-y-4'>
                            <TextField
                                label='Name'
                                type='text'
                                placeholder='Enter namespace name'
                                value={name}
                                onChange={setName}
                                isRequired
                            />
                        </SheetBody>
                        <SheetFooter>
                            <SheetClose>Cancel</SheetClose>
                            <Button isPending={isLoading} type='submit'>
                                {isLoading ? <Loader /> : 'Create Namespace'}
                            </Button>
                        </SheetFooter>
                    </Form>
                </>
            )}
        </SheetContent>
    );
};

export default NamespaceCreateSheet;
