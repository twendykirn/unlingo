import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { TrashIcon, PlusIcon, ClipboardPasteIcon } from "lucide-react";
import { toastManager } from "./ui/toast";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle
} from "./ui/dialog";
import { Form } from "./ui/form";
import { Button } from "./ui/button";
import { Field, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Spinner } from "./ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import {
    Popover,
    PopoverClose,
    PopoverDescription,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger
} from "./ui/popover";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    namespace: Doc<'namespaces'>;
}

interface PreAddedKey {
    id: string;
    key: string;
    primaryValue: string;
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
        } else if (typeof value === 'string') {
            result[newKey] = value;
        } else if (value !== null && value !== undefined) {
            result[newKey] = String(value);
        }
    }

    return result;
}

const TranslationKeyCreateDialog = ({ isOpen, setIsOpen, workspace, project, namespace }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [preAddedKeys, setPreAddedKeys] = useState<PreAddedKey[]>([]);
    const [keyInput, setKeyInput] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState('');

    const createTranslationKeysBulk = useMutation(api.translationKeys.createTranslationKeysBulk);

    const handleAddKey = () => {
        if (!keyInput.trim() || !valueInput.trim()) return;

        const existingKey = preAddedKeys.find(k => k.key === keyInput.trim());
        if (existingKey) {
            toastManager.add({
                description: 'This key has already been added to the list',
                type: 'error',
            });
            return;
        }

        setPreAddedKeys([...preAddedKeys, {
            id: crypto.randomUUID(),
            key: keyInput.trim(),
            primaryValue: valueInput.trim(),
        }]);

        setKeyInput('');
        setValueInput('');
    };

    const handleRemoveKey = (id: string) => {
        setPreAddedKeys(preAddedKeys.filter(k => k.id !== id));
    };

    const handleParseJson = () => {
        setJsonError('');

        if (!jsonInput.trim()) {
            setJsonError('Please enter JSON content');
            return;
        }

        try {
            const parsed = JSON.parse(jsonInput);

            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                setJsonError('JSON must be an object');
                return;
            }

            const flattened = flattenObject(parsed);
            const entries = Object.entries(flattened);

            if (entries.length === 0) {
                setJsonError('No valid key-value pairs found');
                return;
            }

            const existingKeys = new Set(preAddedKeys.map(k => k.key));
            const newKeys: PreAddedKey[] = [];
            let skippedCount = 0;

            for (const [key, value] of entries) {
                if (existingKeys.has(key)) {
                    skippedCount++;
                    continue;
                }

                newKeys.push({
                    id: crypto.randomUUID(),
                    key,
                    primaryValue: value,
                });
                existingKeys.add(key);
            }

            if (newKeys.length > 0) {
                setPreAddedKeys([...preAddedKeys, ...newKeys]);
                setJsonInput('');
                toastManager.add({
                    description: `Added ${newKeys.length} keys${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`,
                    type: 'success',
                });
            } else if (skippedCount > 0) {
                setJsonError(`All ${skippedCount} keys already exist in the list`);
            }
        } catch {
            setJsonError('Invalid JSON format');
        }
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (preAddedKeys.length === 0) {
            toastManager.add({
                description: 'Please add at least one key to create',
                type: 'error',
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await createTranslationKeysBulk({
                workspaceId: workspace._id,
                projectId: project._id,
                namespaceId: namespace._id,
                keys: preAddedKeys.map(k => ({
                    key: k.key,
                    primaryValue: k.primaryValue,
                })),
            });

            if (result.createdCount > 0) {
                toastManager.add({
                    description: `Created ${result.createdCount} translation key${result.createdCount > 1 ? 's' : ''}${result.skippedKeys.length > 0 ? ` (${result.skippedKeys.length} skipped - already exist)` : ''}`,
                    type: 'success',
                });
            } else if (result.skippedKeys.length > 0) {
                toastManager.add({
                    description: 'All keys already exist in this namespace',
                    type: 'error',
                });
            }

            setPreAddedKeys([]);
            setKeyInput('');
            setValueInput('');
            setIsOpen(false);
        } catch (err) {
            toastManager.add({
                description: `Failed to create translation keys: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setPreAddedKeys([]);
            setKeyInput('');
            setValueInput('');
            setJsonInput('');
            setJsonError('');
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogPopup className="sm:max-w-2xl">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Translation Keys</DialogTitle>
                        <DialogDescription>
                            Add translation keys to the namespace. You can add multiple keys at once.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <div className="flex items-end gap-2">
                            <Field className="flex-1">
                                <FieldLabel>Key</FieldLabel>
                                <Input
                                    type="text"
                                    placeholder="e.g., common.buttons.submit"
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                />
                            </Field>
                            <Field className="flex-1">
                                <FieldLabel>Primary Value</FieldLabel>
                                <Input
                                    type="text"
                                    placeholder="Enter value..."
                                    value={valueInput}
                                    onChange={(e) => setValueInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddKey();
                                        }
                                    }}
                                />
                            </Field>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddKey}
                                disabled={!keyInput.trim() || !valueInput.trim()}
                            >
                                <PlusIcon className="size-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger render={<Button type="button" variant="outline" />}>
                                    <ClipboardPasteIcon className="size-4 mr-2" />
                                    Paste JSON
                                </PopoverTrigger>
                                <PopoverPopup className="w-96">
                                    <div className="mb-4">
                                        <PopoverTitle className="text-base">Paste JSON</PopoverTitle>
                                        <PopoverDescription>
                                            Paste a JSON object to import multiple keys at once. Nested objects will be flattened.
                                        </PopoverDescription>
                                    </div>
                                    <div className="space-y-3">
                                        <Field>
                                            <Textarea
                                                aria-label="JSON input"
                                                placeholder='{"common": {"buttons": {"submit": "Submit"}}}'
                                                value={jsonInput}
                                                onChange={(e) => {
                                                    setJsonInput(e.target.value);
                                                    setJsonError('');
                                                }}
                                                rows={6}
                                            />
                                            {jsonError && (
                                                <p className="text-destructive text-sm mt-1">{jsonError}</p>
                                            )}
                                        </Field>
                                        <div className="flex justify-end gap-2">
                                            <PopoverClose render={<Button type="button" variant="ghost" />}>
                                                Cancel
                                            </PopoverClose>
                                            <Button type="button" onClick={handleParseJson}>
                                                Import
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverPopup>
                            </Popover>
                        </div>

                        {preAddedKeys.length > 0 && (
                            <div className="border rounded-lg max-h-64 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Key</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead className="w-12" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preAddedKeys.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-mono text-sm max-w-48 truncate" title={item.key}>
                                                    {item.key}
                                                </TableCell>
                                                <TableCell className="max-w-64 truncate" title={item.primaryValue}>
                                                    {item.primaryValue}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveKey(item.id)}
                                                    >
                                                        <TrashIcon className="size-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {preAddedKeys.length > 0 && (
                            <p className="text-muted-foreground text-sm">
                                {preAddedKeys.length} key{preAddedKeys.length !== 1 ? 's' : ''} ready to create
                            </p>
                        )}
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={preAddedKeys.length === 0 || isLoading}>
                            {isLoading ? <Spinner /> : `Create ${preAddedKeys.length > 0 ? preAddedKeys.length : ''} Key${preAddedKeys.length !== 1 ? 's' : ''}`}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default TranslationKeyCreateDialog;
