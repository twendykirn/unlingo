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

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
}

const LanguageCreateDialog = ({ isOpen, setIsOpen, workspace, project }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPrimary, setIsPrimary] = useState(false);

    const createLanguage = useMutation(api.languages.createLanguage);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const languageCode = formData.get('languageCode') as string;

        if (!languageCode.trim()) return;

        setIsLoading(true);

        try {
            await createLanguage({
                workspaceId: workspace._id,
                projectId: project._id,
                languageCode: languageCode.trim(),
                isPrimary,
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
            setIsPrimary(false);
        }
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
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Language Code</FieldLabel>
                            <Input type="text" name="languageCode" placeholder="e.g., en, es, fr" required />
                        </Field>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={isPrimary}
                                onCheckedChange={(checked) => setIsPrimary(checked === true)}
                            />
                            <span className="text-sm">Set as primary language</span>
                        </label>
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
