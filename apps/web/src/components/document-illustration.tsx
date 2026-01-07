import { cn } from '@/lib/utils'
import { Signature } from 'lucide-react'

export const DocumentIllustation = ({ className }: { className?: string }) => {
    return (
        <div className={cn('border-border-illustration bg-illustration relative z-10 h-fit w-16 space-y-2 rounded-md border p-2 shadow-md shadow-black/25 [--color-border:color-mix(in_oklab,var(--color-foreground)15%,transparent)]', className)}>
            <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-full bg-indigo-300" />
                <div className="bg-border h-[3px] w-4 rounded-full" />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                    <div className="bg-border h-[3px] w-2.5 rounded-full" />
                    <div className="bg-border h-[3px] w-6 rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="bg-border h-[3px] w-2.5 rounded-full" />
                    <div className="bg-border h-[3px] w-6 rounded-full" />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="bg-border h-[3px] w-full rounded-full" />
                <div className="flex items-center gap-1">
                    <div className="bg-border h-[3px] w-2/3 rounded-full" />
                    <div className="bg-border h-[3px] w-1/3 rounded-full" />
                </div>
            </div>

            <Signature className="ml-auto mt-3 size-3" />
        </div>
    )
}