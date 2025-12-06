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
import { ProjectNav } from "./project-nav"

interface Props extends React.ComponentProps<typeof Sidebar> {
    activeItem: 'namespaces' | 'api-keys' | 'releases' | 'screenshots' | 'builds';
    projectId: string;
}

export function ProjectSidebar({ activeItem, projectId, ...props }: Props) {
    const user = useUser();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <WorkspaceSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <ProjectNav activeItem={activeItem} projectId={projectId} />
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
