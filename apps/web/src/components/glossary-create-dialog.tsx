import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc, Id } from "@unlingo/backend/convex/_generated/dataModel";
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
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    languages: Doc<'languages'>[];
}

const GlossaryCreateDialog = ({ isOpen, setIsOpen, workspace, project, languages }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isNonTranslatable, setIsNonTranslatable] = useState(false);
    const [isCaseSensitive, setIsCaseSensitive] = useState(false);
    const [isForbidden, setIsForbidden] = useState(false);
    const [translations, setTranslations] = useState<Record<Id<'languages'>, string>>({});

    const createTerm = useMutation(api.glossary.createTerm);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const term = formData.get('term') as string;
        const description = formData.get('description') as string;

        if (!term.trim()) return;

        setIsLoading(true);

        try {
            const termId = await createTerm({
                workspaceId: workspace._id,
                projectId: project._id,
                term: term.trim(),
                description: description?.trim() || undefined,
                isNonTranslatable,
                isCaseSensitive,
                isForbidden,
                translations: isNonTranslatable ? {} : translations,
            });

            if (termId) {
                toastManager.add({
                    description: 'Glossary term created successfully',
                    type: 'success',
                });
            }
        } catch (err) {
            toastManager.add({
                description: `Failed to create glossary term: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
            setIsNonTranslatable(false);
            setIsCaseSensitive(false);
            setIsForbidden(false);
            setTranslations({});
        }
    };

    const handleTranslationChange = (languageId: Id<'languages'>, value: string) => {
        setTranslations(prev => ({
            ...prev,
            [languageId]: value,
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-md">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Glossary Term</DialogTitle>
                        <DialogDescription>
                            Add a new term to your project glossary.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <Field>
                            <FieldLabel>Term</FieldLabel>
                            <Input type="text" name="term" required />
                        </Field>
                        <Field>
                            <FieldLabel>Description (optional)</FieldLabel>
                            <Textarea name="description" />
                        </Field>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={isNonTranslatable}
                                    onCheckedChange={(checked) => setIsNonTranslatable(checked === true)}
                                />
                                <span className="text-sm">Non-translatable (keep as-is)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={isCaseSensitive}
                                    onCheckedChange={(checked) => setIsCaseSensitive(checked === true)}
                                />
                                <span className="text-sm">Case sensitive</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={isForbidden}
                                    onCheckedChange={(checked) => setIsForbidden(checked === true)}
                                />
                                <span className="text-sm">Forbidden (should not be used)</span>
                            </label>
                        </div>
                        {!isNonTranslatable && languages.length > 0 && (
                            <div className="border-t pt-4">
                                <FieldLabel className="mb-3">Translations</FieldLabel>
                                <div className="grid gap-3">
                                    {languages.map((language) => (
                                        <Field key={language._id}>
                                            <FieldLabel className="text-xs text-muted-foreground">
                                                {language.languageCode}
                                            </FieldLabel>
                                            <Input
                                                type="text"
                                                value={translations[language._id] || ''}
                                                onChange={(e) => handleTranslationChange(language._id, e.target.value)}
                                            />
                                        </Field>
                                    ))}
                                </div>
                            </div>
                        )}
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

export default GlossaryCreateDialog;
