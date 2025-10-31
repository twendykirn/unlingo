import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
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
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { IconPlus, IconTrash } from '@intentui/icons';
import { Table } from '@/components/ui/table';
import { flattenJson, LanguageItem } from '../utils/jsonFlatten';
import { Text } from 'react-aria-components';
import { use$ } from '@legendapp/state/react';
import { languageContent$ } from '../store';
import { Tab, TabList, TabPanel, Tabs } from '@/components/ui/tabs';
import { isValidJson } from '../utils/isValidJson';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    onSave: (newKeys: LanguageItem[]) => void;
}

const EditorAddKeySheet = ({ isOpen, setIsOpen, onSave }: Props) => {
    const keys = use$(Object.keys(languageContent$.get()));
    const [newKeys, setNewKeys] = useState<LanguageItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [activeTab, setActiveTab] = useState('single');

    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [applySuggestion, setApplySuggestion] = useState(false);

    const [newJSON, setNewJSON] = useState('');

    const parentKeys = useMemo(() => {
        const newKeysArray = newKeys.map(i => i.key);
        const keysSet = new Set<string>([]);
        for (const flatKey of [...keys, ...newKeysArray]) {
            const items = flatKey.split('.');
            let level = '';

            // If any segment of the key path is an empty string, skip this entry.
            if (items.some(key => key === '')) {
                continue;
            }

            for (let i = 0; i < items.length; i++) {
                const key = items[i];

                // This check satisfies strict TypeScript rules (like noUncheckedIndexedAccess).
                if (key === undefined) {
                    continue;
                }

                const isLastKey = i === items.length - 1;

                if (!isLastKey) {
                    level = `${level}${i === 0 ? '' : '.'}${key}`;
                    keysSet.add(level);
                }
            }
        }
        return Array.from(keysSet);
    }, [keys, newKeys]);

    const suggestion = useMemo(() => {
        if (!newKey) return null;

        const filteredKeys = parentKeys.filter(key => key.includes(newKey));
        return filteredKeys.length > 0 && !applySuggestion ? filteredKeys[0] : null;
    }, [parentKeys, newKey, applySuggestion]);

    const resetStates = () => {
        setNewKeys([]);
        setIsLoading(false);
        setApplySuggestion(false);
        setNewKey('');
        setNewValue('');
    };

    const validateNewKey = (key: string, existingKeys: string[]) => {
        // Rule 1: Check if the new key attempts to turn an existing string value into an object.
        // This occurs if an existing key is a direct prefix of the new key.
        // Example: existing key 'user.name', new key 'user.name.first'
        for (const existingKey of existingKeys) {
            if (key.startsWith(`${existingKey}.`)) {
                return {
                    isValid: false,
                    error: `Invalid key: "${key}". You cannot add this key because "${existingKey}" is already a string value.`,
                };
            }
        }

        // Rule 2: Check if the new key attempts to turn an existing object into a string value.
        // This occurs if the new key is a prefix of any existing key.
        // Example: existing key 'user.address.city', new key 'user.address'
        for (const existingKey of existingKeys) {
            if (existingKey.startsWith(`${key}.`)) {
                return {
                    isValid: false,
                    error: `Invalid key: "${key}". You cannot use this key because it is already an object containing other keys.`,
                };
            }
        }

        return { isValid: true };
    };

    const resetStringStates = () => {
        setNewKey('');
        setNewValue('');
        setNewJSON('');
    };

    const handleAddJSONValue = () => {
        if (!isValidJson(newJSON)) {
            toast.error('Invalid JSON: Please use standard JSON format.');
            return;
        }

        const object = JSON.parse(newJSON);
        const flatJSON = flattenJson(object);
        const newValues = Object.values(flatJSON);
        const safeItems: LanguageItem[] = [];
        let safeKey = '';
        let addedItem: LanguageItem | undefined;

        for (const value of newValues) {
            safeKey = value.key.replaceAll(' ', '');
            safeKey = safeKey.endsWith('.') ? safeKey.slice(0, -1) : safeKey;

            addedItem = newKeys.find(item => item.key === safeKey);

            if (addedItem) {
                toast.error(`Invalid key: "${addedItem.key}". You cannot use the same key more than once.`);
                break;
            } else {
                safeItems.push({ ...value, key: safeKey });
            }
        }

        const newKeysArray = newKeys.map(i => i.key);
        const safeKeys = safeItems.map(i => i.key);
        const allKeys = [...safeKeys, ...newKeysArray];

        const validatedItems: LanguageItem[] = [];

        for (const safeItem of safeItems) {
            const validation = validateNewKey(safeItem.key, allKeys);

            if (!validation.isValid) {
                toast.error(validation.error);
                break;
            } else {
                validatedItems.push(safeItem);
            }
        }

        setNewKeys(s => [...s, ...validatedItems]);
        resetStringStates();
    };

    const handleAddKey = () => {
        let safeKey = newKey.replaceAll(' ', '');
        safeKey = safeKey.endsWith('.') ? safeKey.slice(0, -1) : safeKey;

        const item = newKeys.find(item => item.key === safeKey);

        if (!item) {
            const newKeysArray = newKeys.map(i => i.key);

            const validation = validateNewKey(safeKey, [...keys, ...newKeysArray]);

            if (!validation.isValid) {
                toast.error(validation.error);
                return;
            }

            setNewKeys(s => [...s, { key: safeKey, value: newValue, primaryValue: null }]);
            resetStringStates();
        } else {
            toast.error(`Invalid key: "${item.key}". You cannot use the same key more than once.`);
        }
    };

    const handleSave = (close: () => void) => {
        setIsLoading(true);

        try {
            onSave(newKeys);

            resetStates();

            toast.success("New keys added successfully! Don't forget to save your changes.");
            close();
        } catch (err) {
            toast.error(`Failed to add keys: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                        <SheetTitle>Add Keys</SheetTitle>
                        <SheetDescription>
                            Write all your keys in flat JSON format. Keys will become children automatically if they
                            have the same path. Use <b>Tab</b> to accept suggestions.
                        </SheetDescription>
                    </SheetHeader>
                    <SheetBody className='space-y-4'>
                        <Form
                            onSubmit={e => {
                                e.preventDefault();

                                if (activeTab === 'single') {
                                    handleAddKey();
                                } else if (activeTab === 'json') {
                                    handleAddJSONValue();
                                }
                            }}
                            className='space-y-3'>
                            <Tabs aria-label='Add key modes'>
                                <TabList>
                                    <Tab
                                        id='single'
                                        onClick={() => {
                                            setActiveTab('single');
                                            resetStringStates();
                                        }}>
                                        Single
                                    </Tab>
                                    <Tab
                                        id='json'
                                        onClick={() => {
                                            setActiveTab('json');
                                            resetStringStates();
                                        }}>
                                        JSON
                                    </Tab>
                                </TabList>
                                <TabPanel id='single' className='space-y-3'>
                                    <div className='space-y-1'>
                                        <TextField
                                            label='Key'
                                            type='text'
                                            placeholder='Enter new key'
                                            value={newKey}
                                            onChange={value => {
                                                setNewKey(value);
                                                setApplySuggestion(false);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Tab' && suggestion) {
                                                    e.preventDefault();
                                                    setNewKey(suggestion);
                                                    setApplySuggestion(true);
                                                }
                                            }}
                                            isRequired={activeTab === 'single'}
                                        />
                                        {suggestion ? (
                                            <>
                                                <Text
                                                    slot='description'
                                                    className='text-pretty text-base/6 text-muted-fg group-disabled:opacity-50 sm:text-sm/6'>
                                                    Suggestion: {suggestion}
                                                </Text>
                                            </>
                                        ) : null}
                                    </div>
                                    <Textarea
                                        label='Value'
                                        placeholder='Enter key value'
                                        value={newValue}
                                        onChange={setNewValue}
                                        isRequired={activeTab === 'single'}
                                    />
                                </TabPanel>
                                <TabPanel id='json'>
                                    <Textarea
                                        label='Value'
                                        placeholder='Enter JSON object'
                                        value={newJSON}
                                        onChange={setNewJSON}
                                        isRequired={activeTab === 'json'}
                                    />
                                </TabPanel>
                            </Tabs>
                            <Button
                                isPending={isLoading}
                                isDisabled={isLoading || (activeTab === 'single' && (!newKey || !newValue)) || (activeTab === 'json' && !newJSON)}
                                type='submit'
                                className='w-full'>
                                <IconPlus /> Add key
                            </Button>
                        </Form>
                        <Table
                            bleed
                            className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                            aria-label='New keys'>
                            <Table.Header>
                                <Table.Column isRowHeader>Key</Table.Column>
                                <Table.Column>Value</Table.Column>
                                <Table.Column />
                            </Table.Header>
                            <Table.Body items={newKeys}>
                                {item => (
                                    <Table.Row id={item.key}>
                                        <Table.Cell>{item.key}</Table.Cell>
                                        <Table.Cell>{item.value}</Table.Cell>
                                        <Table.Cell className='text-end last:pr-2.5'>
                                            <Button
                                                intent='danger'
                                                size='sq-xs'
                                                onClick={() => {
                                                    setNewKeys(s => s.filter(key => key.key !== item.key));
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
                        <Button isPending={isLoading} onPress={() => handleSave(close)} isDisabled={newKeys.length === 0}>
                            Add keys
                        </Button>
                    </SheetFooter>
                </>
            )}
        </SheetContent>
    );
};

export default EditorAddKeySheet;
