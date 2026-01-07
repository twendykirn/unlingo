import { cn } from '@/lib/utils'

export const CardDecorator = ({ className }: { className?: string }) => (
    <>
        <span className={cn('border-primary absolute -left-px -top-px block size-2.5 border-l-[1.5px] border-t-[1.5px]', className)}></span>
        <span className={cn('border-primary absolute -right-px -top-px block size-2.5 border-r-[1.5px] border-t-[1.5px]', className)}></span>
        <span className={cn('border-primary absolute -bottom-px -left-px block size-2.5 border-b-[1.5px] border-l-[1.5px]', className)}></span>
        <span className={cn('border-primary absolute -bottom-px -right-px block size-2.5 border-b-[1.5px] border-r-[1.5px]', className)}></span>
    </>
)