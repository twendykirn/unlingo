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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
}

const ProjectEditSheet = ({ isOpen, setIsOpen, project, workspace }: Props) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const updateProject = useMutation(api.projects.updateProject);

    const hasChanges = project && (name.trim() !== project.name || description.trim() !== (project.description || ''));

    const handleUpdate = async (close: () => void) => {
        if (!project || !workspace || !name.trim()) return;

        if (!hasChanges) {
            toast.success('Project updated successfully');
            close();
            return;
        }

        setIsLoading(true);

        try {
            await updateProject({
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
                description: description.trim() || undefined,
            });
            toast.success('Project updated successfully');
            close();
        } catch (error) {
            toast.error(`Failed to update project: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setName(project.name);
            setDescription(project.description || '');
            setIsLoading(false);
        }
    }, [isOpen, project]);

    return (
        <SheetContent isOpen={isOpen} onOpenChange={setIsOpen}>
            {({ close }) => (
                <>
                    <SheetHeader>
                        <SheetTitle>Update Project</SheetTitle>
                        <SheetDescription>Adjust project name and description here.</SheetDescription>
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
                                placeholder='Enter project name'
                                value={name}
                                onChange={setName}
                            />
                            <Textarea
                                label='Description'
                                placeholder='Enter project description'
                                value={description}
                                onChange={setDescription}
                            />
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

export default ProjectEditSheet;
