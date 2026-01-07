import { Card } from '@/components/ui/card'

export default function BentoSix() {
    return (
        <section
            data-theme="dark"
            className="bg-background @container">
            <div className="py-24 [--color-primary:var(--color-indigo-300)]">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@xl:grid-cols-2 @4xl:grid-cols-3 grid grid-cols-1 gap-4">
                        {/* Analytics Dashboard */}
                        <Card className="@4xl:col-span-2 group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Built-in Analytics</h3>
                                <p className="text-muted-foreground mt-3">Track translation usage, completion rates, and team productivity all in one dashboard.</p>
                            </div>
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/placeholder-analytics.jpg"
                                >
                                    <source src="/placeholder-analytics.mp4" type="video/mp4" />
                                </video>
                            </div>
                        </Card>

                        {/* Fast Performance - Stat Card */}
                        <Card className="group flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl p-8 text-center">
                            <span className="to-primary block bg-gradient-to-r from-indigo-400 bg-clip-text text-6xl font-bold text-transparent">&lt;50ms</span>
                            <div>
                                <h3 className="text-foreground font-semibold">Blazing Fast</h3>
                                <p className="text-muted-foreground mt-2">Average API response time. Built for speed at any scale.</p>
                            </div>
                        </Card>

                        {/* Intuitive UI */}
                        <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/placeholder-intuitive-ui.jpg"
                                >
                                    <source src="/placeholder-intuitive-ui.mp4" type="video/mp4" />
                                </video>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Intuitive Interface</h3>
                                <p className="text-muted-foreground mt-3">Clean, simple UI that's easy to navigate. No learning curve required.</p>
                            </div>
                        </Card>

                        {/* Framework Support */}
                        <Card className="@4xl:col-span-2 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div className="relative aspect-video overflow-hidden rounded-lg">
                                <img
                                    src="/placeholder-frameworks.jpg"
                                    alt="Framework integrations - React, Vue, Next.js, and more"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Works with Every Framework</h3>
                                <p className="text-muted-foreground mt-3">React, Vue, Next.js, Svelte, and more. Simple API means easy integration with any tech stack.</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}
