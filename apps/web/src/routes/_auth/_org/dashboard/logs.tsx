import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Toggle, ToggleGroup, ToggleGroupSeparator } from '@/components/ui/toggle-group';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@unlingo/backend/convex/_generated/api';
import { useAction, useQuery } from 'convex/react';
import { LogsIcon, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    type Row,
    useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toastManager } from '@/components/ui/toast';
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import AutoSizer from "react-virtualized-auto-sizer";

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

export const Route = createFileRoute('/_auth/_org/dashboard/logs')({
    component: RouteComponent,
})

function RouteComponent() {
    const { organization } = useOrganization();

    const [events, setEvents] = useState<OpenpanelEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<OpenpanelEvent | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const page = useRef(0);
    const timeRange = useRef<TimeRange>('24h');
    const isInitialLoad = useRef(true);

    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    const getEvents = useAction(api.analytics.getEvents);

    const columns = useMemo<ColumnDef<OpenpanelEvent>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Event',
                cell: info => info.getValue(),
                size: 300,
            },
            {
                accessorKey: 'properties.success',
                header: 'Status',
                cell: info =>
                    <Badge
                        variant={info.getValue() === 'true' ? 'success' : 'error'}
                    >
                        {info.getValue() === 'true' ? 'Success' : 'Failed'}
                    </Badge>,
            },
            {
                accessorKey: 'createdAt',
                header: 'Created At',
                cell: info => new Date(info.getValue<Date>()).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                }),
            },
        ], []
    );

    const loadEvents = useCallback(async () => {
        if (!workspace) return;

        setLoading(true);
        try {
            const dateRange = getDateRange(timeRange.current);

            if (!dateRange.start || !dateRange.end) {
                throw new Error('Invalid date range');
            }

            const result = await getEvents({
                start: dateRange.start,
                end: dateRange.end,
                page: page.current + 1,
                limit: 50,
                workspaceId: workspace._id,
            });

            const newHasMore = result.meta.pages > 0 && result.meta.current !== result.meta.pages;

            if (result.data.length !== 0) {
                setEvents(prev => (page.current + 1 === 1 ? result.data : [...prev, ...result.data]));
            } else {
                setEvents(result.data);
            }
            setHasMore(newHasMore);
            page.current = page.current + 1;
        } catch (e) {
            toastManager.add({
                description: `Failed to load events: ${e}`,
                type: 'error',
            })
        } finally {
            setLoading(false);
        }
    }, [workspace, timeRange, page, getEvents]);

    const fetchMoreOnBottomReached = useCallback(
        (containerRefElement?: HTMLDivElement | null) => {
            if (containerRefElement) {
                const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
                //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
                if (
                    scrollHeight - scrollTop - clientHeight < 500 &&
                    !loading &&
                    hasMore
                ) {
                    loadEvents();
                }
            }
        },
        [loadEvents, loading, hasMore]
    );

    useEffect(() => {
        fetchMoreOnBottomReached(tableContainerRef.current)
    }, [fetchMoreOnBottomReached]);

    useEffect(() => {
        if (workspace && isInitialLoad.current) {
            isInitialLoad.current = false;
            loadEvents();
        }
    }, [workspace]);

    const table = useReactTable({
        data: events,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
        getScrollElement: () => tableContainerRef.current,
        //measure dynamic row height, except in firefox because it measures table border height incorrectly
        measureElement:
            typeof window !== 'undefined' &&
                navigator.userAgent.indexOf('Firefox') === -1
                ? element => element?.getBoundingClientRect().height
                : undefined,
        overscan: 5,
    });

    return (
        <SidebarProvider>
            <AppSidebar activeItem='logs' />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <div className="flex flex-col gap-4 p-4 pt-0 max-w-full flex-1">
                    <div className="flex items-center">
                        <h1>Logs</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <ToggleGroup
                                variant="outline"
                                value={[timeRange.current]}
                                onValueChange={(value) => {
                                    timeRange.current = value[0];
                                    page.current = 0;
                                    loadEvents();
                                }}
                            >
                                <Toggle aria-label="Toggle 24h time range" value="24h">
                                    24H
                                </Toggle>
                                <ToggleGroupSeparator />
                                <Toggle aria-label="Toggle 7 days time range" value="7d">
                                    7D
                                </Toggle>
                                <ToggleGroupSeparator />
                                <Toggle aria-label="Toggle 30 days time range" value="30d">
                                    30D
                                </Toggle>
                            </ToggleGroup>
                            <Button
                                disabled={loading}
                                onClick={() => {
                                    page.current = 0;
                                    loadEvents();
                                }}
                            >
                                {loading ? <Spinner /> : <RefreshCcw />}
                            </Button>
                        </div>
                    </div>
                    {events.length > 0 ? (
                        <div className='h-full'>
                            {workspace ? (
                                <AutoSizer>
                                    {({ width, height }) => (
                                        <div
                                            className="overflow-auto relative"
                                            onScroll={e => fetchMoreOnBottomReached(e.currentTarget)}
                                            ref={tableContainerRef}
                                            style={{
                                                width: width + 'px',
                                                height: height + 'px',
                                            }}
                                        >
                                            <Table style={{ display: 'grid' }}>
                                                <TableHeader
                                                    style={{
                                                        display: 'grid',
                                                        position: 'sticky',
                                                        top: 0,
                                                        zIndex: 1,
                                                    }}
                                                >
                                                    {table.getHeaderGroups().map(headerGroup => (
                                                        <TableRow
                                                            key={headerGroup.id}
                                                            style={{ display: 'flex', width: '100%' }}
                                                        >
                                                            {headerGroup.headers.map(header => {
                                                                return (
                                                                    <TableHead
                                                                        key={header.id}
                                                                        style={{
                                                                            display: 'flex',
                                                                            width: header.getSize(),
                                                                            alignItems: 'center',
                                                                        }}
                                                                    >
                                                                        {flexRender(
                                                                            header.column.columnDef.header,
                                                                            header.getContext()
                                                                        )}
                                                                    </TableHead>
                                                                )
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableHeader>
                                                <TableBody
                                                    style={{
                                                        display: 'grid',
                                                        height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
                                                        position: 'relative', //needed for absolute positioning of rows
                                                    }}
                                                >
                                                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                                        const row = rows[virtualRow.index] as Row<OpenpanelEvent>
                                                        return (
                                                            <TableRow
                                                                data-index={virtualRow.index} //needed for dynamic row height measurement
                                                                ref={node => rowVirtualizer.measureElement(node)} //measure dynamic row height
                                                                key={row.id}
                                                                style={{
                                                                    display: 'flex',
                                                                    position: 'absolute',
                                                                    transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                                                                    width: '100%',
                                                                }}
                                                                className='cursor-pointer'
                                                                onClick={() => {
                                                                    setSelectedEvent(row.original);
                                                                    setIsSheetOpen(true);
                                                                }}
                                                            >
                                                                {row.getVisibleCells().map(cell => {
                                                                    return (
                                                                        <TableCell
                                                                            key={cell.id}
                                                                            style={{
                                                                                display: 'flex',
                                                                                width: cell.column.getSize(),
                                                                            }}
                                                                        >
                                                                            {flexRender(
                                                                                cell.column.columnDef.cell,
                                                                                cell.getContext()
                                                                            )}
                                                                        </TableCell>
                                                                    )
                                                                })}
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                            {loading ? <Spinner /> : null}
                                        </div>
                                    )}
                                </AutoSizer>
                            ) : (
                                <div className="flex items-center justify-center w-full mt-4">
                                    <Spinner />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <LogsIcon />
                                </EmptyMedia>
                                <EmptyTitle>No upcoming events</EmptyTitle>
                                <EmptyDescription>Try to change time range or refresh.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>
                <Sheet
                    open={isSheetOpen}
                    onOpenChange={value => {
                        if (!value) {
                            setSelectedEvent(null);
                        }

                        setIsSheetOpen(value);
                    }}
                >
                    <SheetPopup className='min-w-[750px]'>
                        {selectedEvent ? (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Event Details</SheetTitle>
                                </SheetHeader>
                                <SheetPanel>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Property</TableHead>
                                                <TableHead>Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow key='event-name'>
                                                <TableCell>Event Name</TableCell>
                                                <TableCell>{selectedEvent.name}</TableCell>
                                            </TableRow>
                                            <TableRow key='createdAt'>
                                                <TableCell>Created At</TableCell>
                                                <TableCell>
                                                    {new Date(selectedEvent.createdAt).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "numeric",
                                                        second: "numeric",
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                            {Object.entries(selectedEvent.properties).map(entries => {
                                                const value =
                                                    entries[0] === 'timestamp'
                                                        ? new Date(parseFloat(entries[1])).toLocaleDateString(undefined, {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "numeric",
                                                            second: "numeric",
                                                        })
                                                        : entries[1];

                                                return (
                                                    <TableRow key={entries[0]}>
                                                        <TableCell>
                                                            {entries[0] === 'success' ? 'Status' : entries[0]}
                                                        </TableCell>
                                                        <TableCell>
                                                            {
                                                                entries[0] === 'success' ?
                                                                    <Badge variant={
                                                                        value === 'true' ? 'success' : 'error'
                                                                    }>
                                                                        {value === 'true' ? 'Success' : 'Failed'}
                                                                    </Badge>
                                                                    : value
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </SheetPanel>
                            </>
                        ) : null}
                    </SheetPopup>
                </Sheet>
            </SidebarInset>
        </SidebarProvider>
    );
}
