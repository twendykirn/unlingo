import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"
import { useUser } from "@clerk/tanstack-react-start"

interface Props extends React.ComponentProps<typeof Sidebar> {
    activeItem: 'home' | 'billing' | 'logs';
}

export function AppSidebar({ activeItem, ...props }: Props) {
    const user = useUser();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <WorkspaceSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <NavMain activeItem={activeItem} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={{
                    email: user.user?.primaryEmailAddress?.emailAddress || '',
                    avatar: user.user?.imageUrl || '',
                }} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
