import { Card } from '@/components/ui/card'

export default function SmartHomeBento() {
    return (
        <section
            data-theme="dark"
            className="bg-background @container">
            <div className="py-24 [--color-primary:var(--color-indigo-300)]">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@xl:grid-cols-2 @4xl:grid-cols-10 grid grid-cols-1 gap-4">
                        {/* Glossary */}
                        <Card className="@4xl:col-span-4 group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Glossary Management</h3>
                                <p className="text-muted-foreground mt-3">Define terms and unique words. Ensure consistent translations with a centralized glossary.</p>
                            </div>
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <img
                                    src="/placeholder-glossary.jpg"
                                    alt="Glossary management interface"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </Card>

                        {/* A/B Testing Releases */}
                        <Card className="@xl:col-span-2 @4xl:col-span-6 grid grid-rows-[auto_1fr] gap-8 rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div>
                                <h3 className="text-foreground font-semibold">Releases with A/B Testing</h3>
                                <p className="text-muted-foreground mt-3">Create releases and run A/B tests for over-the-air translations. Dynamically test and optimize your builds in production.</p>
                            </div>
                            <div className="relative aspect-video overflow-hidden rounded-lg">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/placeholder-ab-testing.jpg"
                                >
                                    <source src="/placeholder-ab-testing.mp4" type="video/mp4" />
                                </video>
                            </div>
                        </Card>

                        {/* Language Rules */}
                        <Card className="@4xl:col-span-3 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <img
                                    src="/placeholder-language-rules.jpg"
                                    alt="Language rules configuration"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Custom Language Rules</h3>
                                <p className="text-muted-foreground mt-3">Define grammar rules for specific languages. Handle complex linguistic requirements with ease.</p>
                            </div>
                        </Card>

                        {/* CI/CD Build Integration */}
                        <Card className="@4xl:col-span-4 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div className="relative aspect-video overflow-hidden rounded-lg">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/placeholder-cicd-builds.jpg"
                                >
                                    <source src="/placeholder-cicd-builds.mp4" type="video/mp4" />
                                </video>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">CI/CD Build Integration</h3>
                                <p className="text-muted-foreground mt-3">Create builds and fetch them in your CI/CD pipeline. Generate translation builds dynamically for seamless deployments.</p>
                            </div>
                        </Card>

                        {/* Simple API */}
                        <Card className="@4xl:row-start-auto @4xl:col-span-3 row-start-1 grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <img
                                    src="/placeholder-simple-api.jpg"
                                    alt="Simple API integration"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Simple & Powerful API</h3>
                                <p className="text-muted-foreground mt-3">Integrate with any framework or library. Clean API design that works everywhere.</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}