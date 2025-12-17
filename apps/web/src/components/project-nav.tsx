import {
    ArrowLeft,
    Newspaper,
    Images,
    Boxes,
    KeyRound,
    RocketIcon,
    LanguagesIcon,
    PencilRulerIcon,
} from "lucide-react"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useNavigate } from "@tanstack/react-router"

interface Props {
    activeItem: 'namespaces' | 'api-keys' | 'releases' | 'screenshots' | 'builds' | 'glossary' | 'languages';
    projectId: string;
}

export function ProjectNav({ activeItem, projectId }: Props) {
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

    const handleNavigateToLanguages = () => {
        navigate({
            to: '/projects/$projectId/languages',
            params: {
                projectId: projectId,
            },
        });
    }

    const handleNavigateToGlossary = () => {
        navigate({
            to: '/projects/$projectId/glossary',
            params: {
                projectId: projectId,
            },
        });
    }

    const handleNavigateToReleases = () => {
        navigate({
            to: '/projects/$projectId/releases',
            params: {
                projectId: projectId,
            },
        });
    }

    const handleNavigateToBuilds = () => {
        navigate({
            to: '/projects/$projectId/builds',
            params: {
                projectId: projectId,
            },
        });
    }

    const handleNavigateToScreenshots = () => {
        navigate({
            to: '/projects/$projectId/screenshots',
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
                    <SidebarMenuItem key='languages'>
                        <SidebarMenuButton
                            isActive={activeItem === 'languages'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToLanguages()}
                        >
                            <LanguagesIcon />
                            <span>Languages</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
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
                    <SidebarMenuItem key='glossary'>
                        <SidebarMenuButton
                            isActive={activeItem === 'glossary'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToGlossary()}
                        >
                            <PencilRulerIcon />
                            <span>Glossary</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='screenshots'>
                        <SidebarMenuButton
                            isActive={activeItem === 'screenshots'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToScreenshots()}
                        >
                            <Images />
                            <span>Screenshots</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='builds'>
                        <SidebarMenuButton
                            isActive={activeItem === 'builds'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToBuilds()}
                        >
                            <Boxes />
                            <span>Builds</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='releases'>
                        <SidebarMenuButton
                            isActive={activeItem === 'releases'}
                            className="text-sidebar-foreground/70"
                            onClick={() => handleNavigateToReleases()}
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