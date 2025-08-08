'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Mail, CheckCircle } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

export default function ContactEmailPage() {
    const [contactEmail, setContactEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();
    const { user } = useUser();
    const { organization, isLoaded } = useOrganization();

    const setContactEmailMutation = useMutation(api.workspaces.updateWorkspaceContactEmail);

    // Check if workspace exists and get current contact email
    const workspace = useQuery(
        api.workspaces.getWorkspaceByClerkId,
        organization?.id ? { clerkId: organization.id } : 'skip'
    );

    // Auto-populate email with user's primary email
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress && !contactEmail) {
            setContactEmail(user.primaryEmailAddress.emailAddress);
        }
    }, [user, contactEmail]);

    // Redirect to dashboard if no organization or if contact email is already set
    useEffect(() => {
        if (!isLoaded) return;

        if (!organization) {
            router.push('/select-org');
            return;
        }

        // If workspace has contact email, redirect to dashboard
        if (workspace?.contactEmail) {
            router.push('/dashboard');
            return;
        }
    }, [organization, workspace?.contactEmail, router, isLoaded]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contactEmail.trim() || !organization?.id) {
            return;
        }

        setIsSaving(true);

        const attemptSave = async (attempt: number = 0): Promise<void> => {
            try {
                await setContactEmailMutation({
                    clerkId: organization.id,
                    contactEmail: contactEmail.trim(),
                });

                await organization.reload();

                // Give Clerk's cache a moment to sync, then redirect
                setTimeout(() => {
                    router.push('/dashboard');
                }, 500);
            } catch (error) {
                console.error(`Failed to set contact email (attempt ${attempt + 1}):`, error);

                // If it's a race condition error and we haven't tried too many times, retry
                if (error instanceof Error && error.message.includes('please try again in a moment') && attempt < 5) {
                    setTimeout(() => attemptSave(attempt + 1), 2000);
                } else {
                    setIsSaving(false);
                }
            }
        };

        await attemptSave();
    };

    const isFormValid = contactEmail.trim().length > 0;

    // Show loading while organization is loading
    if (!organization) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-black text-white flex items-center justify-center p-6'>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className='w-full max-w-md space-y-8'>
                {/* Header */}
                <div className='text-center'>
                    <div className='mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-6'>
                        <Mail className='h-8 w-8 text-white' />
                    </div>
                    <h1 className='text-3xl font-bold mb-2'>Contact Email Required</h1>
                    <p className='text-gray-400'>We need your contact email to complete the setup</p>
                </div>

                {/* Form */}
                <motion.form
                    onSubmit={handleSubmit}
                    className='space-y-6'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}>
                    {/* Contact Email */}
                    <div className='space-y-2'>
                        <Label htmlFor='contactEmail' className='text-sm font-medium text-gray-300'>
                            Contact Email
                        </Label>
                        <Input
                            id='contactEmail'
                            type='email'
                            value={contactEmail}
                            onChange={e => setContactEmail(e.target.value)}
                            placeholder='contact@company.com'
                            className='bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-white'
                            required
                            disabled={isSaving}
                            autoFocus
                        />
                        <p className='text-xs text-gray-500'>
                            This email will be used for billing and important notifications. You can change this later
                            in settings.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type='submit'
                        disabled={!isFormValid || isSaving}
                        className='w-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed py-3'>
                        {isSaving ? (
                            <div className='flex items-center justify-center space-x-2'>
                                <div className='w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
                                <span>Completing Setup...</span>
                            </div>
                        ) : (
                            <div className='flex items-center justify-center space-x-2'>
                                <CheckCircle className='h-4 w-4' />
                                <span>Complete Setup</span>
                            </div>
                        )}
                    </Button>
                </motion.form>

                {/* Footer */}
                <motion.div
                    className='text-center text-sm text-gray-500'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}>
                    This step is required to use Unlingo.
                </motion.div>
            </motion.div>
        </div>
    );
}
