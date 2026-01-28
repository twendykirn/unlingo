import { api } from "@unlingo/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, Check, ChevronsUpDown, CircleCheck, CreditCard, LockIcon, LogOut, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useClerk, useOrganization, useOrganizationList, useUser } from "@clerk/tanstack-react-start";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuShortcut, MenuTrigger } from "./ui/menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toastManager } from "./ui/toast";
import { useNavigate } from "@tanstack/react-router";
import { CheckoutLink } from "./polar";

interface Props {
    isOpen: boolean;
}

const PLAN_CONFIG: Record<string, { requests: string; keys: string }> = {
    pro5: { requests: "10K", keys: "500" },
    pro12: { requests: "50K", keys: "2K" },
    pro25: { requests: "100K", keys: "10K" },
    pro50: { requests: "200K", keys: "20K" },
    pro75: { requests: "350K", keys: "35K" },
    pro100: { requests: "500K", keys: "50K" },
    pro250: { requests: "1.5M", keys: "75K" },
    pro500: { requests: "4M", keys: "100K" },
    pro1000: { requests: "10M", keys: "100K" },
};

const INCLUDED_FEATURES = [
    "Unlimited projects",
    "Unlimited namespaces",
    "Unlimited glossary",
    "Unlimited language rules",
    "90+ languages",
    "Screenshots",
    "Releases with A/B tests",
    "AI translations",
];

const PremiumLockDialog = ({ isOpen }: Props) => {
    const user = useUser();
    const { openUserProfile, signOut } = useClerk();
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

    const navigate = useNavigate();

    const { organization } = useOrganization();
    const {
        userMemberships,
        isLoaded: orgListLoaded,
        setActive,
    } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    const userOrgs = useMemo(() => {
        if (!orgListLoaded || userMemberships.isLoading) return [];

        return userMemberships.data.filter(org => org.organization);
    }, [orgListLoaded, userMemberships]);

    const handleOrganizationSwitch = async (orgId: string) => {
        if (orgId === organization?.id) {
            return;
        }

        try {
            await setActive?.({ organization: orgId });
        } catch (error) {
            toastManager.add({
                description: "Failed to switch organization",
                title: "Error",
                type: "error",
            });
        }
    };

    const products = useQuery(api.polarActions.getConfiguredProducts, undefined);

    const planList = useMemo(() => {
        if (!products) return [];

        return Object.entries(products)
            .filter(([_, product]) => product !== undefined)
            .map(([key, product]) => {
                const config = PLAN_CONFIG[key] || { requests: "N/A", keys: 1 };
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
                };
            })
            .sort((a, b) => {
                return a.price - b.price;
            });
    }, [products]);

    useEffect(() => {
        if (planList.length > 0 && !selectedPackage) {
            setSelectedPackage(planList[0].id);
        }
    }, [planList, selectedPackage]);

    const handleCreateOrganization = () => {
        navigate({
            to: "/new",
        });
    };

    const email = user.user?.primaryEmailAddress?.emailAddress || '';
    const avatar = user.user?.imageUrl || '';

    if (!organization) {
        return null;
    }

    return (
        <Dialog open={isOpen}>
            <DialogPopup className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
                <DialogHeader>
                    <div className="w-full flex items-center justify-between">
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
                        <div>
                            <Menu>
                                <MenuTrigger
                                    className="flex items-center gap-2"
                                    render={<Button variant='ghost' />}
                                >
                                    <Avatar className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                        <AvatarImage
                                            alt={organization.name}
                                            src={organization.imageUrl}
                                        />
                                        <AvatarFallback>{organization.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{organization.name}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto" />
                                </MenuTrigger>
                                <MenuPopup
                                    align="start"
                                    side="bottom"
                                    sideOffset={4}
                                >
                                    <MenuGroup>
                                        <MenuGroupLabel className="text-muted-foreground text-xs">
                                            Workspaces
                                        </MenuGroupLabel>
                                        {userOrgs.map(org => (
                                            <MenuItem
                                                key={org.id}
                                                onClick={() => handleOrganizationSwitch(org.organization.id)}
                                                className="gap-2 p-2"
                                            >
                                                <Avatar className="size-6 rounded-md border">
                                                    <AvatarImage
                                                        alt={org.organization.name}
                                                        src={org.organization.imageUrl}
                                                    />
                                                    <AvatarFallback>{org.organization.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {org.organization.name}
                                                {org.organization.id === organization.id ?
                                                    <MenuShortcut>
                                                        <CircleCheck className="h-4 w-4 text-green-600" />
                                                    </MenuShortcut>
                                                    : null
                                                }
                                            </MenuItem>
                                        ))}
                                    </MenuGroup>
                                    <MenuSeparator />
                                    <MenuItem className="gap-2 p-2" onClick={() => handleCreateOrganization()}>
                                        <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                            <Plus className="size-4" />
                                        </div>
                                        <div className="text-muted-foreground font-medium">Add workspace</div>
                                    </MenuItem>
                                </MenuPopup>
                            </Menu>
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
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-foreground">
                                                ${plan.price}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    /{plan.interval}
                                                </span>
                                            </div>
                                            {plan.price === planList[0]?.price && (
                                                <span className="text-xs text-primary font-medium">7-day trial</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div>{plan.keys} keys/workspace</div>
                                            <div>{plan.requests} requests/month</div>
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
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <Menu>
                                <MenuTrigger
                                    className="flex items-center gap-2"
                                    render={<Button variant='ghost' />}
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={avatar} alt={email} />
                                        <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{email}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </MenuTrigger>
                                <MenuPopup
                                    side="right"
                                    align="end"
                                    sideOffset={4}
                                >
                                    <MenuGroup>
                                        <MenuGroupLabel className="p-0 font-normal">
                                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                                <Avatar className="h-8 w-8 rounded-lg">
                                                    <AvatarImage src={avatar} alt={email} />
                                                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                                </Avatar>
                                                <div className="grid flex-1 text-left text-sm leading-tight">
                                                    <span className="truncate font-medium">{email}</span>
                                                </div>
                                            </div>
                                        </MenuGroupLabel>
                                    </MenuGroup>
                                    <MenuSeparator />
                                    <MenuGroup>
                                        <MenuItem onClick={() => {
                                            openUserProfile();
                                        }}>
                                            <BadgeCheck />
                                            Account
                                        </MenuItem>
                                    </MenuGroup>
                                    <MenuSeparator />
                                    <MenuItem
                                        variant="destructive"
                                        onClick={() => {
                                            signOut();
                                        }}
                                    >
                                        <LogOut />
                                        Log out
                                    </MenuItem>
                                </MenuPopup>
                            </Menu>
                        </div>
                        {selectedPackage ? (
                            <CheckoutLink
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
