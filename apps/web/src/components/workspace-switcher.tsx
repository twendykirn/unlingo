import { useMemo } from "react"
import { ChevronsUpDown, Plus, CircleCheck } from "lucide-react"
import {
    Menu,
    MenuPopup,
    MenuItem,
    MenuGroup,
    MenuGroupLabel,
    MenuSeparator,
    MenuShortcut,
    MenuTrigger,
} from "@/components/ui/menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useOrganization, useOrganizationList } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import { toastManager } from "./ui/toast";

export function WorkspaceSwitcher() {
    const { isMobile } = useSidebar();
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

    const handleCreateOrganization = () => {
        navigate({
            to: "/new",
        });
    };

    if (!organization) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Menu>
                    <MenuTrigger className='w-full' render={<SidebarMenuButton
                        size="lg"
                        className="w-[100%] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    />}>
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
                        side={isMobile ? "bottom" : "right"}
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
            </SidebarMenuItem>
        </SidebarMenu>
    )
}