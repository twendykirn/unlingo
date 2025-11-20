'use client';

import { Fragment, useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { GridList, GridListItem } from '@/components/ui/grid-list';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { useDateFormatter } from '@react-aria/i18n';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Selection } from 'react-aria-components';

type TimeRange = '24h' | '7d' | '30d';

interface OpenpanelEvent {
    id: string;
    name: string;
    createdAt: string;
    properties: Record<string, any>;
}

function getDateRange(range: TimeRange) {
    const end = new Date();
    const start = new Date();

    switch (range) {
        case '24h':
            start.setHours(start.getHours() - 24);
            break;
        case '7d':
            start.setDate(start.getDate() - 7);
            break;
        case '30d':
            start.setDate(start.getDate() - 30);
            break;
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

export default function LogsPage() {
    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);

    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [events, setEvents] = useState<OpenpanelEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<OpenpanelEvent | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));

    const getEvents = useAction(api.analytics.getEvents);

    const isPremium = workspace?.isPremium || false;

    const formatter = useDateFormatter({ dateStyle: 'short', timeStyle: 'short' });

    const loadEvents = async () => {
        if (!workspace) return;

        setLoading(true);
        try {
            const dateRange = getDateRange(timeRange);

            if (!dateRange.start || !dateRange.end) {
                throw new Error('Invalid date range');
            }

            const result = await getEvents({
                start: dateRange.start,
                end: dateRange.end,
                page,
                limit: 50,
                workspaceId: workspace._id,
            });

            const newHasMore = result.meta.current !== result.meta.pages;

            if (result.data.length !== 0) {
                setEvents(prev => (page === 1 ? result.data : [...prev, ...result.data]));
            }
            setHasMore(newHasMore);
        } catch (e) {
            console.error('Failed to load events:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace, timeRange, page, getEvents]);

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    const handleEventSelect = (event: OpenpanelEvent) => {
        setSelectedEvent(event);
        setIsSheetOpen(true);
    };

    return (
        <DashboardSidebar activeItem='analytics' onWorkspaceChange={setWorkspace}>
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <div className='flex flex-col gap-1'>
                            <CardTitle>Logs</CardTitle>
                            <CardDescription>View all events tracked for your workspace.</CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                            <ButtonGroup>
                                <Button
                                    intent='secondary'
                                    isDisabled={timeRange === '24h'}
                                    isPending={loading}
                                    onPress={() => setTimeRange('24h')}>
                                    24H
                                </Button>
                                <Button
                                    intent='secondary'
                                    isDisabled={timeRange === '7d'}
                                    isPending={loading}
                                    onPress={() => setTimeRange('7d')}>
                                    7D
                                </Button>
                                {isPremium && (
                                    <Button
                                        intent='secondary'
                                        isDisabled={timeRange === '30d'}
                                        isPending={loading}
                                        onPress={() => setTimeRange('30d')}>
                                        30D
                                    </Button>
                                )}
                            </ButtonGroup>
                            <Button
                                intent='secondary'
                                isPending={loading}
                                onPress={() => {
                                    const currentPage = page;
                                    setPage(1);

                                    if (currentPage === 1) {
                                        loadEvents();
                                    }
                                }}>
                                <ArrowPathIcon />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                    {loading ? (
                        <div className='flex items-center justify-center py-12'>
                            <Loader />
                        </div>
                    ) : events.length === 0 ? (
                        <div className='flex items-center justify-center py-12 text-muted-fg'>
                            No events found for the selected time range.
                        </div>
                    ) : (
                        <>
                            <GridList
                                aria-label='Logs'
                                selectionMode='single'
                                selectedKeys={selectedKeys}
                                onSelectionChange={keys => {
                                    const event = events.find(e => e.id === Array.from(keys)[0]);
                                    if (event) handleEventSelect(event);

                                    setSelectedKeys(keys);
                                }}>
                                {events.map(event => (
                                    <GridListItem key={event.id} id={event.id}>
                                        <div className='flex flex-col gap-1'>
                                            <div className='font-medium'>{event.name}</div>
                                            <div className='text-sm text-muted-fg'>
                                                {formatter.format(new Date(event.createdAt))}
                                            </div>
                                        </div>
                                    </GridListItem>
                                ))}
                            </GridList>

                            {hasMore ? (
                                <div className='flex items-center justify-center py-4'>
                                    <Button onPress={handleLoadMore} isDisabled={loading}>
                                        {loading ? 'Loading...' : 'Load More'}
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>

            <Sheet
                isOpen={isSheetOpen}
                onOpenChange={value => {
                    if (!value) {
                        setSelectedEvent(null);
                        setSelectedKeys(new Set([]));
                    }

                    setIsSheetOpen(value);
                }}>
                <SheetContent className='min-w-[750px]'>
                    {selectedEvent ? (
                        <>
                            <SheetHeader>
                                <SheetTitle>Event Details</SheetTitle>
                            </SheetHeader>
                            <SheetBody>
                                <DescriptionList>
                                    <DescriptionTerm>Event Name</DescriptionTerm>
                                    <DescriptionDetails>{selectedEvent.name}</DescriptionDetails>
                                    <DescriptionTerm>createdAt</DescriptionTerm>
                                    <DescriptionDetails>
                                        {formatter.format(new Date(selectedEvent.createdAt))}
                                    </DescriptionDetails>
                                    {Object.entries(selectedEvent.properties).map(entries => {
                                        const value =
                                            entries[0] === 'timestamp'
                                                ? formatter.format(new Date(parseFloat(entries[1])))
                                                : entries[1];

                                        return (
                                            <Fragment key={entries[0]}>
                                                <DescriptionTerm>{entries[0]}</DescriptionTerm>
                                                <DescriptionDetails>{value}</DescriptionDetails>
                                            </Fragment>
                                        );
                                    })}
                                </DescriptionList>
                            </SheetBody>
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>
        </DashboardSidebar>
    );
}
