'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrganization, useClerk } from '@clerk/nextjs';
import { motion } from 'motion/react';
import { ChartLine, House, Settings, User, Building2, Loader2, Globe, Code, Activity, Database } from 'lucide-react';
import Dock from '@/components/ui/dock';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from '@/components/ui/chart';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { CartesianGrid, XAxis, YAxis, Bar, BarChart, Line, ComposedChart } from 'recharts';

type MonthlyPoint = { time: string; success: number; total_requests: number };
type NamespacePoint = { namespace: string; success: number };
type ApiCallPoint = { apiCallName: string; success: number; total_requests: number };
type LanguagePoint = { languageCode: string; success: number };

export default function AnalyticsPage() {
    const { organization } = useOrganization();
    const { openOrganizationProfile, openUserProfile } = useClerk();

    const getMonthlySuccess = useAction(api.analytics.getMonthlySuccess);
    const getTopNamespacesAction = useAction(api.analytics.getTopNamespacesAction);
    const getTopApiCallsAction = useAction(api.analytics.getTopApiCallsAction);
    const getTopLanguagesAction = useAction(api.analytics.getTopLanguagesAction);

    const [months, setMonths] = useState(6);
    const [loading, setLoading] = useState(true);
    const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
    const [topNamespaces, setTopNamespaces] = useState<NamespacePoint[]>([]);
    const [topApiCalls, setTopApiCalls] = useState<ApiCallPoint[]>([]);
    const [topLanguages, setTopLanguages] = useState<LanguagePoint[]>([]);

    const items = [
        { icon: <House size={18} />, label: 'Dashboard', onClick: () => window.location.assign('/dashboard') },
        {
            icon: <ChartLine size={18} />,
            label: 'Analytics',
            onClick: () => window.location.assign('/dashboard/analytics'),
        },
        {
            icon: <Settings size={18} />,
            label: 'Settings',
            onClick: () => window.location.assign('/dashboard/settings'),
        },
        { icon: <Building2 size={18} />, label: 'Organization', onClick: () => openOrganizationProfile() },
        { icon: <User size={18} />, label: 'Profile', onClick: () => openUserProfile() },
    ];

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                if (!organization?.id) return;

                const [monthlyData, namespacesData, apiCallsData, languagesData] = await Promise.all([
                    getMonthlySuccess({ months }),
                    getTopNamespacesAction({ months, limit: 8 }),
                    getTopApiCallsAction({ months, limit: 6 }),
                    getTopLanguagesAction({ months, limit: 8 }),
                ]);

                if (!cancelled) {
                    setMonthly(monthlyData?.points || []);
                    setTopNamespaces(namespacesData?.points || []);
                    setTopApiCalls(apiCallsData?.points || []);
                    setTopLanguages(languagesData?.points || []);
                }
            } catch (e) {
                console.error('Analytics loading error:', e);
                if (!cancelled) {
                    setMonthly([]);
                    setTopNamespaces([]);
                    setTopApiCalls([]);
                    setTopLanguages([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (organization) {
            load();
        }
        return () => {
            cancelled = true;
        };
    }, [organization, months, getMonthlySuccess, getTopNamespacesAction, getTopApiCallsAction, getTopLanguagesAction]);

    const monthlyChartData = useMemo(() => {
        return monthly
            .map(p => {
                const d = new Date(p.time as unknown as string);
                const label = isNaN(d.getTime())
                    ? String(p.time)
                    : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                return {
                    label,
                    success: Number(p.success || 0),
                    total: Number(p.total_requests || 0),
                };
            })
            .reverse();
    }, [monthly]);

    const apiCallsChartData = useMemo(() => {
        return topApiCalls.map(c => ({
            name: c.apiCallName || 'unknown',
            success: Number(c.success || 0),
        }));
    }, [topApiCalls]);

    const namespacesChartData = useMemo(() => {
        return topNamespaces.map(n => ({
            name: n.namespace || 'unknown',
            success: Number(n.success || 0),
        }));
    }, [topNamespaces]);

    const languagesChartData = useMemo(() => {
        return topLanguages.map(l => ({
            name: (l.languageCode || 'unknown').toUpperCase(),
            success: Number(l.success || 0),
        }));
    }, [topLanguages]);

    const monthlyConfig = useMemo(
        () => ({
            success: { label: 'Successful', color: 'hsl(142 71% 45%)' },
            total: { label: 'Total', color: 'hsl(217 91% 60%)' },
        }),
        []
    );

    const singleSeriesConfig = useMemo(
        () => ({
            success: { label: 'Successful', color: 'hsl(142 71% 45%)' },
        }),
        []
    );

    const totalRequests = useMemo(() => monthly.reduce((sum, p) => sum + (p.total_requests || 0), 0), [monthly]);
    const successfulRequests = useMemo(() => monthly.reduce((sum, p) => sum + (p.success || 0), 0), [monthly]);
    const successRate = useMemo(
        () => (totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0),
        [totalRequests, successfulRequests]
    );

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
                        <ChartLine className='h-5 w-5 text-gray-400' />
                        <h2 className='text-xl font-semibold text-white'>Analytics</h2>
                    </div>
                </div>
            </header>

            <div className='flex-1 p-8 pt-24 pb-56'>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className='max-w-5xl mx-auto space-y-6'>
                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm space-y-6'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-6'>
                                <div className='text-center'>
                                    <div className='text-2xl font-bold text-white'>
                                        {totalRequests.toLocaleString()}
                                    </div>
                                    <div className='text-xs text-gray-400'>Total Requests</div>
                                </div>
                                <div className='text-center'>
                                    <div className='text-2xl font-bold text-emerald-400'>
                                        {successfulRequests.toLocaleString()}
                                    </div>
                                    <div className='text-xs text-gray-400'>Successful</div>
                                </div>
                                <div className='text-center'>
                                    <div className='text-2xl font-bold text-blue-400'>{successRate}%</div>
                                    <div className='text-xs text-gray-400'>Success Rate</div>
                                </div>
                            </div>
                            <Select value={String(months)} onValueChange={v => setMonths(Number(v))}>
                                <SelectTrigger size='default'>
                                    <SelectValue placeholder='Timeframe' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='3'>Last 3 months</SelectItem>
                                    <SelectItem value='6'>Last 6 months</SelectItem>
                                    <SelectItem value='12'>Last 12 months</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
                                <Activity className='h-5 w-5 text-blue-400' />
                                API Usage Over Time
                            </h3>
                            {loading ? <Loader2 className='h-4 w-4 animate-spin text-gray-400' /> : null}
                        </div>
                        {monthlyChartData.length === 0 ? (
                            <div className='text-sm text-gray-400 text-center py-12'>
                                No data available for this timeframe.
                            </div>
                        ) : (
                            <ChartContainer config={monthlyConfig} className='h-80'>
                                <ComposedChart data={monthlyChartData} margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray='3 3' />
                                    <XAxis
                                        dataKey='label'
                                        interval={'preserveStartEnd'}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Bar dataKey='total' fill='var(--color-total)' radius={[4, 4, 0, 0]} />
                                    <Line dataKey='success' stroke='var(--color-success)' strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ChartContainer>
                        )}
                    </div>

                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
                                <Code className='h-5 w-5 text-purple-400' />
                                API Calls
                            </h3>
                            {loading ? <Loader2 className='h-4 w-4 animate-spin text-gray-400' /> : null}
                        </div>
                        {apiCallsChartData.length === 0 ? (
                            <div className='text-sm text-gray-400'>No data yet.</div>
                        ) : (
                            <ChartContainer config={singleSeriesConfig} className='h-64'>
                                <BarChart data={apiCallsChartData} margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray='3 3' />
                                    <XAxis
                                        dataKey='name'
                                        tickLine={false}
                                        axisLine={false}
                                        interval={0}
                                        height={60}
                                        angle={-20}
                                        textAnchor='end'
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey='success' fill='var(--color-success)' radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </div>

                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
                                <Database className='h-5 w-5 text-blue-400' />
                                Namespaces
                            </h3>
                            {loading ? <Loader2 className='h-4 w-4 animate-spin text-gray-400' /> : null}
                        </div>
                        {namespacesChartData.length === 0 ? (
                            <div className='text-sm text-gray-400'>No data yet.</div>
                        ) : (
                            <ChartContainer config={singleSeriesConfig} className='h-64'>
                                <BarChart data={namespacesChartData} margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray='3 3' />
                                    <XAxis
                                        dataKey='name'
                                        tickLine={false}
                                        axisLine={false}
                                        interval={0}
                                        height={60}
                                        angle={-20}
                                        textAnchor='end'
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey='success' fill='var(--color-success)' radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </div>

                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
                                <Globe className='h-5 w-5 text-emerald-400' />
                                Languages
                            </h3>
                            {loading ? <Loader2 className='h-4 w-4 animate-spin text-gray-400' /> : null}
                        </div>
                        {languagesChartData.length === 0 ? (
                            <div className='text-sm text-gray-400'>No data yet.</div>
                        ) : (
                            <ChartContainer config={singleSeriesConfig} className='h-64'>
                                <BarChart data={languagesChartData} margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray='3 3' />
                                    <XAxis
                                        dataKey='name'
                                        tickLine={false}
                                        axisLine={false}
                                        interval={0}
                                        height={60}
                                        angle={-20}
                                        textAnchor='end'
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey='success' fill='var(--color-success)' radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </div>
                </motion.div>
            </div>

            <div className='sticky bottom-0'>
                <Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
            </div>
        </div>
    );
}
