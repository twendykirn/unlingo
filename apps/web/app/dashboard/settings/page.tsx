'use client';

import { motion } from 'motion/react';
import {
    Settings,
    Edit,
    Save,
    X,
    CreditCard,
    ExternalLink,
    House,
    User,
    ChartLine,
    Building2,
    ScrollText,
} from 'lucide-react';
import { useUser, useOrganization, useClerk } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CheckoutLink, CustomerPortalLink } from '@convex-dev/polar/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dock from '@/components/ui/dock';

export default function WorkspaceSettings() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const { openOrganizationProfile, openUserProfile } = useClerk();
    const router = useRouter();

    const items = [
        { icon: <House size={18} />, label: 'Dashboard', onClick: () => router.push('/dashboard') },
        {
            icon: <ScrollText size={18} />,
            label: 'Documentation',
            onClick: () => router.push('https://docs.unlingo.com'),
        },
        { icon: <ChartLine size={18} />, label: 'Analytics', onClick: () => router.push('/dashboard/analytics') },
        { icon: <Settings size={18} />, label: 'Settings', onClick: () => router.push('/dashboard/settings') },
        { icon: <Building2 size={18} />, label: 'Organization', onClick: () => openOrganizationProfile() },
        { icon: <User size={18} />, label: 'Profile', onClick: () => openUserProfile() },
    ];

    const [contactEmail, setContactEmail] = useState('');
    const [originalContactEmail, setOriginalContactEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const clerkId = organization?.id;

    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const usageData = useQuery(
        api.workspaces.getCurrentUsage,
        clerkId && workspace ? { clerkId, workspaceUsageId: workspace.workspaceUsageId } : 'skip'
    );

    const products = useQuery(api.polar.getConfiguredProducts, !clerkId ? 'skip' : undefined);

    const updateContactEmail = useMutation(api.workspaces.updateWorkspaceContactEmail);

    useEffect(() => {
        if (workspace) {
            setContactEmail(workspace.contactEmail);
            setOriginalContactEmail(workspace.contactEmail);
        }
    }, [workspace, user]);

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

            setOriginalContactEmail(contactEmail.trim());
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update contact email:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (!originalContactEmail) return;

        setContactEmail(originalContactEmail);
        setIsEditing(false);
    };

    const hasChanges = contactEmail.trim() !== originalContactEmail;

    return (
        <>
            <div className='min-h-screen bg-black text-white'>
                <header className='fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800 px-6 py-4 backdrop-blur-sm'>
                    <div className='flex items-center space-x-4'>
                        <h1 className='text-2xl font-bold'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Unlingo
                            </span>
                        </h1>
                        <div className='h-6 w-px bg-gray-600' />
                        <div className='flex items-center space-x-2'>
                            <Settings className='h-5 w-5 text-gray-400' />
                            <h2 className='text-xl font-semibold text-white'>Settings</h2>
                        </div>
                    </div>
                </header>

                <div className='flex-1 p-8 pt-24 pb-30'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className='max-w-7xl mx-auto'>
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
                            <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                                <h3 className='text-lg font-semibold mb-6 text-white'>Organization Information</h3>

                                <div className='space-y-4'>
                                    <div>
                                        <label className='block text-sm font-medium text-gray-300 mb-2'>
                                            Organization Name
                                        </label>
                                        <input
                                            type='text'
                                            value={organization.name}
                                            readOnly
                                            className='w-full px-4 py-3 bg-black/30 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all'
                                        />
                                    </div>

                                    <div>
                                        <label className='block text-sm font-medium text-gray-300 mb-2'>
                                            Organization Slug
                                        </label>
                                        <input
                                            type='text'
                                            value={organization.slug || ''}
                                            readOnly
                                            className='w-full px-4 py-3 bg-black/30 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all'
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                                <div className='flex items-center justify-between mb-6'>
                                    <h3 className='text-lg font-semibold text-white'>Contact Information</h3>
                                </div>

                                <div className='space-y-4'>
                                    <div>
                                        <Label
                                            htmlFor='contactEmail'
                                            className='text-sm font-medium text-gray-300 mb-2 block'>
                                            Contact Email
                                        </Label>
                                        {isEditing ? (
                                            <div className='space-y-4'>
                                                <Input
                                                    id='contactEmail'
                                                    type='email'
                                                    value={contactEmail}
                                                    onChange={e => setContactEmail(e.target.value)}
                                                    className='bg-black/30 border-gray-700/50 text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50'
                                                    placeholder='contact@company.com'
                                                    disabled={isSaving}
                                                />
                                                <div className='flex space-x-3'>
                                                    <Button
                                                        onClick={handleSave}
                                                        disabled={!hasChanges || !contactEmail.trim() || isSaving}
                                                        className='bg-white text-black hover:bg-gray-200 transition-all'>
                                                        <Save className='h-4 w-4 mr-2' />
                                                        {isSaving ? 'Saving...' : 'Save'}
                                                    </Button>
                                                    <Button
                                                        variant='outline'
                                                        onClick={handleCancel}
                                                        disabled={isSaving}
                                                        className='border-gray-600 hover:bg-gray-800 transition-all'>
                                                        <X className='h-4 w-4 mr-2' />
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='space-y-3'>
                                                <input
                                                    type='text'
                                                    value={contactEmail || 'Not set'}
                                                    readOnly
                                                    className='w-full px-4 py-3 bg-black/30 border border-gray-700/50 rounded-lg text-white focus:outline-none'
                                                />
                                                <Button
                                                    onClick={() => setIsEditing(true)}
                                                    variant='outline'
                                                    size='sm'
                                                    className='border-gray-600 hover:bg-gray-800 transition-all'>
                                                    <Edit className='h-4 w-4 mr-2' />
                                                    Edit
                                                </Button>
                                            </div>
                                        )}
                                        <p className='text-xs text-gray-400 mt-3'>
                                            This email will be used for billing and important notifications.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8'>
                            <div className='lg:col-span-2 xl:col-span-3 bg-gray-900/50 border border-gray-800/50 rounded-xl p-8 backdrop-blur-sm'>
                                <div className='flex items-center justify-between mb-8'>
                                    <h3 className='text-xl font-semibold text-white'>Usage & Limits</h3>
                                    <div className='flex items-center space-x-2'>
                                        <div
                                            className={`w-2 h-2 rounded-full ${workspace.isPremium ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
                                        <span
                                            className={`text-sm font-medium ${workspace.isPremium ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {workspace.isPremium ? 'Premium Plan' : 'Free Plan'}
                                        </span>
                                    </div>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8'>
                                    <div className='bg-black/20 border border-gray-700/30 rounded-xl p-6 hover:border-gray-600/50 transition-all'>
                                        <div className='flex items-center justify-between mb-4'>
                                            <div className='text-sm font-medium text-gray-300'>Projects</div>
                                            <div className='text-2xl font-bold text-white'>
                                                {workspace.currentUsage.projects}
                                                <span className='text-gray-500'>/{workspace.limits.projects}</span>
                                            </div>
                                        </div>
                                        <div className='w-full bg-gray-800/50 rounded-full h-2'>
                                            <div
                                                className='bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-500'
                                                style={{
                                                    width: `${Math.min((workspace.currentUsage.projects / workspace.limits.projects) * 100, 100)}%`,
                                                }}></div>
                                        </div>
                                        <div className='text-xs text-gray-400 mt-2'>
                                            {Math.round(
                                                (workspace.currentUsage.projects / workspace.limits.projects) * 100
                                            )}
                                            % used
                                        </div>
                                    </div>

                                    {usageData ? (
                                        <div className='bg-black/20 border border-gray-700/30 rounded-xl p-6 hover:border-gray-600/50 transition-all'>
                                            <div className='flex items-center justify-between mb-4'>
                                                <div className='text-sm font-medium text-gray-300'>
                                                    Translation Requests
                                                </div>
                                                <div className='text-2xl font-bold text-white'>
                                                    {usageData.requests.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className='w-full bg-gray-800/50 rounded-full h-2'>
                                                <div
                                                    className='bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500'
                                                    style={{
                                                        width: `${Math.min((usageData.requests / workspace.limits.requests) * 100, 100)}%`,
                                                    }}></div>
                                            </div>
                                            <div className='text-xs text-gray-400 mt-2'>
                                                {workspace.limits.requests.toLocaleString()} limit •{' '}
                                                {Math.round((usageData.requests / workspace.limits.requests) * 100)}%
                                                used • {usageData.month || 'Current month'}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                    <div className='bg-black/10 rounded-lg p-4 border border-gray-700/20'>
                                        <div className='text-xs font-medium text-gray-400 uppercase tracking-wide mb-1'>
                                            Namespaces per Project
                                        </div>
                                        <div className='text-lg font-semibold text-white'>
                                            {workspace.limits.namespacesPerProject}
                                        </div>
                                    </div>

                                    <div className='bg-black/10 rounded-lg p-4 border border-gray-700/20'>
                                        <div className='text-xs font-medium text-gray-400 uppercase tracking-wide mb-1'>
                                            Languages per Version
                                        </div>
                                        <div className='text-lg font-semibold text-white'>
                                            {workspace.limits.languagesPerVersion}
                                        </div>
                                    </div>

                                    <div className='bg-black/10 rounded-lg p-4 border border-gray-700/20'>
                                        <div className='text-xs font-medium text-gray-400 uppercase tracking-wide mb-1'>
                                            Versions per Namespace
                                        </div>
                                        <div className='text-lg font-semibold text-white'>
                                            {workspace.limits.versionsPerNamespace}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='lg:col-span-2 xl:col-span-3 bg-gray-900/50 border border-gray-800/50 rounded-xl p-8 backdrop-blur-sm'>
                                <h3 className='text-xl font-semibold mb-8 text-white'>Billing & Subscription</h3>

                                {workspace.isPremium ? (
                                    <div className='space-y-6'>
                                        <div className='flex items-center justify-between p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl'>
                                            <div>
                                                <h4 className='font-semibold text-emerald-400 text-lg'>
                                                    Premium Plan Active
                                                </h4>
                                                <p className='text-sm text-gray-300 mt-1'>
                                                    You have access to all premium features and higher limits.
                                                </p>
                                            </div>
                                            <div className='flex items-center text-emerald-400'>
                                                <CreditCard className='h-6 w-6' />
                                            </div>
                                        </div>

                                        <div className='flex justify-center'>
                                            <CustomerPortalLink
                                                polarApi={{
                                                    generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
                                                }}
                                                className='inline-flex items-center px-6 py-3 bg-white text-black hover:bg-gray-100 rounded-lg transition-all cursor-pointer font-medium'>
                                                <CreditCard className='h-4 w-4 mr-2' />
                                                Manage Subscription
                                                <ExternalLink className='h-4 w-4 ml-2' />
                                            </CustomerPortalLink>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='space-y-8'>
                                        <div className='flex items-center justify-between p-6 bg-slate-500/10 border border-slate-500/20 rounded-xl'>
                                            <div>
                                                <h4 className='font-semibold text-slate-300 text-lg'>Free Plan</h4>
                                                <p className='text-sm text-gray-300 mt-1'>
                                                    Upgrade to premium for higher limits and advanced features.
                                                </p>
                                            </div>
                                            <div className='flex items-center text-slate-400'>
                                                <CreditCard className='h-6 w-6' />
                                            </div>
                                        </div>

                                        {products ? (
                                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                                {products.pro250kRequests ? (
                                                    <div className='bg-black/20 border border-gray-700/30 rounded-xl p-6 hover:border-gray-600/50 transition-all'>
                                                        <h5 className='font-semibold text-white mb-2'>Pro 250K Plan</h5>
                                                        <p className='text-sm text-gray-300 mb-4'>
                                                            250,000 translation requests, unlimited projects &
                                                            namespaces
                                                        </p>
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro250kRequests.id]}
                                                            className='inline-flex items-center px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg transition-all cursor-pointer font-medium'>
                                                            <CreditCard className='h-4 w-4 mr-2' />
                                                            Upgrade to Pro 250K
                                                        </CheckoutLink>
                                                    </div>
                                                ) : null}

                                                {products.pro500kRequests ? (
                                                    <div className='bg-black/20 border border-gray-700/30 rounded-xl p-6 hover:border-gray-600/50 transition-all'>
                                                        <h5 className='font-semibold text-white mb-2'>Pro 500K Plan</h5>
                                                        <p className='text-sm text-gray-300 mb-4'>
                                                            500,000 translation requests, unlimited projects &
                                                            namespaces
                                                        </p>
                                                        <CheckoutLink
                                                            polarApi={api.polar}
                                                            productIds={[products.pro500kRequests.id]}
                                                            className='inline-flex items-center px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg transition-all cursor-pointer font-medium'>
                                                            <CreditCard className='h-4 w-4 mr-2' />
                                                            Upgrade to Pro 500K
                                                        </CheckoutLink>
                                                    </div>
                                                ) : null}

                                                <div className='md:col-span-2 bg-black/20 border border-gray-700/30 rounded-xl p-6 hover:border-gray-600/50 transition-all'>
                                                    <h5 className='font-semibold text-white mb-2'>Pro 1M+ Plans</h5>
                                                    <p className='text-sm text-gray-300 mb-4'>
                                                        1M+ translation requests, unlimited everything
                                                    </p>
                                                    <div className='flex flex-wrap gap-3'>
                                                        {products.pro1mRequests ? (
                                                            <CheckoutLink
                                                                polarApi={api.polar}
                                                                productIds={[products.pro1mRequests.id]}
                                                                className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all cursor-pointer font-medium'>
                                                                1M Requests
                                                            </CheckoutLink>
                                                        ) : null}
                                                        {products.pro2mRequests ? (
                                                            <CheckoutLink
                                                                polarApi={api.polar}
                                                                productIds={[products.pro2mRequests.id]}
                                                                className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all cursor-pointer font-medium'>
                                                                2M Requests
                                                            </CheckoutLink>
                                                        ) : null}
                                                        {products.pro10mRequests ? (
                                                            <CheckoutLink
                                                                polarApi={api.polar}
                                                                productIds={[products.pro10mRequests.id]}
                                                                className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all cursor-pointer font-medium'>
                                                                10M Requests
                                                            </CheckoutLink>
                                                        ) : null}
                                                        {products.pro50mRequests ? (
                                                            <CheckoutLink
                                                                polarApi={api.polar}
                                                                productIds={[products.pro50mRequests.id]}
                                                                className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all cursor-pointer font-medium'>
                                                                50M Requests
                                                            </CheckoutLink>
                                                        ) : null}
                                                        {products.pro100mRequests ? (
                                                            <CheckoutLink
                                                                polarApi={api.polar}
                                                                productIds={[products.pro100mRequests.id]}
                                                                className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all cursor-pointer font-medium'>
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
            <div className='sticky bottom-0'>
                <Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
            </div>
        </>
    );
}
