import {
    BadgeCheck,
    ChevronsUpDown,
    LogOut,
} from "lucide-react"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    Menu,
    MenuPopup,
    MenuGroup,
    MenuItem,
    MenuGroupLabel,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useClerk } from "@clerk/tanstack-react-start"

export function NavUser({
    user,
}: {
    user: {
        email: string
        avatar: string
    }
}) {
    const { isMobile } = useSidebar();
    const { openUserProfile, signOut } = useClerk();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Menu>
                    <MenuTrigger className="w-full" render={<SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    />}>
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={user.avatar} alt={user.email} />
                            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{user.email}</span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4" />
                    </MenuTrigger>
                    <MenuPopup
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <MenuGroup>
                            <MenuGroupLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar} alt={user.email} />
                                        <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.email}</span>
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
                                (window as any).uj?.identify(null);
                                (window as any).uj?.destroy();
                                signOut();
                            }}
                        >
                            <LogOut />
                            Log out
                        </MenuItem>
                    </MenuPopup>
                </Menu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
