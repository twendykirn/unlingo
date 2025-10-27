'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { IconCreditCard, IconOpenLink } from '@intentui/icons';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { useOrganization } from '@clerk/nextjs';
import { toast } from 'sonner';
import { CheckoutLink, CustomerPortalLink } from '@convex-dev/polar/react';
import { Form } from '@/components/ui/form';
import { TextField } from '@/components/ui/text-field';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DescriptionList } from '@/components/ui/description-list';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { Key } from 'react-aria-components';

export default function BillingPage() {
    const { organization } = useOrganization();

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [contactEmail, setContactEmail] = useState('');
    const [originalContactEmail, setOriginalContactEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedPackage, setSelectedPackage] = useState<Key | null>('');

    const clerkId = organization?.id;

    const usageData = useQuery(
        api.workspaces.getCurrentUsage,
        clerkId && workspace ? { clerkId, workspaceUsageId: workspace.workspaceUsageId } : 'skip'
    );

    const products = useQuery(api.polar.getConfiguredProducts, !clerkId ? 'skip' : undefined);

    const updateContactEmail = useMutation(api.workspaces.updateWorkspaceContactEmail);

    const hasChanges = contactEmail.trim() !== originalContactEmail;

    const handleSave = async () => {
        if (!contactEmail.trim() || !clerkId) return;

        setIsSaving(true);
        try {
            await updateContactEmail({
                clerkId,
                contactEmail: contactEmail.trim(),
            });

            setOriginalContactEmail(contactEmail.trim());
            setIsEditing(false);
            toast.error('Contact email updated successfully');
        } catch (error) {
            toast.error(`Failed to update contact email: ${error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (!originalContactEmail) return;

        setContactEmail(originalContactEmail);
        setIsEditing(false);
    };

    const getActivePackage = (requests?: number) => {
        if (!products || !requests) return 'Custom Package';

        let name = undefined;

        switch (requests) {
            case 50000:
                name = products.pro50kRequests?.name;
                break;
            case 250000:
                name = products.pro250kRequests?.name;
                break;
            case 500000:
                name = products.pro500kRequests?.name;
                break;
            case 1000000:
                name = products.pro1mRequests?.name;
                break;
            case 2000000:
                name = products.pro2mRequests?.name;
                break;
            case 10000000:
                name = products.pro10mRequests?.name;
                break;
            case 50000000:
                name = products.pro50mRequests?.name;
                break;
            case 100000000:
                name = products.pro100mRequests?.name;
                break;
            default:
                name = 'Custom Package';
        }

        return name || 'Custom Package';
    };

    useEffect(() => {
        if (workspace) {
            setContactEmail(workspace.contactEmail);
            setOriginalContactEmail(workspace.contactEmail);
        }
    }, [workspace]);

    useEffect(() => {
        if (products && products.pro50kRequests) {
            setSelectedPackage(products.pro50kRequests.id);
        }
    }, [products]);

    return (
        <DashboardSidebar activeItem='billing' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
                        <Card>
                            <Card.Header>
                                <Card.Title>Contact Information</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <Form>
                                    <div className='flex gap-2 items-end'>
                                        <TextField
                                            label='Contact Email'
                                            type='text'
                                            placeholder='contact@company.com'
                                            value={contactEmail}
                                            onChange={setContactEmail}
                                            isRequired
                                            isReadOnly={!isEditing}
                                            className='flex-1'
                                        />
                                        <Button
                                            onClick={() => {
                                                if (!isEditing) {
                                                    setIsEditing(true);
                                                    return;
                                                }

                                                handleSave();
                                            }}
                                            isDisabled={isEditing && (!hasChanges || !contactEmail.trim() || isSaving)}>
                                            {!isEditing ? 'Edit' : isSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                        {isEditing ? (
                                            <Button intent='outline' onClick={handleCancel} isDisabled={isSaving}>
                                                Cancel
                                            </Button>
                                        ) : null}
                                    </div>
                                    <p className='text-xs text-gray-400 mt-3'>
                                        This email will be used for billing and important notifications.
                                    </p>
                                </Form>
                            </Card.Content>
                        </Card>
                        <Card>
                            <Card.Header>
                                <div className='flex items-center justify-between flex-wrap gap-2'>
                                    <Card.Title>Billing & Subscription</Card.Title>
                                    {workspace.isPremium ? (
                                        <CustomerPortalLink
                                            polarApi={{
                                                generateCustomerPortalUrl: api.polar.generateCustomerPortalUrl,
                                            }}>
                                            <Button>
                                                Manage Subscription
                                                <IconOpenLink />
                                            </Button>
                                        </CustomerPortalLink>
                                    ) : products ? (
                                        <div className='flex items-center gap-2'>
                                            <Select
                                                selectedKey={selectedPackage}
                                                onSelectionChange={setSelectedPackage}
                                                aria-label='Select a subscription package'
                                                placeholder='Select a movie'>
                                                <SelectTrigger />
                                                <SelectContent
                                                    items={Object.values(products)
                                                        .filter(p => p !== undefined)
                                                        .map(p => ({ id: p.id, title: p.name }))}>
                                                    {item => (
                                                        <SelectItem id={item.id} textValue={item.title}>
                                                            {item.title}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {selectedPackage ? (
                                                <CheckoutLink
                                                    polarApi={api.polar}
                                                    productIds={[selectedPackage as string]}>
                                                    <Button>Upgrade</Button>
                                                </CheckoutLink>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </Card.Header>
                            <Card.Content className='space-y-4'>
                                {workspace.isPremium ? (
                                    <div className='flex items-center justify-between p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl'>
                                        <div>
                                            <h4 className='font-semibold text-emerald-400 text-lg'>
                                                {getActivePackage(workspace.limits.requests)}
                                            </h4>
                                            <p className='text-sm text-gray-300 mt-1'>
                                                You have access to all premium features and higher limits.
                                            </p>
                                        </div>
                                        <div className='flex items-center text-emerald-400'>
                                            <IconCreditCard />
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
                                                <IconCreditCard />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card.Content>
                        </Card>
                    </div>
                    <Card>
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <Card.Title>Usage & Limits • {usageData?.month || 'Current month'}</Card.Title>
                                <Badge intent={workspace.isPremium ? 'success' : 'secondary'}>
                                    {workspace.isPremium ? 'Premium Plan' : 'Free Plan'}
                                </Badge>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <DescriptionList>
                                <DescriptionList.Term>Projects</DescriptionList.Term>
                                <DescriptionList.Details>
                                    <ProgressBar
                                        value={Math.min(
                                            (workspace.currentUsage.projects / workspace.limits.projects) * 100
                                        )}
                                        label={`${workspace.currentUsage.projects}/${workspace.limits.projects}`}
                                    />
                                </DescriptionList.Details>
                                {usageData ? (
                                    <>
                                        <DescriptionList.Term>Translation Requests</DescriptionList.Term>
                                        <DescriptionList.Details>
                                            <ProgressBar
                                                value={Math.min((usageData.requests / workspace.limits.requests) * 100)}
                                                label={`${usageData.requests}/${workspace.limits.requests.toLocaleString()}`}
                                            />
                                        </DescriptionList.Details>
                                    </>
                                ) : null}
                                <DescriptionList.Term>Namespaces per Project</DescriptionList.Term>
                                <DescriptionList.Details>
                                    {workspace.limits.namespacesPerProject}
                                </DescriptionList.Details>
                                <DescriptionList.Term>Languages per Version</DescriptionList.Term>
                                <DescriptionList.Details>
                                    {workspace.limits.languagesPerVersion}
                                </DescriptionList.Details>
                            </DescriptionList>
                        </Card.Content>
                    </Card>
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
