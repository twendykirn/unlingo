'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { BarChart3, Zap, Layout, Layers, ArrowUp, Search, Settings, ChevronRight } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

// Analytics Dashboard Animation - Shows live stats and charts
function AnalyticsAnimation() {
    const [stats, setStats] = useState({
        translations: 12453,
        completion: 94,
        activeUsers: 28
    })

    const chartData = [
        { value: 30 },
        { value: 45 },
        { value: 35 },
        { value: 60 },
        { value: 55 },
        { value: 70 },
        { value: 65 },
        { value: 80 },
        { value: 75 },
        { value: 90 },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                translations: prev.translations + Math.floor(Math.random() * 10),
                completion: Math.min(100, prev.completion + (Math.random() > 0.5 ? 1 : 0)),
                activeUsers: 25 + Math.floor(Math.random() * 10)
            }))
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-4">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-indigo-400" />
                    <span className="text-xs font-medium text-muted-foreground">Analytics Dashboard</span>
                </div>
                <Badge variant="outline" size="sm">Live</Badge>
            </div>

            {/* Stats grid */}
            <div className="mb-4 grid grid-cols-3 gap-2">
                <motion.div
                    className="rounded-lg border border-border/50 bg-zinc-800/60 p-2"
                    whileHover={{ scale: 1.02 }}
                >
                    <motion.span
                        className="block text-lg font-bold text-foreground"
                        key={stats.translations}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                    >
                        {stats.translations.toLocaleString()}
                    </motion.span>
                    <span className="text-xs text-muted-foreground">Total Keys</span>
                </motion.div>
                <div className="rounded-lg border border-border/50 bg-zinc-800/60 p-2">
                    <div className="flex items-center gap-1">
                        <motion.span
                            className="text-lg font-bold text-emerald-400"
                            key={stats.completion}
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                        >
                            {stats.completion}%
                        </motion.span>
                        <ArrowUp className="size-3 text-emerald-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">Complete</span>
                </div>
                <div className="rounded-lg border border-border/50 bg-zinc-800/60 p-2">
                    <motion.span
                        className="block text-lg font-bold text-foreground"
                        animate={{ opacity: [0.7, 1] }}
                        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                    >
                        {stats.activeUsers}
                    </motion.span>
                    <span className="text-xs text-muted-foreground">Active</span>
                </div>
            </div>

            {/* Mini chart */}
            <div className="h-16 w-full rounded-lg border border-border/50 bg-zinc-800/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-indigo-500)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-indigo-500)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--color-indigo-500)"
                            strokeWidth={2}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

// Fast Performance Animation - Shows speed metrics
function FastPerformanceAnimation() {
    const [latency, setLatency] = useState(32)

    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(25 + Math.floor(Math.random() * 20))
        }, 1500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative flex h-full flex-col items-center justify-center">
            {/* Animated ring */}
            <div className="relative mb-4">
                <motion.div
                    className="absolute inset-0 rounded-full bg-indigo-500/20"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                    className="relative flex size-20 items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-500/10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                    <Zap className="size-8 text-indigo-400" />
                </motion.div>
            </div>

            {/* Latency display */}
            <motion.span
                key={latency}
                className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-primary"
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                {latency}ms
            </motion.span>
            <span className="mt-2 text-sm text-muted-foreground">Avg. Response Time</span>
        </div>
    )
}

// Intuitive UI Animation - Shows mock dashboard interface
function IntuitiveUIAnimation() {
    const [activeTab, setActiveTab] = useState(0)
    const tabs = ['Keys', 'Languages', 'Team']

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTab(prev => (prev + 1) % tabs.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col overflow-hidden rounded-lg bg-zinc-900/50">
            {/* Mock app header */}
            <div className="flex items-center justify-between border-b border-border/30 bg-zinc-800/50 px-3 py-2">
                <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded bg-indigo-500">
                        <span className="text-xs font-bold text-white">U</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">Unlingo</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Search className="size-3 text-muted-foreground" />
                    <Settings className="size-3 text-muted-foreground" />
                </div>
            </div>

            {/* Mock sidebar + content */}
            <div className="flex flex-1">
                {/* Sidebar */}
                <div className="w-20 border-r border-border/30 bg-zinc-800/30 p-2">
                    {tabs.map((tab, i) => (
                        <motion.div
                            key={tab}
                            className="mb-1 flex items-center gap-1.5 rounded px-2 py-1.5 text-xs"
                            animate={{
                                backgroundColor: activeTab === i ? 'var(--color-indigo-500)' : 'transparent',
                                color: activeTab === i ? 'white' : 'var(--color-muted-foreground)'
                            }}
                        >
                            <Layout className="size-3" />
                            {tab}
                        </motion.div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-3">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-16 rounded bg-zinc-700" />
                            <div className="h-5 w-12 rounded bg-indigo-500/30" />
                        </div>
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                className="flex items-center gap-2 rounded border border-border/30 bg-zinc-800/30 p-2"
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="size-2 rounded-full bg-emerald-500" />
                                <div className="h-2 flex-1 rounded bg-zinc-700" />
                                <ChevronRight className="size-3 text-muted-foreground" />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

// Framework Support Animation - Shows framework logos orbiting
function FrameworkSupportAnimation() {
    const frameworks = [
        { name: 'React', color: '#61DAFB', icon: '⚛️' },
        { name: 'Vue', color: '#4FC08D', icon: '💚' },
        { name: 'Next.js', color: '#FFFFFF', icon: '▲' },
        { name: 'Svelte', color: '#FF3E00', icon: '🔥' },
        { name: 'Angular', color: '#DD0031', icon: '🅰️' },
        { name: 'Nuxt', color: '#00DC82', icon: '💚' },
    ]

    return (
        <div aria-hidden className="relative flex h-full items-center justify-center overflow-hidden rounded-lg">
            {/* Center icon */}
            <motion.div
                className="relative z-10 flex size-16 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
            >
                <Layers className="size-8 text-indigo-400" />
            </motion.div>

            {/* Orbiting frameworks */}
            {frameworks.map((fw, i) => {
                const angle = (i * 360) / frameworks.length
                const radius = 70

                return (
                    <motion.div
                        key={fw.name}
                        className="absolute flex size-10 items-center justify-center rounded-xl border border-border bg-zinc-800 text-lg shadow-lg"
                        animate={{
                            rotate: [angle, angle + 360],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: 'linear'
                        }}
                        style={{
                            transformOrigin: `center ${radius + 20}px`
                        }}
                    >
                        <motion.span
                            animate={{ rotate: [-angle, -angle - 360] }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: 'linear'
                            }}
                        >
                            {fw.icon}
                        </motion.span>
                    </motion.div>
                )
            })}

            {/* Connection lines */}
            <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
                <motion.circle
                    cx="50%"
                    cy="50%"
                    r="70"
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: 'center' }}
                />
            </svg>
        </div>
    )
}

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
                                <AnalyticsAnimation />
                            </div>
                        </Card>

                        {/* Fast Performance - Stat Card */}
                        <Card className="group flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl p-8 text-center">
                            <FastPerformanceAnimation />
                        </Card>

                        {/* Intuitive UI */}
                        <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <IntuitiveUIAnimation />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Intuitive Interface</h3>
                                <p className="text-muted-foreground mt-3">Clean, simple UI that's easy to navigate. No learning curve required.</p>
                            </div>
                        </Card>

                        {/* Framework Support */}
                        <Card className="@4xl:col-span-2 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div className="relative aspect-video overflow-hidden rounded-lg">
                                <FrameworkSupportAnimation />
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
