import { api } from "@unlingo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { CreditCard, LockIcon, Sparkles } from "lucide-react";
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
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./ui/select";
import { CheckoutLink } from '@convex-dev/polar/react';

interface Props {
    isOpen: boolean;
}

const PremiumLockDialog = ({ isOpen }: Props) => {
    const [selectedPackage, setSelectedPackage] = useState<string | null>('');

    const products = useQuery(api.polar.getConfiguredProducts, undefined);

    const filteredProducts = useMemo(() => {
        if (!products) return [];

        return Object.values(products)
            .filter(p => p !== undefined)
            .map(p => ({ value: p.id, label: p.name }));
    }, [products]);

    // Set default selected package when products are loaded
    useEffect(() => {
        if (products && products.pro10kRequests && !selectedPackage) {
            setSelectedPackage(products.pro10kRequests.id);
        }
    }, [products, selectedPackage]);

    return (
        <Dialog open={isOpen}>
            <DialogPopup className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary">
                            <LockIcon className="size-6" />
                        </div>
                        <div>
                            <DialogTitle>Premium Required</DialogTitle>
                            <DialogDescription>
                                Upgrade to access the dashboard
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogPanel className="grid gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                        <div className="flex items-start gap-3">
                            <Sparkles className="size-5 text-primary mt-0.5" />
                            <div>
                                <h4 className="font-medium text-foreground">
                                    Unlock Full Access
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Get access to all features including the dashboard, translation management, API keys, and more.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-foreground">
                            What's included:
                        </h5>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary" />
                                Full dashboard access
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary" />
                                Unlimited projects
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary" />
                                Translation API access
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary" />
                                Screenshot management
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="size-1.5 rounded-full bg-primary" />
                                Glossary & terminology
                            </li>
                        </ul>
                    </div>
                </DialogPanel>
                <DialogFooter>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                        {filteredProducts.length > 0 ? (
                            <>
                                <Select
                                    aria-label="Select plan"
                                    items={filteredProducts}
                                    value={selectedPackage}
                                    onValueChange={setSelectedPackage}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPopup alignItemWithTrigger={false}>
                                        {filteredProducts.map(({ label, value }) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectPopup>
                                </Select>
                                {selectedPackage ? (
                                    <CheckoutLink
                                        polarApi={api.polar}
                                        productIds={[selectedPackage as string]}>
                                        <Button className="gap-2">
                                            <CreditCard className="size-4" />
                                            Upgrade Now
                                        </Button>
                                    </CheckoutLink>
                                ) : null}
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground text-center w-full py-2">
                                Loading plans...
                            </div>
                        )}
                    </div>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
};

export default PremiumLockDialog;
