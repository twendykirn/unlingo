import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useRef, useState } from "react";
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
import { Spinner } from "./ui/spinner";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./ui/select";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { CheckIcon, CopyIcon } from "lucide-react";

const PERMISSIONS = [
    { value: 'translations.read', label: 'Translations Read' },
    { value: 'translations.load', label: 'Translations Load' },
    { value: 'translations.write', label: 'Translations Write' },
];

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    onCreated?: () => void;
}

const ApiKeyCreateDialog = ({ isOpen, setIsOpen, workspace, project, onCreated }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const handleCopy = (value: string) => {
        if (inputRef.current) {
            navigator.clipboard.writeText(value);
            setIsCopied(true);

            setTimeout(() => {
                setIsCopied(false);
            }, 1000);
        }
    };

    const renderValue = (value: string[]) => {
        if (value.length === 0) {
            return "Select permissions...";
        }

        const firstPermission = PERMISSIONS.find(p => p.value === value[0]);

        if (!firstPermission) {
            return value[0];
        }

        const additionalPermissions =
            value.length > 1 ? ` (+${value.length - 1} more)` : "";

        return firstPermission.label + additionalPermissions;
    }

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const permissions = formData.getAll('permissions') as unknown as string[];

        setIsLoading(true);

        try {

            if (!name.trim()) {
                throw new Error('Name is required');
            }

            if (permissions.length === 0) {
                throw new Error('At least one permission is required');
            }

            const response = await fetch(`/api/api-keys/${workspace._id}/${project._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    permissions,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create API key');
            }

            const result = await response.json();
            setNewlyGeneratedKey(result.key);
            toastManager.add({
                description: 'API key created successfully',
                type: 'success',
            });

            onCreated?.();
        } catch (err) {
            toastManager.add({
                description: `Failed to create API key: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-sm">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>{newlyGeneratedKey ? 'API Key Generated!' : 'Generate New API Key'}</DialogTitle>
                        <DialogDescription>
                            {newlyGeneratedKey ? 'WARNING: This key is shown only once.' : `Create a key for ${project.name}`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        {newlyGeneratedKey ? (
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="API Key"
                                    defaultValue={newlyGeneratedKey}
                                    ref={inputRef}
                                    readOnly
                                    type="text"
                                />
                                <InputGroupAddon align="inline-end">
                                    <Tooltip>
                                        <TooltipTrigger
                                            render={
                                                <Button
                                                    aria-label="Copy"
                                                    onClick={() => {
                                                        if (inputRef.current) {
                                                            handleCopy(inputRef.current.value);
                                                        }
                                                    }}
                                                    size="icon-xs"
                                                    variant="ghost"
                                                />
                                            }
                                        >
                                            {isCopied ? <CheckIcon /> : <CopyIcon />}
                                        </TooltipTrigger>
                                        <TooltipPopup>
                                            <p>Copy to clipboard</p>
                                        </TooltipPopup>
                                    </Tooltip>
                                </InputGroupAddon>
                            </InputGroup>
                        ) : (
                            <>
                                <Field>
                                    <FieldLabel>Name</FieldLabel>
                                    <Input type="text" name="name" required placeholder='Enter key name' autoComplete="off" />
                                </Field>
                                <Field>
                                    <FieldLabel>Permissions</FieldLabel>
                                    <Select
                                        aria-label="Select permissions"
                                        items={PERMISSIONS}
                                        name="permissions"
                                        multiple
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue>{renderValue}</SelectValue>
                                        </SelectTrigger>
                                        <SelectPopup>
                                            {PERMISSIONS.map(({ label, value }) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectPopup>
                                    </Select>
                                </Field>
                            </>
                        )}
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        {newlyGeneratedKey ? (
                            <Button onClick={() => {
                                setIsOpen(false);
                                setNewlyGeneratedKey(null);
                            }}>
                                Done
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Spinner /> : 'Generate Key'}
                            </Button>
                        )}
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default ApiKeyCreateDialog;