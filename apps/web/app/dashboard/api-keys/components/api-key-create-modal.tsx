import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import {
    ModalBody,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { Snippet } from '@heroui/react';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const ApiKeyCreateModal = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);

    const generateApiKey = useMutation(api.apiKeys.generateApiKey);

    const handleGenerate = async () => {
        setIsLoading(true);

        try {
            const result = await generateApiKey({
                projectId: project._id,
                workspaceId: workspace._id,
                name: name.trim(),
            });

            setNewlyGeneratedKey(result.key);
            setName('');
            toast.success('API key created successfully');
        } catch (err) {
            toast.error(`Failed to create API key: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent
            isOpen={isOpen}
            onOpenChange={value => {
                if (!value) {
                    setName('');
                    setNewlyGeneratedKey(null);
                }

                setIsOpen(value);
            }}>
            <ModalHeader>
                <ModalTitle>{newlyGeneratedKey ? 'API Key Generated!' : 'Generate New API Key'}</ModalTitle>
                <ModalDescription>{newlyGeneratedKey ? '' : `Create a key for ${project.name}`}</ModalDescription>
            </ModalHeader>
            <ModalBody>
                {newlyGeneratedKey ? (
                    <Snippet hideSymbol classNames={{ pre: 'truncate' }}>
                        {newlyGeneratedKey}
                    </Snippet>
                ) : (
                    <TextField value={name} onChange={setName}>
                        <Label>Name</Label>
                        <Input placeholder='Enter key name' />
                    </TextField>
                )}{' '}
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                {newlyGeneratedKey ? (
                    <Button onClick={() => setIsOpen(false)}>Done</Button>
                ) : (
                    <Button isPending={isLoading} onClick={handleGenerate}>
                        {isLoading ? <Loader /> : 'Generate Key'}
                    </Button>
                )}
            </ModalFooter>
        </ModalContent>
    );
};

export default ApiKeyCreateModal;
