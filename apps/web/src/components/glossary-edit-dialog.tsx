import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc, Id } from "@unlingo/backend/convex/_generated/dataModel";
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
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    term: Doc<'glossaryTerms'>;
    languages: Doc<'languages'>[];
}

const GlossaryEditDialog = ({ isOpen, setIsOpen, workspace, project, term, languages }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isNonTranslatable, setIsNonTranslatable] = useState(term.isNonTranslatable);
    const [isCaseSensitive, setIsCaseSensitive] = useState(term.isCaseSensitive);
    const [isForbidden, setIsForbidden] = useState(term.isForbidden);
    const [translations, setTranslations] = useState<Record<Id<'languages'>, string>>(term.translations || {});

    const updateTerm = useMutation(api.glossary.updateTerm);

    useEffect(() => {
        setIsNonTranslatable(term.isNonTranslatable);
        setIsCaseSensitive(term.isCaseSensitive);
        setIsForbidden(term.isForbidden);
        setTranslations(term.translations || {});
    }, [term]);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const termValue = formData.get('term') as string;
        const description = formData.get('description') as string;

        if (!termValue.trim()) return;

        if (!isNonTranslatable && !isCaseSensitive && !isForbidden && !description?.trim()) return;

        setIsLoading(true);

        try {
            await updateTerm({
                workspaceId: workspace._id,
                projectId: project._id,
                termId: term._id,
                term: termValue.trim(),
                description: description?.trim() || undefined,
                isNonTranslatable,
                isCaseSensitive,
                isForbidden,
                translations: isNonTranslatable ? {} : translations,
            });

            toastManager.add({
                description: 'Glossary term updated successfully',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to update glossary term: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
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
                <Form className="contents" onSubmit={handleUpdate}>
                    <DialogHeader>
                        <DialogTitle>Edit Glossary Term</DialogTitle>
                        <DialogDescription>
                            Update the glossary term details.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4 max-h-[60vh] overflow-y-auto">
                        <Field>
                            <FieldLabel>Term</FieldLabel>
                            <Input type="text" name="term" required defaultValue={term.term} />
                        </Field>
                        <Field>
                            <FieldLabel>Description (optional)</FieldLabel>
                            <Textarea name="description" defaultValue={term.description || ''} />
                        </Field>
                        <div className="flex flex-col gap-3">
                            <Field name="isNonTranslatable">
                                <FieldLabel>
                                    <Checkbox value={isNonTranslatable + ''} onCheckedChange={setIsNonTranslatable} />
                                    Non-translatable (keep as-is)
                                </FieldLabel>
                            </Field>
                            <Field name="isCaseSensitive">
                                <FieldLabel>
                                    <Checkbox value={isCaseSensitive + ''} onCheckedChange={setIsCaseSensitive} />
                                    Case sensitive
                                </FieldLabel>
                            </Field>
                            <Field name="isForbidden">
                                <FieldLabel>
                                    <Checkbox value={isForbidden + ''} onCheckedChange={setIsForbidden} />
                                    Forbidden (should not be used)
                                </FieldLabel>
                            </Field>
                        </div>
                        {!isNonTranslatable && languages.length > 0 && (
                            <Field className="border-t pt-4">
                                <FieldLabel className="mb-3">Translations</FieldLabel>
                                <div className="grid gap-3 w-full">
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
                            </Field>
                        )}
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button disabled={isLoading} type="submit">{isLoading ? <Spinner /> : 'Update'}</Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default GlossaryEditDialog;
