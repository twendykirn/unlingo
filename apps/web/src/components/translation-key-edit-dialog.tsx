import { api } from "@unlingo/backend/convex/_generated/api";
import type { Id } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect, useMemo } from "react";
import { StarIcon } from "lucide-react";
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
import { Textarea } from "./ui/textarea";
import { Spinner } from "./ui/spinner";

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspaceId: Id<'workspaces'>;
    projectId: Id<'projects'>;
    translationKeyId: Id<'translationKeys'> | null;
}

const TranslationKeyEditDialog = ({ isOpen, setIsOpen, workspaceId, projectId, translationKeyId }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [editedValues, setEditedValues] = useState<Record<string, string>>({});

    const translationKey = useQuery(
        api.translationKeys.getTranslationKey,
        translationKeyId && workspaceId
            ? { keyId: translationKeyId, workspaceId }
            : 'skip'
    );

    const project = useQuery(
        api.projects.getProject,
        workspaceId && projectId
            ? { projectId, workspaceId }
            : 'skip'
    );

    const languages = useQuery(
        api.languages.getLanguages,
        workspaceId && projectId
            ? { projectId, workspaceId }
            : 'skip'
    );

    const updateTranslationKey = useMutation(api.translationKeys.updateTranslationKey);

    useEffect(() => {
        if (translationKey?.values) {
            setEditedValues({ ...translationKey.values });
        }
    }, [translationKey?.values]);

    const splittedLanguages = useMemo(() => {
        if (!languages || !project) return [];

        const primaryLanguage = languages.find((l) => l._id === project.primaryLanguageId);
        const others = languages.filter((l) => l._id !== project.primaryLanguageId);

        if (!primaryLanguage) {
            return others;
        }

        return [primaryLanguage, ...others];
    }, [languages, project]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!translationKey || !project) return;

        setIsLoading(true);

        try {
            for (const [languageId, value] of Object.entries(editedValues)) {
                const originalValue = translationKey.values[languageId as Id<'languages'>] || '';
                if (value !== originalValue) {
                    await updateTranslationKey({
                        workspaceId,
                        projectId,
                        namespaceId: translationKey.namespaceId,
                        keyId: translationKey._id,
                        languageId: languageId as Id<'languages'>,
                        value,
                    });
                }
            }

            toastManager.add({
                description: 'Translation key updated successfully',
                type: 'success',
            });

            setIsOpen(false);
        } catch (err) {
            toastManager.add({
                description: `Failed to update translation key: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setEditedValues({});
        }
        setIsOpen(open);
    };

    const handleValueChange = (languageId: string, value: string) => {
        setEditedValues(prev => ({
            ...prev,
            [languageId]: value,
        }));
    };

    const isDataLoading = !translationKey || !project || !languages;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogPopup className="sm:max-w-2xl">
                <Form className="contents" onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>Edit Translation Key</DialogTitle>
                        <DialogDescription>
                            {translationKey ? (
                                <>Edit values for <code className="text-xs bg-muted px-1 py-0.5 rounded">{translationKey.key}</code></>
                            ) : (
                                'Loading...'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        {isDataLoading ? (
                            <div className="flex justify-center py-8">
                                <Spinner />
                            </div>
                        ) : (
                            splittedLanguages.map((lang) => (
                                <Field key={lang._id}>
                                    <FieldLabel className="flex items-center gap-2">
                                        {lang.languageCode.toUpperCase()}
                                        {lang._id === project?.primaryLanguageId && (
                                            <StarIcon className="size-3 text-yellow-400" />
                                        )}
                                    </FieldLabel>
                                    <Textarea
                                        placeholder={`Enter ${lang.languageCode} translation...`}
                                        value={editedValues[lang._id] || ''}
                                        onChange={(e) => handleValueChange(lang._id, e.target.value)}
                                        rows={2}
                                    />
                                </Field>
                            ))
                        )}
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={isDataLoading || isLoading}>
                            {isLoading ? <Spinner /> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default TranslationKeyEditDialog;
