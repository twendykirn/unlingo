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
import { useAction } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    environment: Doc<'namespaceVersions'>;
}

const LanguageCreateSheet = ({ isOpen, setIsOpen, workspace, environment }: Props) => {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const createLanguage = useAction(api.languages.createLanguage);

    const handleCreate = async (close: () => void) => {
        if (environment.usage.languages >= workspace.limits.languagesPerVersion) {
            toast.error('Cannot create language. Please check your subscription limits.');
            return;
        }

        setIsLoading(true);

        try {
            await createLanguage({
                namespaceVersionId: environment._id,
                workspaceId: workspace._id,
                languageCode: code.trim(),
            });

            setCode('');
            toast.success('Language created successfully');
            close();
        } catch (err) {
            toast.error(`Failed to create language: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SheetContent
            isOpen={isOpen}
            onOpenChange={isOpen => {
                if (!isOpen) {
                    setCode('');
                }

                setIsOpen(isOpen);
            }}>
            {({ close }) => (
                <>
                    <SheetHeader>
                        <SheetTitle>Create Language</SheetTitle>
                        <SheetDescription>
                            Specify a language code and select available setup options. By default the new language will
                            be synced with your primary language automatically.
                        </SheetDescription>
                    </SheetHeader>
                    <Form
                        onSubmit={e => {
                            e.preventDefault();
                            handleCreate(close);
                        }}>
                        <SheetBody className='space-y-6'>
                            <TextField
                                label='Code'
                                type='text'
                                placeholder='Enter language code'
                                value={code}
                                onChange={setCode}
                                isRequired
                            />
                        </SheetBody>
                        <SheetFooter>
                            <SheetClose>Cancel</SheetClose>
                            <Button isPending={isLoading} type='submit'>
                                {isLoading ? <Loader /> : 'Create Language'}
                            </Button>
                        </SheetFooter>
                    </Form>
                </>
            )}
        </SheetContent>
    );
};

export default LanguageCreateSheet;
