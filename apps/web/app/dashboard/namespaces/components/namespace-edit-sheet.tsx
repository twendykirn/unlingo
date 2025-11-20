import { Button } from '@/components/ui/button';
import { FieldError, Label } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
    namespace: Doc<'namespaces'>;
}

const NamespaceEditSheet = ({ isOpen, setIsOpen, project, workspace, namespace }: Props) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const updateNamespace = useMutation(api.namespaces.updateNamespace);

    const hasChanges = name.trim() !== namespace.name;

    const handleUpdate = async (close: () => void) => {
        if (!project || !workspace || !name.trim()) return;

        if (!hasChanges) {
            toast.success('Namespace updated successfully');
            close();
            return;
        }

        setIsLoading(true);

        try {
            await updateNamespace({
                namespaceId: namespace._id,
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
            });
            toast.success('Namespace updated successfully');
            close();
        } catch (error) {
            toast.error(`Failed to update namespace: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setName(namespace.name);
            setIsLoading(false);
        }
    }, [isOpen, namespace]);

    return (
        <SheetContent isOpen={isOpen} onOpenChange={setIsOpen}>
            {({ close }) => (
                <>
                    <SheetHeader>
                        <SheetTitle>Update Namespace</SheetTitle>
                        <SheetDescription>Adjust namespace name here.</SheetDescription>
                    </SheetHeader>
                    <Form
                        onSubmit={e => {
                            e.preventDefault();
                            handleUpdate(close);
                        }}>
                        <SheetBody className='space-y-4'>
                            <TextField isRequired value={name} onChange={setName}>
                                <Label>Name</Label>
                                <Input placeholder='Enter namespace name' />
                                <FieldError />
                            </TextField>
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

export default NamespaceEditSheet;
