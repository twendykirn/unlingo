'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import DashboardSidebar from '../components/dashboard-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key } from 'react-aria-components';
import { AreaChart } from '@/components/ui/area-chart';
import { BarChart } from '@/components/ui/bar-chart';
import { Container } from '@/components/ui/container';
import { Loader } from '@/components/ui/loader';

type MonthlyPoint = { time: string; success: number; total_requests: number };
type NamespacePoint = { namespace: string; success: number };
type ApiCallPoint = { apiCallName: string; success: number; total_requests: number };
type LanguagePoint = { languageCode: string; success: number };

export default function AnalyticsPage() {
    const { organization } = useOrganization();

    const getMonthlySuccess = useAction(api.analytics.getMonthlySuccess);
    const getTopNamespacesAction = useAction(api.analytics.getTopNamespacesAction);
    const getTopApiCallsAction = useAction(api.analytics.getTopApiCallsAction);
    const getTopLanguagesAction = useAction(api.analytics.getTopLanguagesAction);

    const [months, setMonths] = useState<Key>(6);
    const [loading, setLoading] = useState(true);
    const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
    const [topNamespaces, setTopNamespaces] = useState<NamespacePoint[]>([]);
    const [topApiCalls, setTopApiCalls] = useState<ApiCallPoint[]>([]);
    const [topLanguages, setTopLanguages] = useState<LanguagePoint[]>([]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                if (!organization?.id) return;

                const [monthlyData, namespacesData, apiCallsData, languagesData] = await Promise.all([
                    getMonthlySuccess({ months: Number(months) }),
                    getTopNamespacesAction({ months: Number(months), limit: 8 }),
                    getTopApiCallsAction({ months: Number(months), limit: 6 }),
                    getTopLanguagesAction({ months: Number(months), limit: 8 }),
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
                const d = new Date(p.time);
                const label = isNaN(d.getTime()) ? String(p.time) : d.toLocaleDateString('en-US', { month: 'short' });
                return {
                    label,
                    success: Number(p.success || 0),
                    total: Number(p.total_requests || 0),
                };
            })
            .reverse();
    }, [monthly]);

    const apiCallsChartData = useMemo(() => {
        return topApiCalls
            ? topApiCalls.map(c => ({
                  name: c.apiCallName || 'unknown',
                  success: Number(c.success || 0),
              }))
            : [];
    }, [topApiCalls]);

    const namespacesChartData = useMemo(() => {
        return topNamespaces
            ? topNamespaces.map(n => ({
                  name: n.namespace || 'unknown',
                  success: Number(n.success || 0),
              }))
            : [];
    }, [topNamespaces]);

    const languagesChartData = useMemo(() => {
        return topLanguages
            ? topLanguages.map(l => ({
                  name: (l.languageCode || 'unknown').toUpperCase(),
                  success: Number(l.success || 0),
              }))
            : [];
    }, [topLanguages]);

    const monthlyConfig = useMemo(
        () => ({
            success: { label: 'Successful' },
            total: { label: 'Total' },
        }),
        []
    );

    const singleSeriesConfig = useMemo(
        () => ({
            success: { label: 'Successful' },
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
            <Container className='min-h-screen bg-black text-white flex items-center justify-center'>
                <Loader />
            </Container>
        );
    }

    return (
        <DashboardSidebar activeItem='analytics'>
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <div className='flex flex-col gap-1'>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>Track your API usage and languages.</CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Select
                                aria-label='Date range in months'
                                placeholder='Select a date range'
                                value={months}
                                onChange={value => {
                                    if (value) {
                                        setMonths(value);
                                    }
                                }}
                                defaultValue={6}>
                                <SelectTrigger />
                                <SelectContent
                                    items={[
                                        { id: 3, name: 'Last 3 months' },
                                        { id: 6, name: 'Last 6 months' },
                                        { id: 12, name: 'Last 12 months' },
                                    ]}>
                                    {item => (
                                        <SelectItem id={item.id} textValue={item.name}>
                                            {item.name}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle>API Usage</CardTitle>
                                    <CardDescription>Success rate is {successRate}%.</CardDescription>
                                </div>
                                {loading ? <Loader /> : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <AreaChart
                                className='aspect-video h-56 min-h-[224px] sm:h-72 sm:min-h-[288px]'
                                data={monthlyChartData}
                                dataKey='label'
                                xAxisProps={{ interval: 0 }}
                                config={monthlyConfig}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <CardTitle>API Calls</CardTitle>
                                {loading ? <Loader /> : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <BarChart
                                className='aspect-video h-56 min-h-[224px] sm:h-72 sm:min-h-[288px]'
                                data={apiCallsChartData}
                                dataKey='name'
                                xAxisProps={{ interval: 0 }}
                                config={singleSeriesConfig}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <CardTitle>Namespaces</CardTitle>
                                {loading ? <Loader /> : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <BarChart
                                className='aspect-video h-56 min-h-[224px] sm:h-72 sm:min-h-[288px]'
                                data={namespacesChartData}
                                dataKey='name'
                                xAxisProps={{ interval: 0 }}
                                config={singleSeriesConfig}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <CardTitle>Languages</CardTitle>
                                {loading ? <Loader /> : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <BarChart
                                className='aspect-video h-56 min-h-[224px] sm:h-72 sm:min-h-[288px]'
                                data={languagesChartData}
                                dataKey='name'
                                xAxisProps={{ interval: 0 }}
                                config={singleSeriesConfig}
                            />
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </DashboardSidebar>
    );
}
