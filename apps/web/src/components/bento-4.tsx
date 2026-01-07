import { Card } from '@/components/ui/card'

export default function BentoFour() {
    return (
        <section
            data-theme="dark"
            className="bg-background">
            <h2 className="sr-only">Translation Features</h2>
            <div className="@container py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@xl:grid-cols-2 @4xl:grid-cols-3 grid gap-4">
                        {/* AI Translations */}
                        <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/placeholder-ai-translations.jpg"
                                >
                                    <source src="/placeholder-ai-translations.mp4" type="video/mp4" />
                                </video>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">AI-Powered Translations</h3>
                                <p className="text-muted-foreground mt-3">Translate your keys instantly with AI. Context-aware translations that understand your content.</p>
                            </div>
                        </Card>

                        {/* Real-time Sync */}
                        <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/placeholder-auto-sync.jpg"
                                >
                                    <source src="/placeholder-auto-sync.mp4" type="video/mp4" />
                                </video>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Real-time Auto Sync</h3>
                                <p className="text-muted-foreground mt-3">Everything syncs in real-time. Changes propagate instantly across all your translations.</p>
                            </div>
                        </Card>

                        {/* Screenshot Context */}
                        <Card className="grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <img
                                    src="/placeholder-screenshot-context.jpg"
                                    alt="Screenshot context for translations"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Visual Context with Screenshots</h3>
                                <p className="text-muted-foreground mt-3">Upload screenshots for better context. Auto-detect text and link translations to visual elements.</p>
                            </div>
                        </Card>

                        {/* Over-the-Air Updates */}
                        <Card className="@xl:col-span-2 grid grid-rows-[1fr_auto] gap-8 rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div className="relative flex flex-col items-center justify-center">
                                <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                    <video
                                        className="h-full w-full object-cover"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        poster="/placeholder-ota-updates.jpg"
                                    >
                                        <source src="/placeholder-ota-updates.mp4" type="video/mp4" />
                                    </video>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Over-the-Air Updates</h3>
                                <p className="text-muted-foreground mt-3">Push translation updates instantly without app releases. Fetch translations by key or entire builds directly to your apps and websites.</p>
                            </div>
                        </Card>

                        <div className="@xl:row-start-2 @4xl:row-start-auto @xl:space-y-0 @4xl:space-y-4 grid grid-rows-[1fr_auto] space-y-4">
                            {/* Global Search */}
                            <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                    <img
                                        src="/placeholder-global-search.jpg"
                                        alt="Global search by keys or values"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-foreground font-semibold">Global Search</h3>
                                    <p className="text-muted-foreground mt-3">Find any translation instantly by searching keys or values across your entire project.</p>
                                </div>
                            </Card>

                            {/* Languages Supported */}
                            <Card className="@4xl:block @xl:hidden group space-y-4 overflow-hidden rounded-2xl p-8 text-center">
                                <span className="to-primary block bg-gradient-to-r from-indigo-400 bg-clip-text text-5xl font-bold text-transparent">90+</span>
                                <div>
                                    <p className="text-foreground font-semibold">Languages Supported</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}