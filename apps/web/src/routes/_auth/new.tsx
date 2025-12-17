import { useOrganizationList, useUser } from '@clerk/tanstack-react-start';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { api } from '@unlingo/backend/convex/_generated/api';
import slugify from 'slugify';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
    AlertDialog,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogPopup,
    AlertDialogTitle,
    AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { AlertDialogPanel } from '@/components/ui/alert-dialog-panel';
import { toastManager } from '@/components/ui/toast';

export const Route = createFileRoute('/_auth/new')({
    component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [isCompletingSetup, setIsCompletingSetup] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const { user } = useUser();
    const { createOrganization, setActive } = useOrganizationList();

    const createWorkspaceMutation = useMutation(api.workspaces.createOrganizationWorkspace);
    const verifyWorkspaceContactEmailMutation = useMutation(api.workspaces.verifyWorkspaceContactEmail);

    const handleNameChange = (value: string) => {
        setName(value);
        const generatedSlug = slugify(value, {
            lower: true,
            replacement: '-',
        });
        setSlug(generatedSlug);
    };

    const handleCompleteSetup = async () => {
        if (!contactEmail.trim() || !name.trim() || !slug.trim()) {
            return;
        }

        setIsCompletingSetup(true);
        setErrorMessage('');

        try {
            const verifyContactEmail = await verifyWorkspaceContactEmailMutation({
                contactEmail: contactEmail.trim(),
            });

            if (!verifyContactEmail.success) {
                setIsCompletingSetup(false);
                setErrorMessage(
                    'This email is already associated with another workspace. Please use a different email address.'
                );
                return;
            }

            const organization = await createOrganization?.({
                name: name.trim(),
                slug: slug.trim(),
            });

            if (organization) {
                await createWorkspaceMutation({
                    clerkOrgId: organization.id,
                    contactEmail: contactEmail.trim(),
                });
                await setActive?.({ organization: organization.id });
                toastManager.add({
                    description: "New organization created!",
                    title: "Success!",
                    type: "success",
                });
                navigate({
                    to: '/dashboard',
                });
            }
        } catch (error) {
            console.error('Failed to complete setup:', error);
            setIsCompletingSetup(false);
            if (error instanceof Error && error.message.includes('contact email already exists')) {
                setErrorMessage(
                    'This email is already associated with another workspace. Please use a different email address.'
                );
            } else {
                setErrorMessage('Failed to create workspace. Please try again.');
            }
        }
    };

    const handleNavigateBackToDashboard = () => {
        navigate({
            to: '/dashboard',
        });
    };

    const isOrgFormValid = name.trim().length > 0 && slug.trim().length > 0;
    const isEmailFormValid = contactEmail.trim().length > 0;

    if (!user?.id) {
        return (
            <div className='flex items-center justify-center py-12'>
                <Spinner />
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-black text-white flex items-center justify-center p-6'>
            <AlertDialog open={true}>
                <AlertDialogPopup>
                    <AlertDialogHeader>
                        <AlertDialogTitle>New Organization</AlertDialogTitle>
                        <AlertDialogDescription>
                            Create your organization.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel className='grid gap-4'>
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input
                                disabled={isCompletingSetup}
                                name="name"
                                placeholder="My Company"
                                required
                                type="text"
                                autoFocus
                                value={name}
                                onChange={e => handleNameChange(e.target.value)}
                            />
                        </Field>
                    </AlertDialogPanel>
                    <AlertDialogFooter variant="bare">
                        <AlertDialogClose render={<Button variant="ghost" />} disabled={isCompletingSetup} onClick={() => handleNavigateBackToDashboard()}>
                            Back to Dashboard
                        </AlertDialogClose>
                        <Dialog onOpenChange={() => {
                            setContactEmail(user?.primaryEmailAddress?.emailAddress || '');
                        }}>
                            <DialogTrigger render={<Button />} disabled={!name.trim() || !slug.trim() || !isOrgFormValid}>
                                Continue
                            </DialogTrigger>
                            <DialogPopup showCloseButton={false}>
                                <DialogHeader>
                                    <DialogTitle>Contact Email</DialogTitle>
                                    <DialogDescription>
                                        This email will be used for billing and important notifications. You can change this later in settings.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogPanel className="grid gap-4">
                                    <Field>
                                        <FieldLabel>Contact Email</FieldLabel>
                                        <Input
                                            disabled={isCompletingSetup}
                                            name="email"
                                            placeholder="contact@company.com"
                                            required
                                            type="email"
                                            autoFocus
                                            value={contactEmail}
                                            onChange={e => {
                                                if (errorMessage) {
                                                    setErrorMessage('');
                                                }

                                                setContactEmail(e.target.value);
                                            }}
                                        />
                                        {errorMessage ? <p className="text-destructive-foreground text-xs">
                                            {errorMessage}
                                        </p> : null}
                                    </Field>
                                </DialogPanel>
                                <DialogFooter variant="bare">
                                    <DialogClose render={<Button variant="ghost" />}>
                                        Cancel
                                    </DialogClose>
                                    <Button disabled={!isEmailFormValid || isCompletingSetup} onClick={() => handleCompleteSetup()}>
                                        {isCompletingSetup ? (
                                            <Spinner />
                                        ) : "Create"}
                                    </Button>
                                </DialogFooter>
                            </DialogPopup>
                        </Dialog>
                    </AlertDialogFooter>
                </AlertDialogPopup>
            </AlertDialog>
        </div>
    );
}
