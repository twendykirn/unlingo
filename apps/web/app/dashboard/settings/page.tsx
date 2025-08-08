'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Edit, Save, X, CreditCard, ExternalLink } from 'lucide-react';
import { UserButton, OrganizationSwitcher, useUser, useOrganization } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { CheckoutLink, CustomerPortalLink } from '@convex-dev/polar/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WorkspaceSettings() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const router = useRouter();

    // Form state
    const [contactEmail, setContactEmail] = useState('');
    const [originalContactEmail, setOriginalContactEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get the current workspace identifier
    const clerkId = organization?.id;

    // Query workspace info
    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const products = useQuery(api.polar.getConfiguredProducts);

    // Update contact email mutation
    const updateContactEmail = useMutation(api.workspaces.updateWorkspaceContactEmail);

    // Ensure user has an organization
    useEffect(() => {
        if (user && !organization) {
            router.push('/select-org');
        }
    }, [user, organization, router]);

    // Initialize form when workspace loads
    useEffect(() => {
        if (workspace) {
            if (workspace.contactEmail) {
                setContactEmail(workspace.contactEmail);
                setOriginalContactEmail(workspace.contactEmail);
            } else {
                // Auto-start editing if no contact email
                setIsEditing(true);
                // Pre-populate with user's primary email
                if (user?.primaryEmailAddress?.emailAddress) {
                    setContactEmail(user.primaryEmailAddress.emailAddress);
                }
            }
        }
    }, [workspace, user]);

    // Loading state
    if (!user || !organization || !clerkId) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    // Workspace loading state
    if (workspace === undefined) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading workspace...</p>
                </div>
            </div>
        );
    }

    // No workspace found
    if (!workspace) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-2xl font-bold mb-4'>Workspace not found</h2>
                    <p className='text-gray-400 mb-6'>
                        We couldn't find your workspace. Please try signing out and signing back in.
                    </p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!contactEmail.trim()) return;

        setIsSaving(true);
        try {
            await updateContactEmail({
                clerkId,
                contactEmail: contactEmail.trim(),
            });

            // If this was initial setup (no original email), redirect to dashboard
            if (!originalContactEmail) {
                router.push('/dashboard');
                return;
            }

            setOriginalContactEmail(contactEmail.trim());
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update contact email:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Don't allow cancel if no original email (required setup)
        if (!originalContactEmail) return;

        setContactEmail(originalContactEmail);
        setIsEditing(false);
    };

    const hasChanges = contactEmail.trim() !== originalContactEmail;
    const isRequiredSetup = !originalContactEmail;

    return (
        <div className='min-h-screen bg-black text-white'>
            {/* Header */}
            <header className='border-b border-gray-800 px-6 py-4'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <Link href='/dashboard'>
                            <Button variant='ghost' size='sm' className='text-gray-400 hover:text-white cursor-pointer'>
                                <ArrowLeft className='h-4 w-4 mr-2' />
                                Back to Dashboard
                            </Button>
                        </Link>

                        <div className='flex items-center space-x-2'>
                            <Settings className='h-6 w-6 text-gray-400' />
                            <h1 className='text-2xl font-bold'>
                                <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                    Workspace Settings
                                </span>
                            </h1>
                        </div>
                    </div>

                    {/* Right side: Org Switcher + Profile */}
                    <div className='flex items-center space-x-4'>
                        <OrganizationSwitcher
                            hidePersonal={true}
                            afterCreateOrganizationUrl='/dashboard'
                            afterLeaveOrganizationUrl='/select-org'
                            afterSelectOrganizationUrl='/dashboard'
                        />
                        <UserButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className='p-6'>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className='max-w-2xl space-y-6'>
                    {/* Organization Info */}
                    <div className='bg-gray-900 border border-gray-800 rounded-lg p-6'>
                        <h3 className='text-lg font-semibold mb-4'>Organization Information</h3>

                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>
                                    Organization Name
                                </label>
                                <input
                                    type='text'
                                    value={organization.name}
                                    readOnly
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none'
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>
                                    Organization Slug
                                </label>
                                <input
                                    type='text'
                                    value={organization.slug || ''}
                                    readOnly
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none'
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Email Settings */}
                    <div className='bg-gray-900 border border-gray-800 rounded-lg p-6'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold'>Contact Information</h3>
                            {isRequiredSetup && (
                                <span className='text-xs bg-red-600 text-white px-2 py-1 rounded'>Required</span>
                            )}
                        </div>

                        {isRequiredSetup && (
                            <div className='bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-4'>
                                <p className='text-red-400 text-sm'>
                                    <strong>Setup Required:</strong> Please provide your contact email to complete your
                                    workspace setup and start using Unlingo.
                                </p>
                            </div>
                        )}

                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='contactEmail' className='text-sm font-medium text-gray-400 mb-2 block'>
                                    Contact Email
                                </Label>
                                {isEditing ? (
                                    <div className='space-y-4'>
                                        <Input
                                            id='contactEmail'
                                            type='email'
                                            value={contactEmail}
                                            onChange={e => setContactEmail(e.target.value)}
                                            className='bg-gray-800 border-gray-700 text-white'
                                            placeholder='contact@company.com'
                                            disabled={isSaving}
                                        />
                                        <div className='flex space-x-2'>
                                            <Button
                                                onClick={handleSave}
                                                disabled={
                                                    (!hasChanges && !isRequiredSetup) ||
                                                    !contactEmail.trim() ||
                                                    isSaving
                                                }
                                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                                <Save className='h-4 w-4 mr-2' />
                                                {isSaving ? 'Saving...' : isRequiredSetup ? 'Complete Setup' : 'Save'}
                                            </Button>
                                            {!isRequiredSetup && (
                                                <Button
                                                    variant='outline'
                                                    onClick={handleCancel}
                                                    disabled={isSaving}
                                                    className='cursor-pointer'>
                                                    <X className='h-4 w-4 mr-2' />
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className='flex items-center justify-between'>
                                        <input
                                            type='text'
                                            value={contactEmail || 'Not set'}
                                            readOnly
                                            className='flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none mr-4'
                                        />
                                        <Button
                                            onClick={() => setIsEditing(true)}
                                            variant='outline'
                                            size='sm'
                                            className='cursor-pointer'>
                                            <Edit className='h-4 w-4 mr-2' />
                                            Edit
                                        </Button>
                                    </div>
                                )}
                                <p className='text-xs text-gray-500 mt-2'>
                                    This email will be used for billing and important notifications.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Usage Information */}
                    <div className='bg-gray-900 border border-gray-800 rounded-lg p-6'>
                        <h3 className='text-lg font-semibold mb-4'>Usage & Limits</h3>

                        <div className='space-y-4'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='bg-gray-800 rounded-lg p-4'>
                                    <div className='text-sm text-gray-400 mb-1'>Projects</div>
                                    <div className='text-xl font-semibold'>
                                        {workspace.currentUsage.projects} / {workspace.limits.projects}
                                    </div>
                                    <div className='w-full bg-gray-700 rounded-full h-2 mt-2'>
                                        <div
                                            className='bg-blue-600 h-2 rounded-full'
                                            style={{
                                                width: `${Math.min((workspace.currentUsage.projects / workspace.limits.projects) * 100, 100)}%`,
                                            }}></div>
                                    </div>
                                </div>

                                <div className='bg-gray-800 rounded-lg p-4'>
                                    <div className='text-sm text-gray-400 mb-1'>Translation Requests</div>
                                    <div className='text-xl font-semibold'>
                                        {workspace.currentUsage.requests.toLocaleString()} /{' '}
                                        {workspace.limits.requests.toLocaleString()}
                                    </div>
                                    <div className='w-full bg-gray-700 rounded-full h-2 mt-2'>
                                        <div
                                            className='bg-green-600 h-2 rounded-full'
                                            style={{
                                                width: `${Math.min((workspace.currentUsage.requests / workspace.limits.requests) * 100, 100)}%`,
                                            }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                                <div className='bg-gray-800 rounded-lg p-4'>
                                    <div className='text-sm text-gray-400 mb-1'>Namespaces per Project</div>
                                    <div className='text-lg font-semibold text-purple-400'>
                                        {workspace.limits.namespacesPerProject} max
                                    </div>
                                </div>

                                <div className='bg-gray-800 rounded-lg p-4'>
                                    <div className='text-sm text-gray-400 mb-1'>Languages per Namespace</div>
                                    <div className='text-lg font-semibold text-orange-400'>
                                        {workspace.limits.languagesPerNamespace} max
                                    </div>
                                </div>

                                <div className='bg-gray-800 rounded-lg p-4'>
                                    <div className='text-sm text-gray-400 mb-1'>Versions per Namespace</div>
                                    <div className='text-lg font-semibold text-pink-400'>
                                        {workspace.limits.versionsPerNamespace} max
                                    </div>
                                </div>
                            </div>

                            <div className='text-sm text-gray-500'>
                                {workspace.isPremium ? (
                                    <span className='text-green-400'>✓ Premium plan active</span>
                                ) : (
                                    <span className='text-blue-400'>Free plan</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Billing & Subscription */}
                    <div className='bg-gray-900 border border-gray-800 rounded-lg p-6'>
                        <h3 className='text-lg font-semibold mb-4'>Billing & Subscription</h3>

                        <div className='space-y-6'>
                            {workspace.isPremium ? (
                                <div className='space-y-4'>
                                    <div className='flex items-center justify-between p-4 bg-green-900/20 border border-green-600/30 rounded-lg'>
                                        <div>
                                            <h4 className='font-medium text-green-400'>Premium Plan Active</h4>
                                            <p className='text-sm text-gray-400 mt-1'>
                                                You have access to all premium features and higher limits.
                                            </p>
                                        </div>
                                        <div className='flex items-center text-green-400'>
                                            <CreditCard className='h-5 w-5' />
                                        </div>
                                    </div>

                                    <div className='flex justify-center'>
                                        <CustomerPortalLink
                                            polarApi={{
                                                generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
                                            }}
                                            className='inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors cursor-pointer'>
                                            <CreditCard className='h-4 w-4 mr-2' />
                                            Manage Subscription
                                            <ExternalLink className='h-4 w-4 ml-2' />
                                        </CustomerPortalLink>
                                    </div>
                                </div>
                            ) : (
                                <div className='space-y-4'>
                                    <div className='flex items-center justify-between p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg'>
                                        <div>
                                            <h4 className='font-medium text-blue-400'>Free Plan</h4>
                                            <p className='text-sm text-gray-400 mt-1'>
                                                Upgrade to premium for higher limits and advanced features.
                                            </p>
                                        </div>
                                        <div className='flex items-center text-blue-400'>
                                            <CreditCard className='h-5 w-5' />
                                        </div>
                                    </div>

                                    {products ? (
                                        <div className='grid grid-cols-1 gap-4'>
                                            {products.pro250kRequests ? (
                                                <div className='bg-gray-800 rounded-lg p-4'>
                                                    <h5 className='font-medium text-white mb-2'>Pro 250K Plan</h5>
                                                    <p className='text-sm text-gray-400 mb-3'>
                                                        250,000 translation requests, unlimited projects & namespaces
                                                    </p>
                                                    <CheckoutLink
                                                        polarApi={api.polar}
                                                        productIds={[products.pro250kRequests.id]}
                                                        className='inline-flex items-center px-4 py-2 bg-white hover:bg-gray-200 text-black rounded-md transition-colors cursor-pointer'>
                                                        <CreditCard className='h-4 w-4 mr-2' />
                                                        Upgrade to Pro 250K
                                                    </CheckoutLink>
                                                </div>
                                            ) : null}

                                            {products.pro500kRequests ? (
                                                <div className='bg-gray-800 rounded-lg p-4'>
                                                    <h5 className='font-medium text-white mb-2'>Pro 500K Plan</h5>
                                                    <p className='text-sm text-gray-400 mb-3'>
                                                        500,000 translation requests, unlimited projects & namespaces
                                                    </p>
                                                    <CheckoutLink
                                                        polarApi={api.polar}
                                                        productIds={[products.pro500kRequests.id]}
                                                        className='inline-flex items-center px-4 py-2 bg-white hover:bg-gray-200 text-black rounded-md transition-colors cursor-pointer'>
                                                        <CreditCard className='h-4 w-4 mr-2' />
                                                        Upgrade to Pro 500K
                                                    </CheckoutLink>
                                                </div>
                                            ) : null}

                                            <div className='bg-gray-800 rounded-lg p-4'>
                                                <h5 className='font-medium text-white mb-2'>Pro 1M+ Plans</h5>
                                                <p className='text-sm text-gray-400 mb-3'>
                                                    1M+ translation requests, unlimited everything
                                                </p>
                                                <div className='flex flex-wrap gap-2'>
                                                    {products.pro1mRequests ? (
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro1mRequests.id]}
                                                            className='inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md transition-colors cursor-pointer text-sm'>
                                                            1M Requests
                                                        </CheckoutLink>
                                                    ) : null}
                                                    {products.pro2mRequests ? (
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro2mRequests.id]}
                                                            className='inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md transition-colors cursor-pointer text-sm'>
                                                            2M Requests
                                                        </CheckoutLink>
                                                    ) : null}
                                                    {products.pro10mRequests ? (
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro10mRequests.id]}
                                                            className='inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md transition-colors cursor-pointer text-sm'>
                                                            10M Requests
                                                        </CheckoutLink>
                                                    ) : null}
                                                    {products.pro50mRequests ? (
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro50mRequests.id]}
                                                            className='inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md transition-colors cursor-pointer text-sm'>
                                                            50M Requests
                                                        </CheckoutLink>
                                                    ) : null}
                                                    {products.pro100mRequests ? (
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro100mRequests.id]}
                                                            className='inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md transition-colors cursor-pointer text-sm'>
                                                            100M Requests
                                                        </CheckoutLink>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
