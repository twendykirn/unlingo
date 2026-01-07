import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Mail, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@unlingo/backend/convex/_generated/api'
import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'

const PLAN_CONFIG: Record<string, { requests: string; keys: string }> = {
    pro10kRequests: { requests: "10K", keys: "1K" },
    pro50kRequests: { requests: "50K", keys: "5K" },
    pro250kRequests: { requests: "250K", keys: "25K" },
    pro500kRequests: { requests: "500K", keys: "50K" },
    pro1mRequests: { requests: "1M", keys: "100K" },
    pro2mRequests: { requests: "2M", keys: "200K" },
    pro10mRequests: { requests: "10M", keys: "200K" },
    pro50mRequests: { requests: "50M", keys: "200K" },
    pro100mRequests: { requests: "100M", keys: "200K" },
}

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

    const products = useQuery(api.polarActions.getConfiguredProducts, undefined)

    const planList = useMemo(() => {
        if (!products) return []

        return Object.entries(products)
            .filter(([_, product]) => product !== undefined)
            .map(([key, product]) => {
                const config = PLAN_CONFIG[key] || { requests: "N/A", keys: "1" }
                return {
                    id: product!.polarId,
                    name: product!.name,
                    price: product!.prices?.[0]?.priceAmount
                        ? (product!.prices[0].priceAmount / 100)
                        : 0,
                    interval: "month",
                    requests: config.requests,
                    keys: config.keys,
                    key,
                }
            })
            .sort((a, b) => a.price - b.price)
    }, [products])

    useEffect(() => {
        if (planList.length > 0 && !selectedTier) {
            const defaultPlan = planList.find(p => p.requests === "250K") || planList[2] || planList[0]
            if (defaultPlan) {
                setSelectedTier(defaultPlan.id)
            }
        }
    }, [planList, selectedTier])

    const selectedPlan = planList.find(p => p.id === selectedTier)

    return (
        <section
            data-theme="dark"
            className="bg-background py-16 md:py-24"
        >
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    <Card className="p-8 md:p-10">
                        <div className="space-y-6">
                            <p className="text-muted-foreground text-sm">
                                Choose how many requests you'll need per month
                            </p>

                            {planList.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {planList.map((plan) => (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => setSelectedTier(plan.id)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                                selectedTier === plan.id
                                                    ? "bg-foreground text-background border-foreground"
                                                    : "bg-transparent text-foreground border-border hover:border-foreground/50"
                                            )}
                                        >
                                            {plan.requests}
                                        </button>
                                    ))}
                                    <a
                                        href="mailto:support@unlingo.com"
                                        className="px-4 py-2 rounded-full text-sm font-medium transition-all border bg-transparent text-foreground border-border hover:border-foreground/50"
                                    >
                                        Custom
                                    </a>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {["10K", "50K", "250K", "500K", "1M", "2M"].map((tier) => (
                                        <div
                                            key={tier}
                                            className="px-4 py-2 rounded-full text-sm font-medium bg-muted/50 text-muted-foreground animate-pulse"
                                        >
                                            {tier}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-8 border-t border-border">
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
                                        {selectedPlan.keys} keys/workspace
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
                                Pay only for what you use. Choose your request volume - everything else is unlimited. No surprises, no hidden fees.
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
                            All features are included upfront - no hidden costs. You choose how many requests to use each month.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
