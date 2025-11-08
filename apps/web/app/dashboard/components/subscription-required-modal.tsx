'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useEffect } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { CheckoutLink } from '@convex-dev/polar/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { Key } from 'react-aria-components';
import { Label } from '@/components/ui/field';
import { CreditCardIcon } from '@heroicons/react/24/outline';

export function SubscriptionRequiredModal() {
    const { organization } = useOrganization();
    const [selectedPackage, setSelectedPackage] = useState<Key | null>('');

    const clerkId = organization?.id;

    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const products = useQuery(api.polar.getConfiguredProducts, !clerkId ? 'skip' : undefined);

    useEffect(() => {
        if (products && products.pro10kRequests) {
            setSelectedPackage(products.pro10kRequests.id);
        }
    }, [products]);

    // Don't show modal if workspace has premium subscription
    if (!workspace || workspace.isPremium) {
        return null;
    }

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'>
            <div className='bg-gray-950 border border-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 relative'>
                <div className='text-center mb-8'>
                    <div className='mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800'>
                        <CreditCardIcon className='h-8 w-8 text-white' />
                    </div>
                    <h2 className='text-3xl font-bold mb-3'>Subscription Required</h2>
                    <p className='text-gray-400 text-lg'>
                        To continue using Unlingo, please select and purchase a subscription plan.
                    </p>
                </div>

                <div className='space-y-6'>
                    <div className='bg-gray-900/50 border border-gray-800 rounded-lg p-6'>
                        <h3 className='text-xl font-semibold mb-4'>Choose Your Plan</h3>
                        <p className='text-gray-400 mb-6'>
                            All plans include 90 languages per version and access to premium features.
                        </p>

                        {products ? (
                            <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label>Select a subscription package</Label>
                                    <Select
                                        value={selectedPackage}
                                        onChange={setSelectedPackage}
                                        aria-label='Select a subscription package'>
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
                                </div>

                                {selectedPackage ? (
                                    <CheckoutLink polarApi={api.polar} productIds={[selectedPackage as string]}>
                                        <Button className='w-full'>
                                            Continue to Checkout
                                        </Button>
                                    </CheckoutLink>
                                ) : (
                                    <Button className='w-full' isDisabled>
                                        Select a plan to continue
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className='flex items-center justify-center py-8'>
                                <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                            </div>
                        )}
                    </div>

                    <div className='text-center'>
                        <p className='text-sm text-gray-500'>
                            Need help? <a href='mailto:support@unlingo.com' className='text-white hover:underline'>Contact our support team</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
