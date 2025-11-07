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
    language: Doc<'languages'>;
}

const LanguageRemoveModal = ({ isOpen, setIsOpen, workspace, language }: Props) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const deleteLanguage = useMutation(api.languages.deleteLanguage);

    const canDelete = deleteConfirmation === language.languageCode;

    const handleDelete = async () => {
        setIsLoading(true);

        try {
            await deleteLanguage({
                languageId: language._id,
                workspaceId: workspace._id,
            });

            toast.success('Language deleted successfully');
            setIsOpen(false);
        } catch (error) {
            toast.error(`Failed to delete language: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalContent role='alertdialog' isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalHeader>
                <ModalTitle>Delete Language</ModalTitle>
                <ModalDescription>
                    This action is permanent and cannot be undone. To confirm, please type the language code below:
                </ModalDescription>
                <Snippet size='sm' hideSymbol>
                    {language.languageCode}
                </Snippet>
            </ModalHeader>
            <ModalBody>
                <TextField value={deleteConfirmation} onChange={setDeleteConfirmation}>
                    <Label>Code</Label>
                    <Input placeholder='Enter language code' />
                </TextField>
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent='danger' isPending={isLoading} isDisabled={!canDelete} onClick={handleDelete}>
                    {isLoading ? <Loader /> : 'Delete Language'}
                </Button>
            </ModalFooter>
        </ModalContent>
    );
};

export default LanguageRemoveModal;
