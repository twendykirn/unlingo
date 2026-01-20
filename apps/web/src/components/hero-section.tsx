import { Button } from '@/components/ui/button'
import HeroHeader from "@/components/header"
import { Play } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Link } from '@tanstack/react-router'
import EditorMockup from '@/components/ui/illustrations/editor-mockup'

export default function HeroSection() {
    const { scrollY } = useScroll()
    const parallaxFactor = 0.25
    const y = useTransform(scrollY, [0, 500], [0, 500 * parallaxFactor], { clamp: false })

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
                                <h1 className="mx-auto mt-8 max-w-xl text-balance text-4xl font-semibold md:text-5xl">Powerful Analytics for Smarter Decisions</h1>
                                <p className="text-muted-foreground mx-auto mb-8 mt-4 max-w-xl text-balance text-lg">With Tailark's personal AI, get your projects to the finish line faster and with no context switching.</p>

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
                        <div className="relative mt-6 overflow-hidden pb-12 max-md:px-6">
                            <div className="mask-radial-to-65% absolute inset-0 mx-auto lg:w-2/3">
                                <motion.img
                                    style={{ y }}
                                    className="mx-auto size-full origin-top object-cover mix-blend-multiply"
                                    src="https://images.unsplash.com/photo-1653919492307-6191a10280f4?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                    alt="background"
                                />
                            </div>
                            <EditorMockup />
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}