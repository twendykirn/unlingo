import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Mail, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'

const PLANS: { requests: string; keys: string, price: number }[] = [
    { requests: "10K", keys: "500", price: 5 },
    { requests: "50K", keys: "2K", price: 12 },
    { requests: "100K", keys: "10K", price: 25 },
    { requests: "200K", keys: "20K", price: 50 },
    { requests: "350K", keys: "35K", price: 75 },
    { requests: "500K", keys: "50K", price: 100 },
    { requests: "1.5M", keys: "75K", price: 250 },
    { requests: "4M", keys: "100K", price: 500 },
    { requests: "10M", keys: "100K", price: 1000 },
];

const INCLUDED_FEATURES = [
    "Unlimited projects",
    "Unlimited namespaces",
    "Unlimited glossary",
    "Unlimited language rules",
    "90+ languages",
    "AI translations",
]

export default function PricingSection() {
    const [selectedTier, setSelectedTier] = useState<string | null>(null)

    useEffect(() => {
        if (!selectedTier) {
            const defaultPlan = PLANS.find(p => p.keys === "10K") || PLANS[2] || PLANS[0]
            if (defaultPlan) {
                setSelectedTier(defaultPlan.keys)
            }
        }
    }, [selectedTier])

    const selectedPlan = PLANS.find(p => p.keys === selectedTier)

    return (
        <section
            data-theme="dark"
            className="bg-background py-16 md:py-24"
            id="pricing"
        >
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    <Card className="p-8 md:p-10 h-full">
                        <div className="h-full flex flex-col justify-between gap-6">
                            <div className='flex flex-col gap-6'>
                                <p className="text-muted-foreground text-sm">
                                    Choose how many translation keys you'll need
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {PLANS.map((plan) => (
                                        <button
                                            key={plan.keys}
                                            type="button"
                                            onClick={() => setSelectedTier(plan.keys)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                                selectedTier === plan.keys
                                                    ? "bg-foreground text-background border-foreground"
                                                    : "bg-transparent text-foreground border-border hover:border-foreground/50"
                                            )}
                                        >
                                            {plan.keys}
                                        </button>
                                    ))}
                                    <a
                                        href="mailto:support@unlingo.com"
                                        className="px-4 py-2 rounded-full text-sm font-medium transition-all border bg-transparent text-foreground border-border hover:border-foreground/50"
                                    >
                                        Custom
                                    </a>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-5xl md:text-6xl font-bold text-foreground">
                                            ${selectedPlan?.price ?? "—"}
                                        </span>
                                        <span className="text-muted-foreground ml-2">
                                            Per month
                                        </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        + VAT if applicable
                                    </span>
                                </div>
                                {selectedPlan && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {selectedPlan.requests} requests/month
                                        {selectedPlan.price === 5 && (
                                            <span className="block text-primary mt-1">Includes 7-day free trial</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground text-balance">
                                Simple, transparent pricing
                            </h2>
                            <p className="text-muted-foreground mt-4 text-lg text-balance">
                                Pay only for what you use. Choose your keys volume - everything else is unlimited. No surprises, no hidden fees.
                            </p>
                        </div>

                        <ul className="space-y-3">
                            {INCLUDED_FEATURES.map((feature) => (
                                <li key={feature} className="flex items-center gap-3 text-foreground">
                                    <Check className="size-5 text-primary flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button size="lg" render={<Link to="/sign-up/$" />}>
                                <Sparkles className="size-4" />
                                Get started now
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                render={<a href="mailto:support@unlingo.com" />}
                            >
                                <Mail className="size-4" />
                                Contact for custom
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            All features are included upfront - no hidden costs. You choose how many keys to use per workspace.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
