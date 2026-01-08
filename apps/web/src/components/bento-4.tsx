'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, Camera, ScanText, Globe, Search, Check } from 'lucide-react'

// AI Translation Animation - Shows text being translated with AI sparkles
function AITranslationAnimation() {
    const [translating, setTranslating] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setTranslating(true)
            setTimeout(() => setTranslating(false), 2000)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-lg bg-zinc-900/50 p-6">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

            {/* Translation cards */}
            <div className="relative z-10 flex w-full max-w-[280px] flex-col gap-3">
                {/* Source text */}
                <motion.div
                    className="rounded-lg border border-border/50 bg-zinc-800/80 p-3"
                    animate={{ opacity: 1 }}
                >
                    <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" size="sm">EN</Badge>
                        <span className="text-muted-foreground text-xs">Source</span>
                    </div>
                    <p className="text-foreground text-sm">Hello, welcome to our app!</p>
                </motion.div>

                {/* AI Processing indicator */}
                <motion.div
                    className="flex items-center justify-center gap-2 py-1"
                    animate={{ opacity: translating ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        animate={{ rotate: translating ? 360 : 0 }}
                        transition={{ duration: 1, repeat: translating ? Infinity : 0, ease: "linear" }}
                    >
                        <Sparkles className="size-4 text-indigo-400" />
                    </motion.div>
                    <span className="text-muted-foreground text-xs">AI translating...</span>
                </motion.div>

                {/* Translated texts */}
                <motion.div
                    className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3"
                    animate={{
                        opacity: translating ? [0.5, 1] : 1,
                        y: translating ? [5, 0] : 0
                    }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-1 flex items-center gap-2">
                        <Badge variant="default" size="sm" className="bg-indigo-500">ES</Badge>
                        <span className="text-muted-foreground text-xs">Spanish</span>
                    </div>
                    <p className="text-foreground text-sm">¡Hola, bienvenido a nuestra app!</p>
                </motion.div>
            </div>
        </div>
    )
}

// Real-time Sync Animation - Shows changes propagating across clients
function RealTimeSyncAnimation() {
    const [syncPulse, setSyncPulse] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setSyncPulse(prev => prev + 1)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-zinc-900/50 p-4">
            {/* Center hub */}
            <div className="relative">
                <motion.div
                    className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <RefreshCw className="size-5 text-emerald-400" />
                </motion.div>

                {/* Sync pulses */}
                <motion.div
                    key={syncPulse}
                    className="absolute inset-0 rounded-full border-2 border-emerald-400"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />

                {/* Connected clients */}
                {[0, 72, 144, 216, 288].map((angle, i) => (
                    <motion.div
                        key={i}
                        className="absolute left-1/2 top-1/2"
                        style={{
                            transform: `rotate(${angle}deg) translateY(-55px) rotate(-${angle}deg)`,
                            marginLeft: -16,
                            marginTop: -16
                        }}
                    >
                        <motion.div
                            className="flex size-8 items-center justify-center rounded-lg border border-border bg-zinc-800 text-xs font-medium"
                            animate={{
                                borderColor: syncPulse % 5 === i ? 'var(--color-emerald-500)' : 'var(--color-border)',
                                scale: syncPulse % 5 === i ? [1, 1.15, 1] : 1
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            {['EN', 'FR', 'DE', 'JA', 'ES'][i]}
                        </motion.div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

// Screenshot Context Animation - Shows screenshot with text detection
function ScreenshotContextAnimation() {
    const [scanning, setScanning] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setScanning(true)
            setTimeout(() => setScanning(false), 2000)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-zinc-900/50 p-4">
            {/* Mock UI screenshot */}
            <div className="relative w-full max-w-[200px] overflow-hidden rounded-lg border border-border bg-zinc-800/80 p-3 shadow-lg">
                {/* App header */}
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="size-2 rounded-full bg-red-500" />
                        <div className="size-2 rounded-full bg-yellow-500" />
                        <div className="size-2 rounded-full bg-emerald-500" />
                    </div>
                </div>

                {/* Mock text elements with detection boxes */}
                <div className="space-y-2">
                    <motion.div
                        className="relative h-4 w-24 rounded bg-zinc-700"
                        animate={{
                            boxShadow: scanning ? '0 0 0 2px var(--color-indigo-500)' : 'none'
                        }}
                    >
                        {scanning && (
                            <motion.span
                                className="absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-indigo-500"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                <ScanText className="size-2 text-white" />
                            </motion.span>
                        )}
                    </motion.div>
                    <div className="h-3 w-32 rounded bg-zinc-700/50" />
                    <motion.div
                        className="relative h-6 w-20 rounded bg-indigo-600/50"
                        animate={{
                            boxShadow: scanning ? '0 0 0 2px var(--color-indigo-500)' : 'none'
                        }}
                        transition={{ delay: 0.2 }}
                    >
                        {scanning && (
                            <motion.span
                                className="absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-indigo-500"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <ScanText className="size-2 text-white" />
                            </motion.span>
                        )}
                    </motion.div>
                </div>

                {/* Camera icon */}
                <motion.div
                    className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full bg-indigo-500/20"
                    animate={{ scale: scanning ? [1, 1.2, 1] : 1 }}
                >
                    <Camera className="size-3 text-indigo-400" />
                </motion.div>
            </div>
        </div>
    )
}

// Over-the-Air Updates Animation - Shows data streaming to devices
function OTAUpdatesAnimation() {
    const [streaming, setStreaming] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setStreaming(true)
            setTimeout(() => setStreaming(false), 2000)
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full items-center justify-center overflow-hidden rounded-lg">
            {/* Cloud source */}
            <div className="flex flex-col items-center gap-8">
                <motion.div
                    className="flex size-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Globe className="size-7 text-indigo-400" />
                </motion.div>

                {/* Streaming lines */}
                <div className="relative h-12 w-full">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute left-1/2 h-full w-px bg-gradient-to-b from-indigo-500 to-transparent"
                            style={{ marginLeft: (i - 1) * 40 }}
                            animate={{
                                opacity: streaming ? [0, 1, 0] : 0.2,
                                scaleY: streaming ? [0, 1, 0] : 0.5
                            }}
                            transition={{
                                duration: 1,
                                delay: i * 0.15,
                                repeat: streaming ? 2 : 0
                            }}
                        />
                    ))}
                </div>

                {/* Target devices */}
                <div className="flex gap-4">
                    {['📱', '💻', '🖥️'].map((emoji, i) => (
                        <motion.div
                            key={i}
                            className="flex size-10 items-center justify-center rounded-lg border border-border bg-zinc-800 text-lg"
                            animate={{
                                borderColor: streaming ? 'var(--color-indigo-500)' : 'var(--color-border)',
                                scale: streaming ? [1, 1.1, 1] : 1
                            }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                        >
                            {emoji}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Global Search Animation
function GlobalSearchAnimation() {
    const [searching, setSearching] = useState(false)
    const [results, setResults] = useState<number[]>([])

    useEffect(() => {
        const interval = setInterval(() => {
            setSearching(true)
            setResults([])
            setTimeout(() => {
                setResults([1, 2, 3])
                setSearching(false)
            }, 1000)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg bg-zinc-900/50 p-4">
            {/* Search input */}
            <motion.div
                className="flex w-full max-w-[180px] items-center gap-2 rounded-lg border border-border bg-zinc-800 px-3 py-2"
                animate={{
                    borderColor: searching ? 'var(--color-indigo-500)' : 'var(--color-border)'
                }}
            >
                <Search className="size-4 text-muted-foreground" />
                <motion.span
                    className="text-sm text-foreground"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: searching ? Infinity : 0 }}
                >
                    welcome
                </motion.span>
            </motion.div>

            {/* Search results */}
            <div className="flex w-full max-w-[180px] flex-col gap-1">
                {results.map((_, i) => (
                    <motion.div
                        key={i}
                        className="flex items-center gap-2 rounded border border-border/50 bg-zinc-800/50 p-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className="size-2 rounded-full bg-indigo-500" />
                        <div className="flex-1">
                            <div className="h-2 w-16 rounded bg-zinc-700" />
                        </div>
                        <Check className="size-3 text-emerald-400" />
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

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
                                <AITranslationAnimation />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">AI-Powered Translations</h3>
                                <p className="text-muted-foreground mt-3">Translate your keys instantly with AI. Context-aware translations that understand your content.</p>
                            </div>
                        </Card>

                        {/* Real-time Sync */}
                        <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <RealTimeSyncAnimation />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Real-time Auto Sync</h3>
                                <p className="text-muted-foreground mt-3">Everything syncs in real-time. Changes propagate instantly across all your translations.</p>
                            </div>
                        </Card>

                        {/* Screenshot Context */}
                        <Card className="grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <ScreenshotContextAnimation />
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
                                    <OTAUpdatesAnimation />
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
                                    <GlobalSearchAnimation />
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
