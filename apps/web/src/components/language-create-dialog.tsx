import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
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
import { Checkbox } from "./ui/checkbox";
import { Spinner } from "./ui/spinner";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./ui/select";
import { TrashIcon } from "lucide-react";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    availableLanguages: {
        id: string;
        label: string;
    }[];
    isFirstLanguage: boolean;
}

const LanguageCreateDialog = ({
    isOpen,
    setIsOpen,
    workspace,
    project,
    availableLanguages,
    isFirstLanguage
}: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPrimary, setIsPrimary] = useState(false);
    const [rules, setRules] = useState<Record<string, string>>({});
    const [languageCode, setLanguageCode] = useState<string | null>(null);

    const createLanguage = useMutation(api.languages.createLanguage);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!languageCode?.trim()) return;

        setIsLoading(true);

        const filteredRules = Object.entries(rules).reduce((acc, [key, value]) => {
            if (value.trim()) acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        try {
            await createLanguage({
                workspaceId: workspace._id,
                projectId: project._id,
                languageCode: languageCode.trim(),
                isPrimary: isFirstLanguage ? true : isPrimary,
                rules: Object.keys(filteredRules).length > 0 ? filteredRules : undefined,
            });

            toastManager.add({
                description: 'Language created successfully',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to create language: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
            setLanguageCode(null);
            setRules({});
            setIsPrimary(false);
        }
    };

    const handleRuleChange = (key: string, value: string) => {
        setRules(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleAddRule = () => {
        const now = new Date().getTime();
        const newKey = `rule_${now}`;
        setRules(prev => ({
            ...prev,
            [newKey]: '',
        }));
    };

    const handleRemoveRule = (key: string) => {
        setRules(prev => {
            const newRules = { ...prev };
            delete newRules[key];
            return newRules;
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-sm">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Language</DialogTitle>
                        <DialogDescription>
                            Add a new language to your project.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <Field>
                            <FieldLabel>Language Code</FieldLabel>
                            <Select
                                value={languageCode}
                                onValueChange={setLanguageCode}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPopup>
                                    {availableLanguages.map((language) => (
                                        <SelectItem key={language.id} value={language.id}>
                                            {language.label}
                                        </SelectItem>
                                    ))}
                                </SelectPopup>
                            </Select>
                        </Field>
                        <Field >
                            <FieldLabel>
                                <Checkbox
                                    checked={isPrimary}
                                    onCheckedChange={(checked) => setIsPrimary(checked === true)}
                                />
                                Set as primary language
                            </FieldLabel>
                        </Field>
                        <Field className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3 w-full">
                                <FieldLabel>Translation Rules</FieldLabel>
                                <Button type="button" variant="ghost" size="sm" onClick={handleAddRule}>
                                    Add Rule
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2 w-full">
                                {Object.entries(rules).map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                        <Input
                                            type="text"
                                            placeholder="Rule value"
                                            value={value}
                                            onChange={(e) => handleRuleChange(key, e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => handleRemoveRule(key)}
                                        >
                                            <TrashIcon />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Field>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit">{isLoading ? <Spinner /> : 'Create'}</Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default LanguageCreateDialog;
