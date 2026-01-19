import { cn } from '@/lib/utils'

export const Logo = ({ className }: { className?: string }) => (
    <div className={cn('text-foreground', className)}>
        <img src="/logo.svg" alt="unlingo logo" />
    </div>
);


export const LogoIcon = ({ className }: { className?: string }) => {
    return (
        <div className={cn('size-5', className)}>
            <img src="/logo.svg" alt="unlingo logo" />
        </div>
    )
}
