'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { BookOpen, FlaskConical, Languages, GitBranch, Braces, ChevronRight, Check } from 'lucide-react'

// Glossary Animation - Shows term definitions and consistent translations
function GlossaryAnimation() {
    const [activeIndex, setActiveIndex] = useState(0)

    const terms = [
        { term: 'Dashboard', definition: 'Main control panel', translations: { es: 'Panel', fr: 'Tableau' } },
        { term: 'Settings', definition: 'Configuration options', translations: { es: 'Ajustes', fr: 'Paramètres' } },
        { term: 'Account', definition: 'User profile', translations: { es: 'Cuenta', fr: 'Compte' } },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % terms.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-4">
            {/* Glossary header */}
            <div className="mb-3 flex items-center gap-2">
                <BookOpen className="size-4 text-indigo-400" />
                <span className="text-xs font-medium text-muted-foreground">Project Glossary</span>
            </div>

            {/* Terms list */}
            <div className="space-y-2">
                {terms.map((item, i) => (
                    <motion.div
                        key={item.term}
                        className="rounded-lg border border-border/50 bg-zinc-800/60 p-2.5"
                        animate={{
                            borderColor: activeIndex === i ? 'var(--color-indigo-500)' : 'var(--color-border)',
                            scale: activeIndex === i ? 1.02 : 1
                        }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{item.term}</span>
                            <motion.div
                                className="flex gap-1"
                                animate={{ opacity: activeIndex === i ? 1 : 0.5 }}
                            >
                                <Badge variant="outline" size="sm">{item.translations.es}</Badge>
                                <Badge variant="outline" size="sm">{item.translations.fr}</Badge>
                            </motion.div>
                        </div>
                        <p className={`mt-1 text-xs text-muted-foreground transition-opacity ${activeIndex === i ? 'opacity-100' : 'opacity-0'}`}>
                            {item.definition}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

// A/B Testing Animation - Shows split testing for translations
function ABTestingAnimation() {
    const [activeVariant, setActiveVariant] = useState<'A' | 'B'>('A')
    const [percentage, setPercentage] = useState({ A: 50, B: 50 })

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveVariant(prev => prev === 'A' ? 'B' : 'A')
            // Simulate dynamic allocation
            const aPercent = Math.floor(Math.random() * 30) + 35 // 35-65%
            setPercentage({ A: aPercent, B: 100 - aPercent })
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-4">
            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
                <FlaskConical className="size-4 text-indigo-400" />
                <span className="text-xs font-medium text-muted-foreground">Release: v2.1.0</span>
                <Badge variant="success" size="sm">Live</Badge>
            </div>

            {/* Variants */}
            <div className="grid grid-cols-2 gap-3">
                {(['A', 'B'] as const).map((variant) => (
                    <motion.div
                        key={variant}
                        className="rounded-lg border border-border/50 bg-zinc-800/60 p-3"
                        animate={{
                            borderColor: activeVariant === variant ? 'var(--color-emerald-500)' : 'var(--color-border)',
                            scale: activeVariant === variant ? 1.03 : 1
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <Badge variant={activeVariant === variant ? 'default' : 'outline'} size="sm">
                                Variant {variant}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{percentage[variant]}%</span>
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-2 w-full rounded bg-zinc-700" />
                            <div className="h-2 w-3/4 rounded bg-zinc-700" />
                        </div>
                        <div className={`mt-2 flex items-center gap-1 text-xs text-emerald-400 transition-opacity ${activeVariant === variant ? 'opacity-100' : 'opacity-0'}`}>
                            <Check className="size-3" /> Active
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Traffic Split</span>
                    <span>{percentage.A}% / {percentage.B}%</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                        className="bg-indigo-500"
                        animate={{ width: `${percentage.A}%` }}
                        transition={{ duration: 0.5 }}
                    />
                    <motion.div
                        className="bg-emerald-500"
                        animate={{ width: `${percentage.B}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </div>
    )
}

// Language Rules Animation - Shows grammar rules configuration
function LanguageRulesAnimation() {
    const [activeRule, setActiveRule] = useState(0)

    const rules = [
        { lang: 'DE', rule: 'Capitalize nouns', example: 'der Hund → Der Hund' },
        { lang: 'FR', rule: 'Elision rules', example: "le ami → l'ami" },
        { lang: 'ES', rule: 'Gender agreement', example: 'el → la' },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveRule(prev => (prev + 1) % rules.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-4">
            {/* Header */}
            <div className="mb-3 flex items-center gap-2">
                <Languages className="size-4 text-indigo-400" />
                <span className="text-xs font-medium text-muted-foreground">Grammar Rules</span>
            </div>

            {/* Rules list */}
            <div className="space-y-2">
                {rules.map((item, i) => (
                    <motion.div
                        key={item.lang}
                        className="flex items-center gap-3 rounded-lg border border-border/50 bg-zinc-800/60 p-2"
                        animate={{
                            borderColor: activeRule === i ? 'var(--color-indigo-500)' : 'var(--color-border)',
                            x: activeRule === i ? 4 : 0
                        }}
                        transition={{ duration: 0.2 }}
                    >
                        <Badge variant={activeRule === i ? 'default' : 'outline'} size="sm" className={activeRule === i ? 'bg-indigo-500' : ''}>
                            {item.lang}
                        </Badge>
                        <div className="flex-1">
                            <p className="text-xs font-medium text-foreground">{item.rule}</p>
                            <p className={`mt-0.5 font-mono text-xs text-muted-foreground transition-opacity ${activeRule === i ? 'opacity-100' : 'opacity-0'}`}>
                                {item.example}
                            </p>
                        </div>
                        <ChevronRight className={`size-3 transition-colors ${activeRule === i ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

// CI/CD Build Animation - Shows build pipeline
function CICDBuildAnimation() {
    const [buildStep, setBuildStep] = useState(0)

    const steps = [
        { name: 'Fetch translations', status: 'done' },
        { name: 'Generate files', status: 'done' },
        { name: 'Validate keys', status: 'running' },
        { name: 'Deploy', status: 'pending' },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setBuildStep(prev => (prev + 1) % 5)
        }, 1500)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-4">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GitBranch className="size-4 text-indigo-400" />
                    <span className="text-xs font-medium text-muted-foreground">CI/CD Pipeline</span>
                </div>
                <Badge variant="info" size="sm">Building</Badge>
            </div>

            {/* Pipeline steps */}
            <div className="space-y-2">
                {steps.map((step, i) => {
                    const isCompleted = i < buildStep
                    const isRunning = i === buildStep
                    const isPending = i > buildStep

                    return (
                        <motion.div
                            key={step.name}
                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-zinc-800/60 p-2"
                            animate={{
                                borderColor: isRunning ? 'var(--color-amber-500)' : isCompleted ? 'var(--color-emerald-500)' : 'var(--color-border)',
                                opacity: isPending ? 0.5 : 1
                            }}
                        >
                            <motion.div
                                className={`flex size-5 items-center justify-center rounded-full text-xs ${
                                    isCompleted ? 'bg-emerald-500/20 text-emerald-400' :
                                    isRunning ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-zinc-700 text-muted-foreground'
                                }`}
                                animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 0.5, repeat: isRunning ? Infinity : 0 }}
                            >
                                {isCompleted ? <Check className="size-3" /> : i + 1}
                            </motion.div>
                            <span className="flex-1 text-xs text-foreground">{step.name}</span>
                            <div className="h-1 w-8 overflow-hidden rounded-full bg-zinc-700">
                                {isRunning && (
                                    <motion.div
                                        className="h-full bg-amber-500"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

// Simple API Animation - Shows multiple endpoints abstractly with dots
function SimpleAPIAnimation() {
    const [activeEndpoint, setActiveEndpoint] = useState(0)

    const endpoints = [
        { method: 'GET', name: 'translations', color: 'emerald' },
        { method: 'GET', name: 'keys', color: 'blue' },
        { method: 'POST', name: 'builds', color: 'amber' },
        { method: 'GET', name: 'releases', color: 'purple' },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveEndpoint(prev => (prev + 1) % endpoints.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div aria-hidden className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg p-4">
            {/* Header */}
            <div className="mb-3 flex items-center gap-2">
                <Braces className="size-4 text-indigo-400" />
                <span className="text-xs font-medium text-muted-foreground">API Endpoints</span>
            </div>

            {/* Endpoints list */}
            <div className="space-y-2">
                {endpoints.map((endpoint, i) => {
                    const isActive = activeEndpoint === i
                    const methodColors: Record<string, string> = {
                        GET: 'bg-emerald-500/20 text-emerald-400',
                        POST: 'bg-amber-500/20 text-amber-400',
                    }

                    return (
                        <motion.div
                            key={endpoint.name}
                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-zinc-800/60 p-2"
                            animate={{
                                borderColor: isActive ? 'var(--color-indigo-500)' : 'var(--color-border)',
                                scale: isActive ? 1.02 : 1
                            }}
                            transition={{ duration: 0.2 }}
                        >
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${methodColors[endpoint.method]}`}>
                                {endpoint.method}
                            </span>
                            <div className="flex flex-1 items-center gap-1">
                                <span className="text-muted-foreground">•••</span>
                                <span className="text-xs text-foreground">/{endpoint.name}</span>
                            </div>
                            <div className={`flex gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                {[0, 1, 2].map((dot) => (
                                    <motion.div
                                        key={dot}
                                        className="size-1.5 rounded-full bg-indigo-400"
                                        animate={isActive ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.3 }}
                                        transition={{ duration: 0.8, delay: dot * 0.2, repeat: isActive ? Infinity : 0 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Response preview */}
            <motion.div
                className="mt-3 rounded-lg border border-border/30 bg-zinc-900/80 p-2"
                animate={{ opacity: 1 }}
            >
                <div className="font-mono text-[10px]">
                    <span className="text-muted-foreground">{'{'}</span>
                    <span className="text-indigo-300"> "data"</span>
                    <span className="text-muted-foreground">: [</span>
                    <span className="text-emerald-400">...</span>
                    <span className="text-muted-foreground">] {'}'}</span>
                </div>
            </motion.div>
        </div>
    )
}

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
                            <div className="relative min-h-[200px] overflow-hidden rounded-lg bg-muted">
                                <GlossaryAnimation />
                            </div>
                        </Card>

                        {/* A/B Testing Releases */}
                        <Card className="@xl:col-span-2 @4xl:col-span-6 grid grid-rows-[auto_1fr] gap-8 rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div>
                                <h3 className="text-foreground font-semibold">Releases with A/B Testing</h3>
                                <p className="text-muted-foreground mt-3">Create releases and run A/B tests for over-the-air translations. Dynamically test and optimize your builds in production.</p>
                            </div>
                            <div className="relative min-h-[200px] overflow-hidden rounded-lg">
                                <ABTestingAnimation />
                            </div>
                        </Card>

                        {/* Language Rules */}
                        <Card className="@4xl:col-span-3 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative min-h-[180px] overflow-hidden rounded-lg bg-muted">
                                <LanguageRulesAnimation />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Custom Language Rules</h3>
                                <p className="text-muted-foreground mt-3">Define grammar rules for specific languages. Handle complex linguistic requirements with ease.</p>
                            </div>
                        </Card>

                        {/* CI/CD Build Integration */}
                        <Card className="@4xl:col-span-4 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div className="relative min-h-[180px] overflow-hidden rounded-lg">
                                <CICDBuildAnimation />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">CI/CD Build Integration</h3>
                                <p className="text-muted-foreground mt-3">Create builds and fetch them in your CI/CD pipeline. Generate translation builds dynamically for seamless deployments.</p>
                            </div>
                        </Card>

                        {/* Simple API */}
                        <Card className="@4xl:row-start-auto @4xl:col-span-3 row-start-1 grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative min-h-[180px] overflow-hidden rounded-lg bg-muted">
                                <SimpleAPIAnimation />
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
