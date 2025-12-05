import {
    ArrowLeft,
    Newspaper,
    Images,
    Boxes,
    KeyRound,
    RocketIcon,
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
    activeItem: 'namespaces' | 'api-keys' | 'releases' | 'screenshots' | 'builds';
    projectId: string;
}

export function ProjectNav({ activeItem, projectId }: Props) {
    const { openOrganizationProfile } = useClerk();

    const navigate = useNavigate();

    const handleNavigateToDashboard = () => {
        navigate({
            to: '/dashboard',
        })
    }

    const handleNavigateToNamespaces = () => {
        navigate({
            to: '/projects/$projectId',
            params: {
                projectId: projectId,
            },
        });
    }

    const handleNavigateToApiKeys = () => {
        navigate({
            to: '/projects/$projectId/api-keys',
            params: {
                projectId: projectId,
            },
        });
    }

    return (
        <>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem key='dashboard'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" onClick={() => handleNavigateToDashboard()}>
                            <ArrowLeft />
                            <span>Back to dashboard</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem key='namespaces'>
                        <SidebarMenuButton
                            isActive={activeItem === 'namespaces'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToNamespaces()}
                        >
                            <Newspaper />
                            <span>Namespaces</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='screenshots'>
                        <SidebarMenuButton
                            isActive={activeItem === 'screenshots'}
                            className="text-sidebar-foreground/70"
                            onClick={() => openOrganizationProfile()}
                        >
                            <Images />
                            <span>Screenshots</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='builds'>
                        <SidebarMenuButton
                            isActive={activeItem === 'builds'}
                            className="text-sidebar-foreground/70"
                            onClick={() => openOrganizationProfile()}
                        >
                            <Boxes />
                            <span>Builds</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='releases'>
                        <SidebarMenuButton
                            isActive={activeItem === 'releases'}
                            className="text-sidebar-foreground/70"
                            onClick={() => openOrganizationProfile()}
                        >
                            <RocketIcon />
                            <span>Releases</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='api-keys'>
                        <SidebarMenuButton
                            isActive={activeItem === 'api-keys'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToApiKeys()}
                        >
                            <KeyRound />
                            <span>Api Keys</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
}