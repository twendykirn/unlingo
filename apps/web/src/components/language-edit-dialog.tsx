import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
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
import { TrashIcon } from "lucide-react";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    language: Doc<'languages'>;
    isLastLanguage: boolean;
}

const LanguageEditDialog = ({ isOpen, setIsOpen, workspace, project, language, isLastLanguage }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPrimary, setIsPrimary] = useState(false);
    const [rules, setRules] = useState<Record<string, string>>({});

    const updateLanguage = useMutation(api.languages.updateLanguage);

    useEffect(() => {
        setIsPrimary(project.primaryLanguageId === language._id);
        setRules(language.rules || {});
    }, [language, project.primaryLanguageId]);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!language || !workspace || !project) return;

        setIsLoading(true);

        const filteredRules = Object.entries(rules).reduce((acc, [key, value]) => {
            if (value.trim()) acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        try {
            await updateLanguage({
                workspaceId: workspace._id,
                projectId: project._id,
                languageId: language._id,
                isPrimary: isLastLanguage ? true : isPrimary,
                rules: Object.keys(filteredRules).length > 0 ? filteredRules : undefined,
            });

            toastManager.add({
                description: 'Language updated successfully',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to update language: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
            setRules(filteredRules);
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
            <DialogPopup className="sm:max-w-md">
                <Form className="contents" onSubmit={handleUpdate}>
                    <DialogHeader>
                        <DialogTitle>Edit Language</DialogTitle>
                        <DialogDescription>
                            Update language settings for {language.languageCode}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <Field>
                            <FieldLabel>Language Code</FieldLabel>
                            <Input type="text" value={language.languageCode} disabled readOnly />
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
                        <Button type="submit">{isLoading ? <Spinner /> : 'Update'}</Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default LanguageEditDialog;
