import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";

function AlertDialogPanel({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <ScrollArea>
            <div
                className={cn(
                    "px-6 in-[[data-slot=alert-dialog-popup]:has([data-slot=alert-dialog-header])]:pt-1 in-[[data-slot=alert-dialog-popup]:not(:has([data-slot=alert-dialog-header]))]:pt-6 in-[[data-slot=alert-dialog-popup]:not(:has([data-slot=alert-dialog-footer]))]:pb-6! in-[[data-slot=alert-dialog-popup]:not(:has([data-slot=alert-dialog-footer].border-t))]:pb-1 pb-6",
                    className,
                )}
                data-slot="alert-dialog-panel"
                {...props}
            />
        </ScrollArea>
    );
}

export {
    AlertDialogPanel,
};