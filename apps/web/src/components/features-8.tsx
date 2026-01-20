import CodeBlockIllustration from "@/components/ui/illustrations/code-block-illustration"

import Expo from '@/components/logos/expo'
import NextJS from '@/components/logos/nextjs'
import TanStack from '@/components/logos/tanstack'
import TypeScript from '@/components/logos/typescript'
import Kotlin from '@/components/logos/kotlin'
import Swift from '@/components/logos/swift'

export default function FeaturesSection() {
    return (
        <section
            className="bg-background"
            data-theme="dark">
            <div className="@container py-24 [--color-secondary:var(--color-indigo-200)]">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@3xl:p-12 relative">
                        <div
                            aria-hidden
                            className="@3xl:block mask-x-from-95% border-foreground/5 pointer-events-none absolute -inset-x-12 inset-y-0 hidden border-y"></div>
                        <div
                            aria-hidden
                            className="@3xl:block mask-y-from-95% border-foreground/5 pointer-events-none absolute -inset-y-12 inset-x-0 hidden border-x"></div>
                        <CodeBlockIllustration />

                        <div className="@xl:gap-12 @3xl:gap-24 @2xl:grid-cols-3 @sm:grid-cols-2 relative mt-12 grid gap-6">
                            <div
                                aria-hidden
                                className="@3xl:block mask-y-from-95% @4xl:w-[calc(33.333%+3rem)] @4xl:-inset-y-24 pointer-events-none absolute -inset-y-12 inset-x-0 mx-auto hidden w-[calc(33.333%+1.5rem)] border-x border-dashed"></div>
                            <div className="space-y-3">
                                <h3 className="font-medium">Supports popular languages</h3>
                                <div className="*:bg-foreground/5 grid grid-cols-3 gap-0.5 *:flex *:items-center *:justify-center *:rounded *:px-2 *:py-3">
                                    <div className="!rounded-l-lg">
                                        <TypeScript className="size-5" />
                                    </div>
                                    <div>
                                        <Swift className="size-5" />
                                    </div>
                                    <div className="!rounded-r-lg">
                                        <Kotlin className="fill-foreground size-5" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-medium">Works with loved frameworks</h3>
                                <div className="*:bg-foreground/5 grid grid-cols-3 gap-0.5 *:flex *:items-center *:justify-center *:rounded *:px-2 *:py-3">
                                    <div className="!rounded-l-lg">
                                        <NextJS className="size-5" />
                                    </div>
                                    <div>
                                        <TanStack className="size-5" />
                                    </div>
                                    <div className="!rounded-r-lg">
                                        <Expo className="fill-foreground size-5" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-medium">CLI Compatible</h3>
                                <p className="text-muted-foreground text-sm">
                                    Create latest builds manually during the deployment process.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}