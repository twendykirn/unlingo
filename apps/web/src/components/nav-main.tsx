import {
    House,
    Settings,
    CreditCard,
    Mail,
    Map,
    MessagesSquare,
    GitBranch,
} from "lucide-react"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useEffect } from "react"
import { useClerk, useUser } from "@clerk/tanstack-react-start"
import { useNavigate } from "@tanstack/react-router"

interface Props {
    activeItem: 'home' | 'billing';
}

export function NavMain({ activeItem }: Props) {
    const { user } = useUser();
    const { openOrganizationProfile } = useClerk();

    const navigate = useNavigate();

    useEffect(() => {
        if (typeof window !== 'undefined' && user) {
            const uj = (window as any).uj;

            if (uj) {
                uj.init((import.meta as any).env.VITE_USERJOT_PROJECT_ID, {
                    position: 'right',
                    theme: 'auto',
                    trigger: 'custom',
                });
                uj.identify({
                    id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    avatar: user.imageUrl,
                });
            }
        }
    }, [user]);

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
                    <SidebarMenuItem key='home'>
                        <SidebarMenuButton isActive={activeItem === 'home'} className="text-sidebar-foreground/70" onClick={() => handleNavigateToHome()}>
                            <House />
                            <span>Home</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='settings'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" onClick={() => openOrganizationProfile()}>
                            <Settings />
                            <span>Settings</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='billing'>
                        <SidebarMenuButton isActive={activeItem === 'billing'} className="text-sidebar-foreground/70" onClick={() => handleNavigateToBilling()}>
                            <CreditCard />
                            <span>Usage & Billing</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel>Support</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem key='changelog'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" onClick={() => {
                            (window as any).uj?.showWidget({ section: 'updates' });
                        }}>
                            <GitBranch />
                            <span>Changelog</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='roadmap'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" onClick={() => {
                            (window as any).uj?.showWidget({ section: 'roadmap' });
                        }}>
                            <Map />
                            <span>Roadmap</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='feedback'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" onClick={() => {
                            (window as any).uj?.showWidget({ section: 'feedback' });
                        }}>
                            <MessagesSquare />
                            <span>Feedback</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='email'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" render={<a href='mailto:support@unlingo.com' target='_blank' />}>
                            <Mail />
                            <span>Email</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='discord'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" render={<a href='https://discord.gg/TdDYte7KjG' target='_blank' />}>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                fill='none'
                                viewBox='0 0 24 24'
                                className='intentui-icons size-4'
                                data-slot='icon'
                                aria-hidden='true'>
                                <path
                                    fill='currentColor'
                                    d='M19.636 5.023a18.1 18.1 0 0 0-4.539-1.404q-.321.579-.581 1.188a16.8 16.8 0 0 0-5.037 0 13 13 0 0 0-.582-1.188 18.3 18.3 0 0 0-4.542 1.407C1.483 9.3.705 13.465 1.093 17.572A18.3 18.3 0 0 0 6.66 20.38q.677-.916 1.192-1.933a12 12 0 0 1-1.877-.9c.157-.115.311-.234.46-.348a13.02 13.02 0 0 0 11.13 0q.225.186.46.347-.902.535-1.88.903.513 1.017 1.191 1.931a18.2 18.2 0 0 0 5.57-2.808c.457-4.762-.78-8.89-3.27-12.55ZM8.346 15.046c-1.086 0-1.982-.99-1.982-2.207 0-1.218.865-2.217 1.978-2.217s2.002.999 1.983 2.216c-.02 1.218-.874 2.208-1.98 2.208Zm7.309 0c-1.087 0-1.98-.99-1.98-2.207 0-1.218.865-2.217 1.98-2.217s1.996.999 1.977 2.216-.872 2.208-1.978 2.208Z'></path>
                            </svg>
                            <span>Discord</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem key='github'>
                        <SidebarMenuButton className="text-sidebar-foreground/70" render={<a href='https://github.com/twendykirn/unlingo/stargazers' target='_blank' />}>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                fill='none'
                                viewBox='0 0 24 25'
                                className='intentui-icons size-4'
                                data-slot='icon'
                                aria-hidden='true'>
                                <path
                                    fill='currentColor'
                                    d='M12 2.7c5.525 0 10 4.476 10 10a10.02 10.02 0 0 1-6.813 9.488c-.5.1-.687-.212-.687-.475 0-.337.012-1.412.012-2.75 0-.937-.312-1.537-.675-1.85 2.226-.25 4.563-1.1 4.563-4.937 0-1.1-.387-1.988-1.025-2.688.1-.25.45-1.275-.1-2.65 0 0-.837-.275-2.75 1.025a9.3 9.3 0 0 0-2.5-.337c-.85 0-1.7.112-2.5.337-1.913-1.287-2.75-1.025-2.75-1.025-.55 1.375-.2 2.4-.1 2.65-.638.7-1.025 1.6-1.025 2.688 0 3.825 2.325 4.687 4.55 4.937-.287.25-.55.688-.637 1.338-.575.262-2.013.687-2.913-.825-.188-.3-.75-1.038-1.538-1.025-.837.012-.337.475.013.662.425.238.912 1.125 1.025 1.413.2.562.85 1.637 3.362 1.175 0 .837.013 1.625.013 1.862 0 .263-.188.563-.688.475A9.99 9.99 0 0 1 2 12.701c0-5.525 4.475-10 10-10Z'></path>
                            </svg>
                            <span>Github</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
}