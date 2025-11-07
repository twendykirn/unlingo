'use client';

import { useEffect, useState, useMemo } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import DashboardSidebar from '../components/dashboard-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Loader } from '@/components/ui/loader';
import { GridList, GridListItem } from '@/components/ui/grid-list';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { DescriptionList, DescriptionTerm, DescriptionDetails } from '@/components/ui/description-list';
import { Button } from '@/components/ui/button';

type TimeRange = '24h' | '7d' | '30d';

interface OpenpanelEvent {
    id: string;
    name: string;
    created_at: string;
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

export default function AnalyticsPage() {
    const { organization } = useOrganization();
    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        organization?.id ? { clerkId: organization.id } : 'skip'
    );

    const getEvents = useAction(api.analytics.getEvents);

    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [events, setEvents] = useState<OpenpanelEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<OpenpanelEvent | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const isPremium = workspace?.isPremium || false;

    useEffect(() => {
        setEvents([]);
        setPage(1);
        setHasMore(true);
    }, [timeRange, organization]);

    useEffect(() => {
        async function loadEvents() {
            if (!organization?.id || !hasMore) return;

            setLoading(true);
            try {
                const dateRange = getDateRange(timeRange);
                const result = await getEvents({
                    start: dateRange.start,
                    end: dateRange.end,
                    page,
                    limit: 50,
                });

                if (result.data.length === 0) {
                    setHasMore(false);
                } else {
                    setEvents(prev => (page === 1 ? result.data : [...prev, ...result.data]));
                    setHasMore(result.data.length === 50);
                }
            } catch (e) {
                console.error('Failed to load events:', e);
            } finally {
                setLoading(false);
            }
        }

        loadEvents();
    }, [organization, timeRange, page, getEvents, hasMore]);

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    const handleEventSelect = (event: OpenpanelEvent) => {
        setSelectedEvent(event);
        setIsSheetOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

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
                            <CardDescription>View all events tracked for your workspace.</CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Button
                                variant={timeRange === '24h' ? 'primary' : 'secondary'}
                                onPress={() => setTimeRange('24h')}>
                                24H
                            </Button>
                            <Button
                                variant={timeRange === '7d' ? 'primary' : 'secondary'}
                                onPress={() => setTimeRange('7d')}>
                                7D
                            </Button>
                            {isPremium && (
                                <Button
                                    variant={timeRange === '30d' ? 'primary' : 'secondary'}
                                    onPress={() => setTimeRange('30d')}>
                                    30D
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                    {loading && events.length === 0 ? (
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
                                aria-label='Analytics events'
                                selectionMode='single'
                                onAction={key => {
                                    const event = events.find(e => e.id === key);
                                    if (event) handleEventSelect(event);
                                }}>
                                {events.map(event => (
                                    <GridListItem key={event.id} id={event.id}>
                                        <div className='flex flex-col gap-1'>
                                            <div className='font-medium'>{event.name}</div>
                                            <div className='text-sm text-muted-fg'>{formatDate(event.created_at)}</div>
                                        </div>
                                    </GridListItem>
                                ))}
                            </GridList>

                            {hasMore && (
                                <div className='flex items-center justify-center py-4'>
                                    <Button onPress={handleLoadMore} isDisabled={loading}>
                                        {loading ? 'Loading...' : 'Load More'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Sheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side='right'>
                    {selectedEvent && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Event Details</SheetTitle>
                            </SheetHeader>
                            <SheetBody>
                                <DescriptionList>
                                    <DescriptionTerm>Date</DescriptionTerm>
                                    <DescriptionDetails>{formatDate(selectedEvent.created_at)}</DescriptionDetails>

                                    <DescriptionTerm>Event Name</DescriptionTerm>
                                    <DescriptionDetails>{selectedEvent.name}</DescriptionDetails>

                                    <DescriptionTerm>Properties</DescriptionTerm>
                                    <DescriptionDetails>
                                        <pre className='text-xs overflow-auto max-h-96 bg-muted p-2 rounded'>
                                            {JSON.stringify(selectedEvent.properties, null, 2)}
                                        </pre>
                                    </DescriptionDetails>
                                </DescriptionList>
                            </SheetBody>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </DashboardSidebar>
    );
}
