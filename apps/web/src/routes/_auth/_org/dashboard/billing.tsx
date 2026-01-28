import { AppSidebar } from '@/components/app-sidebar'
import { CheckoutLink, CustomerPortalLink } from '@/components/polar'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from '@/components/ui/progress'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { toastManager } from '@/components/ui/toast'
import { useOrganization } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@unlingo/backend/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { CreditCard } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export const Route = createFileRoute('/_auth/_org/dashboard/billing')({
    component: RouteComponent,
    head: () => ({
        meta: [
            {
                title: 'Usage & Billing - Unlingo',
            },
            {
                name: 'description',
                content: 'View your usage statistics, manage your subscription, and handle billing for your Unlingo account.',
            },
            {
                property: 'og:type',
                content: 'website',
            },
            {
                property: 'og:title',
                content: 'Usage & Billing - Unlingo',
            },
            {
                property: 'og:description',
                content: 'View your usage statistics, manage your subscription, and handle billing for your Unlingo account.',
            },
            {
                property: 'og:url',
                content: 'https://unlingo.com/dashboard/billing',
            },
            {
                property: 'og:image',
                content: '/og.png',
            },
            {
                name: 'twitter:card',
                content: 'summary_large_image',
            },
            {
                name: 'twitter:title',
                content: 'Usage & Billing - Unlingo',
            },
            {
                name: 'twitter:description',
                content: 'View your usage statistics, manage your subscription, and handle billing for your Unlingo account.',
            },
            {
                name: 'twitter:image',
                content: '/og.png',
            },
            {
                name: 'robots',
                content: 'noindex, nofollow',
            },
        ],
    }),
})

function RouteComponent() {
    const { organization } = useOrganization();

    const [contactEmail, setContactEmail] = useState('');
    const [originalContactEmail, setOriginalContactEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedPackage, setSelectedPackage] = useState<string | null>('');

    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    const usageData = useQuery(
        api.workspaces.getCurrentUsage,
        clerkId && workspace ? { clerkId, workspaceUsageId: workspace.workspaceUsageId } : 'skip'
    );

    const products = useQuery(api.polarActions.getConfiguredProducts, !clerkId ? 'skip' : undefined);

    const updateContactEmail = useMutation(api.workspaces.updateWorkspaceContactEmail);

    const hasChanges = contactEmail.trim() !== originalContactEmail;

    const filteredProducts = useMemo(() => {
        if (!products) return [];

        return Object.values(products)
            .filter(p => p !== undefined)
            .map(p => ({ value: p.polarId, label: p.name }));
    }, [products]);

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
            toastManager.add({
                description: 'Contact email updated successfully',
                type: 'success',
            });
        } catch (error) {
            toastManager.add({
                description: `Failed to update contact email: ${error}`,
                type: 'error',
            });
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
            case 10000:
                name = products.pro5?.name;
                break;
            case 50000:
                name = products.pro12?.name;
                break;
            case 100000:
                name = products.pro25?.name;
                break;
            case 200000:
                name = products.pro50?.name;
                break;
            case 350000:
                name = products.pro75?.name;
                break;
            case 500000:
                name = products.pro100?.name;
                break;
            case 1500000:
                name = products.pro250?.name;
                break;
            case 4000000:
                name = products.pro500?.name;
                break;
            case 10000000:
                name = products.pro1000?.name;
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
        if (products && products.pro5) {
            setSelectedPackage(products.pro5.polarId);
        }
    }, [products]);

    return (
        <SidebarProvider>
            <AppSidebar activeItem='billing' />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:my-auto"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink render={<Link to='/dashboard' />}>
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Usage & Billing</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    {workspace ? (
                        <>
                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Contact Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Form>
                                            <div className='flex gap-2 items-end'>
                                                <Field>
                                                    <FieldLabel>Contact Email</FieldLabel>
                                                    <Input
                                                        placeholder="contact@company.com"
                                                        type="email"
                                                        value={contactEmail}
                                                        onChange={e => setContactEmail(e.target.value)}
                                                        className='flex-1'
                                                        required
                                                        readOnly={!isEditing}
                                                    />
                                                </Field>
                                                <Button
                                                    onClick={() => {
                                                        if (!isEditing) {
                                                            setIsEditing(true);
                                                            return;
                                                        }

                                                        handleSave();
                                                    }}
                                                    disabled={isEditing && (!hasChanges || !contactEmail.trim() || isSaving)}>
                                                    {!isEditing ? 'Edit' : isSaving ? 'Saving...' : 'Save'}
                                                </Button>
                                                {isEditing ? (
                                                    <Button variant='outline' onClick={handleCancel} disabled={isSaving}>
                                                        Cancel
                                                    </Button>
                                                ) : null}
                                            </div>
                                            <p className='text-xs text-gray-400'>
                                                This email will be used for billing and important notifications.
                                            </p>
                                        </Form>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <div className='flex items-center justify-between flex-wrap gap-2'>
                                            <CardTitle>Billing & Subscription</CardTitle>
                                            {workspace.isPremium ? (
                                                <CustomerPortalLink>
                                                    <Button>Manage Subscription</Button>
                                                </CustomerPortalLink>
                                            ) : products ? (
                                                <div className='flex items-center gap-2'>
                                                    <Select
                                                        aria-label="Select plan"
                                                        items={filteredProducts}
                                                        value={selectedPackage}
                                                        onValueChange={setSelectedPackage}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectPopup alignItemWithTrigger={false}>
                                                            {filteredProducts.map(({ label, value }) => (
                                                                <SelectItem key={value} value={value}>
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectPopup>
                                                    </Select>
                                                    {selectedPackage ? (
                                                        <CheckoutLink
                                                            productIds={[selectedPackage as string]}>
                                                            <Button>Upgrade</Button>
                                                        </CheckoutLink>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </CardHeader>
                                    <CardContent className='space-y-4'>
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
                                                    <CreditCard />
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
                                                        <CreditCard />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            <Card>
                                <CardHeader>
                                    <div className='flex items-center justify-between'>
                                        <CardTitle>Usage & Limits • {usageData?.month || 'Current month'}</CardTitle>
                                        <Badge variant={workspace.isPremium ? 'success' : 'secondary'}>
                                            {workspace.isPremium ? 'Premium Plan' : 'Free Plan'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Translation Keys</TableCell>
                                                <TableCell>
                                                    <Progress value={Math.min(
                                                        (workspace.currentUsage.translationKeys / workspace.limits.translationKeys) * 100
                                                    )}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <ProgressLabel>
                                                                {`${workspace.currentUsage.translationKeys.toLocaleString()}/${workspace.limits.translationKeys.toLocaleString()}`}
                                                            </ProgressLabel>
                                                            <ProgressValue />
                                                        </div>
                                                        <ProgressTrack>
                                                            <ProgressIndicator />
                                                        </ProgressTrack>
                                                    </Progress>
                                                </TableCell>
                                            </TableRow>
                                            {usageData ? (
                                                <TableRow>
                                                    <TableCell>Translation Requests</TableCell>
                                                    <TableCell>
                                                        <Progress value={Math.min(
                                                            (usageData.requests / workspace.limits.requests) * 100
                                                        )}>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <ProgressLabel>
                                                                    {`${usageData.requests.toLocaleString()}/${workspace.limits.requests.toLocaleString()}`}
                                                                </ProgressLabel>
                                                                <ProgressValue />
                                                            </div>
                                                            <ProgressTrack>
                                                                <ProgressIndicator />
                                                            </ProgressTrack>
                                                        </Progress>
                                                    </TableCell>
                                                </TableRow>
                                            ) : null}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Spinner />
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
