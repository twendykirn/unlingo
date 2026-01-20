import { Button } from '@/components/ui/button'
import HeroHeader from "@/components/header"
import { Play } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import EditorMockup from '@/components/ui/illustrations/editor-mockup'

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main
                role="main"
                data-theme="dark"
                className="bg-background overflow-hidden">
                <section>
                    <div className="relative pb-36 pt-24 lg:pt-16">
                        <div className="relative z-10 mx-auto max-w-5xl px-6">
                            <div className="text-center">
                                <h1 className="mx-auto mt-8 max-w-xl text-balance text-4xl font-semibold md:text-5xl">Translate your software</h1>
                                <p className="text-muted-foreground mx-auto mb-8 mt-4 max-w-xl text-balance text-lg">Built for teams who want to ship fast. Integrate localization seamlessly and focus on building what matters.</p>

                                <div className="flex items-center justify-center gap-3 max-sm:flex-col">
                                    <Button render={<Link to="/dashboard" />}>
                                        <span className="text-nowrap">Start Using</span>
                                    </Button>
                                    <Button
                                        key={2}
                                        variant="outline"
                                        className="pl-3.5"
                                        render={<Link to="/dashboard" />}>
                                        <Play className="fill-foreground !size-3" />
                                        <span className="text-nowrap">Watch Video</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 mt-18 overflow-hidden pb-12 max-md:px-6">
                            <EditorMockup />
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}