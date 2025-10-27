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

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
}

const ProjectCreateSheet = ({ isOpen, setIsOpen, workspace }: Props) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const createProject = useMutation(api.projects.createProject);

    const handleCreate = async (close: () => void) => {
        if (workspace.currentUsage.projects >= workspace.limits.projects) {
            toast.error('Cannot create project. Please check your subscription limits.');
            return;
        }

        setIsLoading(true);

        try {
            const projectId = await createProject({
                workspaceId: workspace._id,
                name: name.trim(),
                description: description.trim() || undefined,
            });

            if (projectId) {
                setName('');
                setDescription('');
                toast.success('Project created successfully');
                close();
            }
        } catch (err) {
            toast.error(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                    setDescription('');
                }

                setIsOpen(isOpen);
            }}>
            {({ close }) => (
                <>
                    <SheetHeader>
                        <SheetTitle>Create Project</SheetTitle>
                        <SheetDescription>Add project name and description here.</SheetDescription>
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
                                placeholder='Enter project name'
                                value={name}
                                onChange={setName}
                                isRequired
                            />
                            <Textarea
                                label='Description'
                                placeholder='Enter project description'
                                value={description}
                                onChange={setDescription}
                                isRequired
                            />
                        </SheetBody>
                        <SheetFooter>
                            <SheetClose>Cancel</SheetClose>
                            <Button isPending={isLoading} type='submit'>
                                {isLoading ? <Loader /> : 'Create Project'}
                            </Button>
                        </SheetFooter>
                    </Form>
                </>
            )}
        </SheetContent>
    );
};

export default ProjectCreateSheet;
