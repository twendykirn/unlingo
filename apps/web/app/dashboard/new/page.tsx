'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'motion/react';
import { Building2, ArrowRight } from 'lucide-react';

export default function NewOrganizationPage() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const router = useRouter();
    const { createOrganization, setActive } = useOrganizationList();

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

        setIsCreating(true);

        try {
            const organization = await createOrganization?.({
                name: name.trim(),
                slug: slug.trim(),
            });

            if (organization) {
                // Set the newly created organization as active and redirect to contact email
                await setActive?.({ organization: organization.id });
                router.push('/dashboard/contact-email');
            }
        } catch (error) {
            console.error('Failed to create organization:', error);
            setIsCreating(false);
        }
    };

    const isOrgFormValid = name.trim().length > 0 && slug.trim().length > 0;

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
                        <Building2 className='h-8 w-8 text-white' />
                    </div>
                    <h1 className='text-3xl font-bold mb-2'>Create Your Organization</h1>
                    <p className='text-gray-400'>First, let's set up your organization details</p>
                </div>

                {/* Form */}
                <motion.form
                    onSubmit={handleOrgSubmit}
                    className='space-y-6'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}>
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
                            disabled={isCreating}
                        />
                    </div>

                    {/* Organization Slug */}
                    <div className='space-y-2'>
                        <Label htmlFor='slug' className='text-sm font-medium text-gray-300'>
                            Organization URL
                        </Label>
                        <div className='relative'>
                            <Input
                                id='slug'
                                type='text'
                                value={slug}
                                onChange={e => handleSlugChange(e.target.value)}
                                placeholder='my-company'
                                className='bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-white'
                                required
                                disabled={isCreating}
                            />
                        </div>
                        <p className='text-xs text-gray-500'>
                            This will be used in your organization's URL. Only lowercase letters, numbers, and dashes
                            allowed.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type='submit'
                        disabled={!isOrgFormValid || isCreating}
                        className='w-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed py-3 cursor-pointer'>
                        {isCreating ? (
                            <div className='flex items-center justify-center space-x-2'>
                                <div className='w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
                                <span>Creating Organization...</span>
                            </div>
                        ) : (
                            <div className='flex items-center justify-center space-x-2'>
                                <span>Create Organization</span>
                                <ArrowRight className='h-4 w-4' />
                            </div>
                        )}
                    </Button>
                </motion.form>
            </motion.div>
        </div>
    );
}
