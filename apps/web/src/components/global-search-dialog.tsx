import { useState } from "react";
import {
    Dialog,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTrigger,
} from "./ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { KeyRoundIcon, SearchIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Card, CardHeader } from "./ui/card";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";
import { Link } from "@tanstack/react-router";
import { Spinner } from "./ui/spinner";
import { Button } from "./ui/button";

interface Props {
    projectId: string;
}

// TODO: Get keys from the backend
const KEYS = [
    { id: '1', name: 'common.settings.greetings.hello.hi.today.application', namespace: 'common', environment: 'production' },
    { id: '2', name: 'Test Key 2', namespace: 'common', environment: 'development' },
    { id: '3', name: 'Test Key 3', namespace: 'common', environment: 'production' },
    { id: '4', name: 'Test Key 4', namespace: 'common', environment: 'development' },
    { id: '5', name: 'Test Key 5', namespace: 'common', environment: 'production' },
    { id: '6', name: 'Test Key 6', namespace: 'common', environment: 'development' },
    { id: '7', name: 'Test Key 7', namespace: 'common', environment: 'production' },
    { id: '8', name: 'Test Key 8', namespace: 'common', environment: 'development' },
    { id: '9', name: 'Test Key 9', namespace: 'common', environment: 'production' },
    { id: '10', name: 'Test Key 10', namespace: 'common', environment: 'development' },
];

const GlobalSearchDialog = ({ projectId }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    return (
        <Dialog
            onOpenChange={value => {
                if (!value) {
                    setSearch('');
                }
            }}
        >
            <DialogTrigger render={<Button variant="outline" />}>
                <SearchIcon />
                Global Search
            </DialogTrigger>
            <DialogPopup showCloseButton={false}>
                <DialogHeader>
                    <InputGroup>
                        <InputGroupInput
                            aria-label="Search"
                            placeholder="Search keys"
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <InputGroupAddon>
                            <SearchIcon />
                        </InputGroupAddon>
                    </InputGroup>
                </DialogHeader>
                <DialogPanel className="grid gap-2">
                    {isLoading ? (
                        <Spinner className="mx-auto mt-2" />
                    ) : search === '' || KEYS.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <KeyRoundIcon />
                                </EmptyMedia>
                                <EmptyTitle>No keys</EmptyTitle>
                                <EmptyDescription>We didn't find any keys matching your search.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        KEYS.map(item => (
                            <Link
                                key={item.id}
                                to="/projects/$projectId"
                                params={{
                                    projectId,
                                }}
                            >
                                <Card className="py-4 hover:border-primary/30">
                                    <CardHeader className="px-4 flex justify-between items-center gap-8">
                                        <Tooltip>
                                            <TooltipTrigger render={<span className="truncate" />}>
                                                {item.name}
                                            </TooltipTrigger>
                                            <TooltipPopup>{item.name}</TooltipPopup>
                                        </Tooltip>
                                        <div className='flex items-center gap-1 text-muted-foreground'>
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="text-xs p-0" />}>
                                                    {item.namespace}
                                                </TooltipTrigger>
                                                <TooltipPopup>Namespace</TooltipPopup>
                                            </Tooltip>
                                            •
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="text-xs p-0" />}>
                                                    {item.environment}
                                                </TooltipTrigger>
                                                <TooltipPopup>Environment</TooltipPopup>
                                            </Tooltip>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))
                    )}
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
};

export default GlobalSearchDialog;