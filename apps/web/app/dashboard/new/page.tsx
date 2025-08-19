'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function NewOrganizationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Organization details
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');

    // Step 2: Contact email
    const [contactEmail, setContactEmail] = useState('');
    const [isCompletingSetup, setIsCompletingSetup] = useState(false);

    const { user } = useUser();
    const { createOrganization, setActive } = useOrganizationList();

    const createWorkspaceMutation = useMutation(api.workspaces.createOrganizationWorkspace);

    // Auto-populate email with user's primary email
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress && !contactEmail) {
            setContactEmail(user.primaryEmailAddress.emailAddress);
        }
    }, [user, contactEmail]);

    // Generate slug from name
    const handleNameChange = (value: string) => {
        setName(value);
        // Auto-generate slug from name
        const generatedSlug = value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/--+/g, '-') // Replace multiple dashes with single dash
            .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
        setSlug(generatedSlug);
    };

    const handleSlugChange = (value: string) => {
        // Ensure slug follows naming conventions
        const cleanSlug = value
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '') // Only allow letters, numbers, and dashes
            .replace(/--+/g, '-') // Replace multiple dashes with single dash
            .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
        setSlug(cleanSlug);
    };

    const handleOrgSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !slug.trim()) {
            return;
        }

        setCurrentStep(2);
    };

    const handleCompleteSetup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contactEmail.trim() || !name.trim() || !slug.trim()) {
            return;
        }

        setIsCompletingSetup(true);

        try {
            const organization = await createOrganization?.({
                name: name.trim(),
                slug: slug.trim(),
            });

            if (organization) {
                // Create the Convex workspace with both organization ID and contact email
                await createWorkspaceMutation({
                    clerkOrgId: organization.id,
                    contactEmail: contactEmail.trim(),
                });

                // Set the newly created organization as active
                await setActive?.({ organization: organization.id });
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Failed to complete setup:', error);
            setIsCompletingSetup(false);
        }
    };

    const isOrgFormValid = name.trim().length > 0 && slug.trim().length > 0;
    const isEmailFormValid = contactEmail.trim().length > 0;

    const stepperItems = [
        { number: 1, title: 'Organization', description: 'Create your organization' },
        { number: 2, title: 'Contact Email', description: 'Set up contact details' },
    ];

    return (
        <div className='min-h-screen bg-black text-white flex items-center justify-center p-6'>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className='w-full max-w-md space-y-8'>
                {/* Stepper */}
                <div className='flex items-center justify-center space-x-4 mb-8'>
                    {stepperItems.map((item, index) => (
                        <div key={item.number} className='flex items-center'>
                            <div className='flex flex-col items-center space-y-2'>
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                                        item.number < currentStep
                                            ? 'bg-green-600 text-white'
                                            : item.number === currentStep
                                              ? 'bg-white text-black'
                                              : 'bg-gray-700 text-gray-400'
                                    }`}>
                                    {item.number < currentStep ? <CheckCircle className='h-5 w-5' /> : item.number}
                                </div>
                                <div className='text-center'>
                                    <p
                                        className={`text-xs font-medium ${item.number <= currentStep ? 'text-white' : 'text-gray-400'}`}>
                                        {item.title}
                                    </p>
                                    <p className='text-xs text-gray-500 hidden sm:block'>{item.description}</p>
                                </div>
                            </div>
                            {index < stepperItems.length - 1 && (
                                <div
                                    className={`w-8 h-px mx-4 transition-all ${
                                        item.number < currentStep ? 'bg-green-600' : 'bg-gray-700'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Organization Creation */}
                {currentStep === 1 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}>
                        {/* Header */}
                        <div className='text-center mb-8'>
                            <div className='mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-6'>
                                <Building2 className='h-8 w-8 text-white' />
                            </div>
                            <h1 className='text-3xl font-bold mb-2'>Create Your Organization</h1>
                            <p className='text-gray-400'>Set up your organization details</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleOrgSubmit} className='space-y-6'>
                            {/* Organization Name */}
                            <div className='space-y-2'>
                                <Label htmlFor='name' className='text-sm font-medium text-gray-300'>
                                    Organization Name
                                </Label>
                                <Input
                                    id='name'
                                    type='text'
                                    value={name}
                                    onChange={e => handleNameChange(e.target.value)}
                                    placeholder='My Company'
                                    className='bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-white'
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Organization Slug */}
                            <div className='space-y-2'>
                                <Label htmlFor='slug' className='text-sm font-medium text-gray-300'>
                                    Organization URL
                                </Label>
                                <Input
                                    id='slug'
                                    type='text'
                                    value={slug}
                                    onChange={e => handleSlugChange(e.target.value)}
                                    placeholder='my-company'
                                    className='bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-white'
                                    required
                                />
                                <p className='text-xs text-gray-500'>
                                    This will be used in your organization's URL. Only lowercase letters, numbers, and
                                    dashes allowed.
                                </p>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type='submit'
                                disabled={!isOrgFormValid}
                                className='w-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed py-3'>
                                <div className='flex items-center justify-center space-x-2'>
                                    <span>Continue</span>
                                    <ArrowRight className='h-4 w-4' />
                                </div>
                            </Button>
                        </form>
                    </motion.div>
                )}

                {/* Step 2: Contact Email */}
                {currentStep === 2 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}>
                        {/* Header */}
                        <div className='text-center mb-8'>
                            <div className='mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-6'>
                                <Mail className='h-8 w-8 text-white' />
                            </div>
                            <h1 className='text-3xl font-bold mb-2'>Contact Email</h1>
                            <p className='text-gray-400'>We need your contact email to complete the setup</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCompleteSetup} className='space-y-6'>
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
                                    disabled={isCompletingSetup}
                                    autoFocus
                                />
                                <p className='text-xs text-gray-500'>
                                    This email will be used for billing and important notifications. You can change this
                                    later in settings.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className='flex space-x-3'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => setCurrentStep(1)}
                                    disabled={isCompletingSetup}
                                    className='flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'>
                                    <ArrowLeft className='h-4 w-4 mr-2' />
                                    Back
                                </Button>
                                <Button
                                    type='submit'
                                    disabled={!isEmailFormValid || isCompletingSetup}
                                    className='flex-1 bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed'>
                                    {isCompletingSetup ? (
                                        <div className='flex items-center justify-center space-x-2'>
                                            <div className='w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
                                            <span>Completing...</span>
                                        </div>
                                    ) : (
                                        <div className='flex items-center justify-center space-x-2'>
                                            <CheckCircle className='h-4 w-4' />
                                            <span>Complete Setup</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
