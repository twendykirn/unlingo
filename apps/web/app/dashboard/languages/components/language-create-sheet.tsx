import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Description, FieldError, Label } from '@/components/ui/field';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { type Selection, type Key, Collection } from 'react-aria-components';
import { SearchField, SearchInput } from '@/components/ui/search-field';
import { LANGUAGES } from '../constants';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GridList, GridListItem } from '@/components/ui/grid-list';
import {
    Drawer,
    DrawerBody,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    environment: Doc<'namespaceVersions'>;
    languages: Doc<'languages'>[];
    primaryLanguageId?: Id<'languages'>;
}

const LanguageCreateSheet = ({ isOpen, setIsOpen, workspace, environment, languages, primaryLanguageId }: Props) => {
    const [search, setSearch] = useState('');
    const [selectedCodes, setSelectedCodes] = useState<Selection>(new Set([]));
    const [isLoading, setIsLoading] = useState(false);
    const [newPrimaryCode, setNewPrimaryCode] = useState<Key | null>('');
    const [primaryJSON, setPrimaryJSON] = useState('');
    const [errorJSON, setErrorJSON] = useState(false);

    const createLanguages = useMutation(api.languages.createLanguages);

    const availableLanguages = useMemo(() => {
        return LANGUAGES.filter(language => languages.findIndex(l => l.languageCode === language.id) === -1);
    }, [languages]);

    const filteredLanguages = useMemo(() => {
        return availableLanguages.filter(language => language.label.includes(search));
    }, [search, availableLanguages]);

    const chosenCodes = useMemo(() => {
        const codesArray = Array.from(selectedCodes);
        return availableLanguages.filter(language => codesArray.includes(language.id));
    }, [selectedCodes, availableLanguages]);

    const canCreate = chosenCodes.length > 0 && (primaryLanguageId ? true : !!newPrimaryCode);

    const handleCreate = async () => {
        const codes = Array.from(selectedCodes) as string[];
        if (codes.length === 0) {
            toast.error('Please select at least one language.');
            return;
        }

        if (environment.usage.languages + codes.length > workspace.limits.languagesPerVersion) {
            toast.error('Cannot create language. Please check your subscription limits.');
            return;
        }

        if (!primaryLanguageId && !newPrimaryCode) {
            toast.error('Please select a primary language.');
            return;
        }

        if (!primaryLanguageId && newPrimaryCode && primaryJSON) {
            try {
                JSON.parse(primaryJSON);
            } catch {
                setErrorJSON(true);
                toast.error('Please enter a valid JSON for the primary language.');
                return;
            }
        }

        setIsLoading(true);

        try {
            await createLanguages({
                namespaceVersionId: environment._id,
                workspaceId: workspace._id,
                languageCodes: codes,
                primaryLanguageCode: (newPrimaryCode as string) || undefined,
                primaryJSON: primaryJSON || undefined,
            });

            setSelectedCodes(new Set([]));
            setNewPrimaryCode('');
            setPrimaryJSON('');
            setSearch('');
            setErrorJSON(false);

            toast.success('Languages added successfully. It might take a few seconds before everything is synced.');
            setIsOpen(false);
        } catch (err) {
            toast.error(`Failed to add languages: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (chosenCodes.length === 0) {
            setNewPrimaryCode('');
            setPrimaryJSON('');
        }
    }, [chosenCodes]);

    return (
        <Drawer
            isOpen={isOpen}
            onOpenChange={isOpen => {
                if (!isOpen) {
                    setSelectedCodes(new Set([]));
                    setSearch('');
                }

                setIsOpen(isOpen);
            }}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Add Languages</DrawerTitle>
                    <DrawerDescription>
                        Select a language codes and specify primary language value for initial sync. By default all new
                        languages will be synced with your primary language automatically.
                    </DrawerDescription>
                    <div className='flex items-center gap-2 mt-4'>
                        <SearchField value={search} onChange={setSearch} aria-label='Search'>
                            <SearchInput />
                        </SearchField>
                        <Button
                            intent='danger'
                            onClick={() => {
                                setSelectedCodes(new Set([]));
                                setSearch('');
                            }}>
                            Clear
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedCodes(new Set(availableLanguages.map(({ id }) => id)));
                                setSearch('');
                                setNewPrimaryCode('');
                                setPrimaryJSON('');
                            }}>
                            All
                        </Button>
                    </div>
                </DrawerHeader>
                <DrawerBody>
                    <div className='prose prose-zinc dark:prose-invert'>
                        <GridList
                            aria-label='Select languages'
                            selectionMode='multiple'
                            className='min-w-64'
                            selectedKeys={selectedCodes}
                            onSelectionChange={setSelectedCodes}>
                            <Collection items={filteredLanguages}>
                                {item => <GridListItem id={item.id}>{item.label}</GridListItem>}
                            </Collection>
                        </GridList>
                    </div>
                </DrawerBody>
                <DrawerFooter>
                    <div className='flex flex-col gap-2 w-full'>
                        <Description className='block text-muted-fg [&>strong]:text-fg'>
                            You have selected: <strong>{Array.from(selectedCodes).join(', ')}</strong>
                        </Description>
                        {!primaryLanguageId ? (
                            <>
                                <Select
                                    name='primaryLanguage'
                                    value={newPrimaryCode}
                                    onChange={setNewPrimaryCode}
                                    placeholder='Select a primary language'>
                                    <Label>Primary Language:</Label>
                                    <SelectTrigger />
                                    <SelectContent items={chosenCodes}>
                                        {item => (
                                            <SelectItem id={item.id} textValue={item.label}>
                                                {item.label}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {newPrimaryCode ? (
                                    <TextField
                                        value={primaryJSON}
                                        isInvalid={errorJSON}
                                        onChange={value => {
                                            setPrimaryJSON(value);

                                            if (errorJSON) {
                                                setErrorJSON(false);
                                            }
                                        }}
                                        className='resize-none!'>
                                        <Label>Primary language JSON (optional):</Label>
                                        <Textarea
                                            style={{
                                                height: '200px',
                                            }}
                                        />
                                        <FieldError />
                                    </TextField>
                                ) : null}
                            </>
                        ) : null}
                        <div className='flex items-center justify-between flex-1 mt-2'>
                            <DrawerClose>Cancel</DrawerClose>
                            <Button isPending={isLoading} onClick={handleCreate} isDisabled={!canCreate}>
                                {isLoading ? <Loader /> : 'Add'}
                            </Button>
                        </div>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};

export default LanguageCreateSheet;
