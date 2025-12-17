import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState, useRef } from "react";
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

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    project: Doc<'projects'>;
    onUploadFile: (file: File) => Promise<string>;
}

const ScreenshotCreateDialog = ({ isOpen, setIsOpen, workspace, project, onUploadFile }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createScreenshot = useMutation(api.screenshots.createScreenshot);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!name.trim() || !selectedFile) return;

        setIsLoading(true);

        try {
            // Get image dimensions
            const dimensions = await getImageDimensions(selectedFile);

            // Upload file and get file ID
            const imageFileId = await onUploadFile(selectedFile);

            const screenshotId = await createScreenshot({
                workspaceId: workspace._id,
                projectId: project._id,
                name: name.trim(),
                imageFileId,
                imageSize: selectedFile.size,
                imageMimeType: selectedFile.type,
                dimensions,
            });

            if (screenshotId) {
                toastManager.add({
                    description: 'Screenshot created successfully',
                    type: 'success',
                });
            }
        } catch (err) {
            toastManager.add({
                description: `Failed to create screenshot: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsOpen(false);
            setIsLoading(false);
            setSelectedFile(null);
            setPreviewUrl(null);
        }
    };

    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleClear = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogPopup className="sm:max-w-md">
                <Form className="contents" onSubmit={handleCreate}>
                    <DialogHeader>
                        <DialogTitle>Create Screenshot</DialogTitle>
                        <DialogDescription>
                            Upload a screenshot to use for visual context.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="grid gap-4">
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input type="text" name="name" placeholder="e.g., Home Page" required />
                        </Field>
                        <Field>
                            <FieldLabel>Image</FieldLabel>
                            <div className="space-y-2">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    required
                                />
                                {previewUrl && (
                                    <div className="relative">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-48 rounded border object-contain"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-1 right-1"
                                            onClick={handleClear}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Field>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>
                            Cancel
                        </DialogClose>
                        <Button type="submit" disabled={!selectedFile}>
                            {isLoading ? <Spinner /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogPopup>
        </Dialog>
    );
};

export default ScreenshotCreateDialog;
