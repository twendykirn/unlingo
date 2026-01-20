import { LogoIcon } from '@/components/logo'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import NextJS from '@/components/logos/nextjs'
import ReactLogo from '@/components/logos/react'
import Vue from '@/components/logos/vue'
import Svelte from '@/components/logos/svelte'
import TanStack from '@/components/logos/tanstack'
import Expo from '@/components/logos/expo'
import ReactNative from '@/components/logos/react-native'
import Angular from '@/components/logos/angular'
import I18next from '@/components/logos/i18next'
import Gatsby from '@/components/logos/gatsby'
import Nuxt from '@/components/logos/nuxt'
import Remix from '@/components/logos/remix'
import Astro from '@/components/logos/astro'
import { Vercel } from '@/components/logos/vercel'
import { Link } from '@tanstack/react-router'

export default function IntegrationsSection() {
    return (
        <section className="bg-background">
            <div className="py-24">
                <div className="perspective-dramatic group mx-auto max-w-5xl px-6">
                    <div className="rotate-x-6 hover:rotate-x-0 mask-radial-from-70% mask-radial-[50%_90%] group relative mx-auto max-w-2xl scale-y-90 items-center justify-between space-y-6 from-transparent pb-1 transition-transform duration-1000 hover:scale-y-100">
                        <div className="mask-radial-to-55% absolute inset-0 bg-[radial-gradient(var(--color-foreground)_1px,transparent_1px)] opacity-25 [background-size:16px_16px]" />
                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={20}
                                speedOnHover={10}>
                                <IntegrationCard>
                                    <NextJS />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <ReactLogo />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Vue />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Svelte />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <TanStack />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Angular />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>

                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={20}
                                speedOnHover={10}
                                reverse>
                                <IntegrationCard>
                                    <Expo />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <ReactNative />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Nuxt />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Gatsby />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Remix />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Vercel />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div>
                            <InfiniteSlider
                                gap={56}
                                speed={15}
                                speedOnHover={10}>
                                <IntegrationCard>
                                    <Astro />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <I18next />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <NextJS />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Vue />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <Svelte />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <ReactLogo />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div className="absolute inset-0 m-auto flex size-fit -translate-y-3.5 justify-center gap-2">
                            <IntegrationCard
                                className="ring-foreground/50 relative size-24 rounded-2xl border border-white/20 bg-zinc-700/50 shadow-xl shadow-black/20 ring-1 backdrop-blur-lg backdrop-blur-md"
                                isCenter={true}>
                                <LogoIcon
                                    uniColor
                                    className="text-white drop-shadow-sm"
                                />
                            </IntegrationCard>
                        </div>
                    </div>
                    <div className="mx-auto mt-12 max-w-xl text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-5xl">Seamlessly Integrate with your favorite Tools</h2>
                        <p className="text-muted-foreground mb-6 mt-4 text-balance">Connect seamlessly with popular frameworks and platforms to enhance your workflow.</p>

                        <div className="flex w-full gap-2 justify-center">
                            <Button
                                size="sm">
                                <Link to="/">Get Started</Link>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline">
                                <Link to="/">Docs</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const IntegrationCard = ({ children, className, isCenter = false }: { children: React.ReactNode; className?: string; position?: 'left-top' | 'left-middle' | 'left-bottom' | 'right-top' | 'right-middle' | 'right-bottom'; isCenter?: boolean }) => {
    return (
        <div
            aria-hidden
            className={cn('bg-card relative z-20 flex size-20 rounded-xl border', className)}>
            <div className={cn('m-auto size-fit *:size-8', isCenter && '*:size-8')}>{children}</div>
        </div>
    )
}
