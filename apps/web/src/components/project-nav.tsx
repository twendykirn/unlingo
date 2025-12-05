import {
    ArrowLeft,
    Newspaper,
    Images,
    Boxes,
    KeyRound,
    Logs,
} from "lucide-react"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useClerk } from "@clerk/tanstack-react-start"
import { useNavigate } from "@tanstack/react-router"

interface Props {
    activeItem: 'namespaces' | 'api-keys' | 'releases' | 'screenshots' | 'logs';
}

export function ProjectNav({ activeItem }: Props) {
    const { openOrganizationProfile } = useClerk();

    const navigate = useNavigate();

    const handleNavigateToHome = () => {
        navigate({
            to: '/dashboard',
        })
    }

    const handleNavigateToBilling = () => {
        navigate({
            to: '/dashboard/billing',
        })
    }

    return (
        <>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem key='dashboard'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" onClick={() => handleNavigateToHome()}>
                            <ArrowLeft />
                            <span>Back to dashboard</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem key='namespaces'>
                        <SidebarMenuButton isActive={activeItem === 'namespaces'} className="text-sidebar-foreground/70" onClick={() => handleNavigateToHome()}>
                            <Newspaper />
                            <span>Namespaces</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='screenshots'>
                        <SidebarMenuButton isActive={activeItem === 'screenshots'} className="text-sidebar-foreground/70" onClick={() => openOrganizationProfile()}>
                            <Images />
                            <span>Screenshots</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='releases'>
                        <SidebarMenuButton isActive={activeItem === 'releases'} className="text-sidebar-foreground/70" onClick={() => openOrganizationProfile()}>
                            <Boxes />
                            <span>Releases</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='api-keys'>
                        <SidebarMenuButton isActive={activeItem === 'api-keys'} className="text-sidebar-foreground/70" onClick={() => handleNavigateToBilling()}>
                            <KeyRound />
                            <span>Api Keys</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='logs'>
                        <SidebarMenuButton isActive={activeItem === 'api-keys'} className="text-sidebar-foreground/70" onClick={() => handleNavigateToBilling()}>
                            <Logs />
                            <span>Logs</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
}