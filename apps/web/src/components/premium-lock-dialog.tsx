import { api } from "@unlingo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Check, CreditCard, LockIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle
} from "./ui/dialog";
import { CheckoutLink } from '@convex-dev/polar/react';
import { cn } from "@/lib/utils";

interface Props {
    isOpen: boolean;
}

const PLAN_CONFIG: Record<string, { requests: string; keys: number }> = {
    pro10kRequests: { requests: "10K", keys: 1 },
    pro50kRequests: { requests: "50K", keys: 2 },
    pro250kRequests: { requests: "250K", keys: 3 },
    pro500kRequests: { requests: "500K", keys: 5 },
    pro1mRequests: { requests: "1M", keys: 10 },
    pro2mRequests: { requests: "2M", keys: 15 },
    pro10mRequests: { requests: "10M", keys: 25 },
    pro50mRequests: { requests: "50M", keys: 50 },
    pro100mRequests: { requests: "100M", keys: 100 },
};

const INCLUDED_FEATURES = [
    "Unlimited projects",
    "Unlimited namespaces",
    "90+ languages",
    "Glossary & terminology",
    "Language rules",
    "Screenshots",
    "Releases with A/B tests",
    "AI translations",
];

const PremiumLockDialog = ({ isOpen }: Props) => {
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

    const products = useQuery(api.polar.getConfiguredProducts, undefined);

    const planList = useMemo(() => {
        if (!products) return [];

        return Object.entries(products)
            .filter(([_, product]) => product !== undefined)
            .map(([key, product]) => {
                const config = PLAN_CONFIG[key] || { requests: "N/A", keys: 1 };
                return {
                    id: product!.id,
                    name: product!.name,
                    price: product!.prices?.[0]?.priceAmount
                        ? `$${(product!.prices[0].priceAmount / 100).toFixed(0)}`
                        : "N/A",
                    interval: "month",
                    requests: config.requests,
                    keys: config.keys,
                    key,
                };
            })
            .sort((a, b) => {
                return a.keys - b.keys;
            });
    }, [products]);

    useEffect(() => {
        if (planList.length > 0 && !selectedPackage) {
            setSelectedPackage(planList[0].id);
        }
    }, [planList, selectedPackage]);

    return (
        <Dialog open={isOpen}>
            <DialogPopup className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary">
                            <LockIcon className="size-6" />
                        </div>
                        <div>
                            <DialogTitle>Premium Required</DialogTitle>
                            <DialogDescription>
                                Choose a plan to unlock the dashboard
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogPanel className="grid gap-6">
                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-foreground">
                            Included in all plans:
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {INCLUDED_FEATURES.map((feature) => (
                                <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Check className="size-4 text-primary flex-shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {planList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {planList.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedPackage(plan.id)}
                                    className={cn(
                                        "relative p-4 rounded-xl border-2 text-left transition-all",
                                        "hover:border-primary/50 hover:bg-primary/5",
                                        selectedPackage === plan.id
                                            ? "border-primary bg-primary/10"
                                            : "border-border bg-background"
                                    )}
                                >
                                    {selectedPackage === plan.id && (
                                        <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="size-3 text-primary-foreground" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <div className="font-semibold text-foreground">
                                            {plan.price}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                /{plan.interval}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div>{plan.requests} requests/month</div>
                                            <div>{plan.keys} API {plan.keys === 1 ? "key" : "keys"}/workspace</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            Loading plans...
                        </div>
                    )}
                </DialogPanel>
                <DialogFooter>
                    <div className="flex justify-end w-full">
                        {selectedPackage ? (
                            <CheckoutLink
                                polarApi={api.polar}
                                productIds={[selectedPackage]}>
                                <Button className="gap-2" size="lg">
                                    <CreditCard className="size-4" />
                                    Continue with selected plan
                                </Button>
                            </CheckoutLink>
                        ) : (
                            <Button disabled className="gap-2" size="lg">
                                <CreditCard className="size-4" />
                                Select a plan to continue
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
};

export default PremiumLockDialog;
