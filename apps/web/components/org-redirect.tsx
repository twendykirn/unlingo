'use client';

import { useUser, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';

export function OrgRedirect() {
    const { user, isLoaded: userLoaded } = useUser();
    const {
        userMemberships,
        isLoaded: orgListLoaded,
        setActive,
    } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });
    const router = useRouter();
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');

    const userOrgs = useMemo(() => {
        if (!userLoaded || !orgListLoaded || !user) return null;

        return userMemberships.data.filter(org => org.organization);
    }, [userLoaded, orgListLoaded, user, userMemberships.data]);

    useEffect(() => {
        if (!userOrgs) return;

        if (userOrgs.length === 0) {
            router.push('/dashboard/new');
        } else if (userOrgs.length === 1) {
            const org = userOrgs[0]?.organization;
            if (org) {
                setActive?.({ organization: org });
                router.push('/dashboard');
            }
        }
    }, [userOrgs, setActive, router]);

    const handleOrgSelection = async (orgId: string) => {
        const selectedOrg = userMemberships.data?.find(org => org.organization?.id === orgId)?.organization;
        if (selectedOrg) {
            await setActive?.({ organization: selectedOrg });
            router.push('/dashboard');
        }
    };

    if (!userLoaded || !orgListLoaded) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    if (userOrgs && userOrgs.length <= 1) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Setting up your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-black text-white flex items-center justify-center p-6'>
            {userOrgs ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className='w-full max-w-md space-y-8'>
                    <div className='text-center'>
                        <div className='mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-6'>
                            <Building2 className='h-8 w-8 text-white' />
                        </div>
                        <h1 className='text-3xl font-bold mb-2'>Select Organization</h1>
                        <p className='text-gray-400'>Choose which organization you'd like to work with</p>
                    </div>
                    <motion.div
                        className='space-y-3'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}>
                        {userOrgs.map(orgMembership => {
                            const org = orgMembership.organization;
                            return (
                                <motion.div
                                    key={org.id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                                        selectedOrgId === org.id
                                            ? 'border-white bg-gray-900'
                                            : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
                                    }`}
                                    onClick={() => setSelectedOrgId(org.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center space-x-3'>
                                            <div className='w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center'>
                                                <Building2 className='h-5 w-5 text-gray-300' />
                                            </div>
                                            <div>
                                                <h3 className='font-medium text-white'>{org.name}</h3>
                                                <p className='text-sm text-gray-400'>
                                                    {orgMembership.role || 'Member'}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedOrgId === org.id && (
                                            <div className='w-4 h-4 bg-white rounded-full flex items-center justify-center'>
                                                <div className='w-2 h-2 bg-black rounded-full'></div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                    <Button
                        onClick={() => handleOrgSelection(selectedOrgId)}
                        disabled={!selectedOrgId}
                        className='w-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed py-3'>
                        <div className='flex items-center justify-center space-x-2'>
                            <span>Continue</span>
                            <ArrowRight className='h-4 w-4' />
                        </div>
                    </Button>
                    {userOrgs.length < 5 ? (
                        <motion.div
                            className='text-center'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}>
                            <button
                                onClick={() => router.push('/dashboard/new')}
                                className='text-sm text-gray-400 hover:text-white transition-colors underline'>
                                Or create a new organization
                            </button>
                        </motion.div>
                    ) : null}
                </motion.div>
            ) : null}
        </div>
    );
}
