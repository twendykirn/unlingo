'use client';

import { useOrganization, useClerk, useOrganizationList } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import {
    Sidebar,
    SidebarContent,
    SidebarDisclosure,
    SidebarDisclosureGroup,
    SidebarDisclosurePanel,
    SidebarDisclosureTrigger,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarItem,
    SidebarLabel,
    SidebarLink,
    SidebarNav,
    SidebarProvider,
    SidebarRail,
    SidebarSection,
    SidebarSectionGroup,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import {
    IconBrackets2,
    IconBrandDiscord,
    IconBrandGithub,
    IconChartLineUp,
    IconChevronsY,
    IconCommandRegular,
    IconCreditCard,
    IconCube,
    IconDashboard,
    IconDashboardFill,
    IconDotsHorizontal,
    IconEnvelope,
    IconFile,
    IconFolder,
    IconGlobe,
    IconGuide,
    IconHighlight,
    IconLogout,
    IconPlus,
    IconSettings,
    IconSettingsFill,
    IconShieldFill,
    IconSupport,
    IconTrash,
} from '@intentui/icons';
import {
    Menu,
    MenuContent,
    MenuHeader,
    MenuItem,
    MenuLabel,
    MenuSection,
    MenuSeparator,
    MenuSubmenu,
    MenuTrigger,
} from '@/components/ui/menu';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Container } from '@/components/ui/container';
import { Note } from '@/components/ui/note';
import { Doc } from '@/convex/_generated/dataModel';
import {
    CommandMenu,
    CommandMenuItem,
    CommandMenuList,
    CommandMenuSearch,
    CommandMenuSection,
} from '@/components/ui/command-menu';

export interface WorkspaceWithPremium extends Doc<'workspaces'> {
    isPremium: boolean;
}

interface Props extends PropsWithChildren {
    activeItem: 'projects' | 'namespaces' | 'languages' | 'releases' | 'api-keys' | 'analytics' | 'billing' | 'editor';
    onWorkspaceChange?: (workspace: WorkspaceWithPremium) => void;
}

const DashboardSidebar = ({ activeItem, children, onWorkspaceChange }: Props) => {
    const { organization } = useOrganization();
    const { openOrganizationProfile, openUserProfile } = useClerk();
    const {
        userMemberships,
        isLoaded: orgListLoaded,
        setActive,
    } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    const pathname = usePathname();

    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

    const router = useRouter();

    const clerkId = organization?.id;

    const workspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const userOrgs = useMemo(() => {
        if (!orgListLoaded || userMemberships.isLoading) return [];

        return userMemberships.data.filter(org => org.organization);
    }, [orgListLoaded, userMemberships]);

    useEffect(() => {
        if (workspace) {
            onWorkspaceChange?.(workspace);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace]);

    useEffect(() => {
        setIsCommandMenuOpen(false);
    }, [pathname]);

    if (!clerkId || workspace === undefined) {
        return (
            <Container className='min-h-screen flex items-center justify-center'>
                <Loader />
            </Container>
        );
    }

    if (!workspace) {
        return (
            <Container className='min-h-screen flex items-center justify-center'>
                <Note intent='danger'>
                    We couldn&apos;t find your workspace. Please try signing out and signing back in.
                </Note>
            </Container>
        );
    }

    const handleOrganizationSwitch = async (orgId: string) => {
        try {
            await setActive?.({ organization: orgId });
        } catch (error) {
            console.error('Failed to switch organization:', error);
        }
    };

    const handleCreateOrganization = () => {
        router.push('/dashboard/new');
    };

    return (
        <SidebarProvider>
            <Sidebar intent='inset' collapsible='dock'>
                <SidebarHeader>
                    <div className='flex items-center justify-between'>
                        <Link href='/' className='flex items-center gap-x-2'>
                            <Image src='/icon.png' alt='Unlingo' width={32} height={32} />
                            <SidebarLabel className='font-medium'>Unlingo</SidebarLabel>
                        </Link>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarSectionGroup>
                        <SidebarSection>
                            <SidebarItem tooltip='Projects' isCurrent={activeItem === 'projects'}>
                                {({ isCollapsed, isFocused }) => (
                                    <>
                                        <SidebarLink href='/dashboard'>
                                            <IconFolder />
                                            <SidebarLabel>Projects</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <MenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <IconDotsHorizontal />
                                                </MenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-order'>
                                                        <IconPlus />
                                                        <MenuLabel>New Project</MenuLabel>
                                                    </MenuItem>
                                                    <MenuItem href='#view-all'>
                                                        <IconHighlight />
                                                        <MenuLabel>Edit Project</MenuLabel>
                                                    </MenuItem>
                                                    <MenuItem href='#pending-orders' isDanger>
                                                        <IconTrash />
                                                        <MenuLabel>Delete Project</MenuLabel>
                                                    </MenuItem>
                                                </MenuContent>
                                            </Menu>
                                        )}
                                    </>
                                )}
                            </SidebarItem>
                            <SidebarItem tooltip='Namespaces' isCurrent={activeItem === 'namespaces'}>
                                {({ isCollapsed, isFocused }) => (
                                    <>
                                        <SidebarLink href='/dashboard/namespaces'>
                                            <IconFile />
                                            <SidebarLabel>Namespaces</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <MenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <IconDotsHorizontal />
                                                </MenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-product'>
                                                        <IconPlus />
                                                        <MenuLabel>New Namespace</MenuLabel>
                                                    </MenuItem>
                                                </MenuContent>
                                            </Menu>
                                        )}
                                    </>
                                )}
                            </SidebarItem>
                            <SidebarItem tooltip='Languages' isCurrent={activeItem === 'languages'}>
                                {({ isCollapsed, isFocused }) => (
                                    <>
                                        <SidebarLink href='/dashboard/languages'>
                                            <IconGlobe />
                                            <SidebarLabel>Languages</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <MenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <IconDotsHorizontal />
                                                </MenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-product'>
                                                        <IconPlus />
                                                        <MenuLabel>New Language</MenuLabel>
                                                    </MenuItem>
                                                </MenuContent>
                                            </Menu>
                                        )}
                                    </>
                                )}
                            </SidebarItem>
                            <SidebarItem href='/dashboard/editor' tooltip='Editor' isCurrent={activeItem === 'editor'}>
                                <IconHighlight />
                                <SidebarLabel>Editor</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem tooltip='Releases' isCurrent={activeItem === 'releases'}>
                                {({ isCollapsed, isFocused }) => (
                                    <>
                                        <SidebarLink href='/dashboard/releases'>
                                            <IconCube />
                                            <SidebarLabel>Releases</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <MenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <IconDotsHorizontal />
                                                </MenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-product'>
                                                        <IconPlus />
                                                        <MenuLabel>New Release</MenuLabel>
                                                    </MenuItem>
                                                </MenuContent>
                                            </Menu>
                                        )}
                                    </>
                                )}
                            </SidebarItem>
                            <SidebarItem
                                href='/dashboard/api-keys'
                                tooltip='API Keys'
                                isCurrent={activeItem === 'api-keys'}>
                                <IconBrackets2 />
                                <SidebarLabel>API Keys</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem
                                href='/dashboard/analytics'
                                tooltip='Analytics'
                                isCurrent={activeItem === 'analytics'}>
                                <IconChartLineUp />
                                <SidebarLabel>Analytics</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem href='https://docs.unlingo.com' target='_blank' tooltip='Documentation'>
                                <IconGuide />
                                <SidebarLabel>Documentation</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem
                                href='/dashboard/billing'
                                tooltip='Usage & Billing'
                                isCurrent={activeItem === 'billing'}>
                                <IconCreditCard />
                                <SidebarLabel>Usage & Billing</SidebarLabel>
                            </SidebarItem>
                        </SidebarSection>

                        <SidebarDisclosureGroup defaultExpandedKeys={[1]}>
                            <SidebarDisclosure id={1}>
                                <SidebarDisclosureTrigger>
                                    <IconSupport />
                                    <SidebarLabel>Support</SidebarLabel>
                                </SidebarDisclosureTrigger>
                                <SidebarDisclosurePanel>
                                    <SidebarItem href='mailto:support@unlingo.com' target='_blank' tooltip='Email'>
                                        <IconEnvelope />
                                        <SidebarLabel>Email</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem href='https://discord.gg/TdDYte7KjG' target='_blank' tooltip='Discord'>
                                        <IconBrandDiscord />
                                        <SidebarLabel>Discord</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        href='https://github.com/twendykirn/unlingo/stargazers'
                                        target='_blank'
                                        tooltip='Github'>
                                        <IconBrandGithub />
                                        <SidebarLabel>Github</SidebarLabel>
                                    </SidebarItem>
                                </SidebarDisclosurePanel>
                            </SidebarDisclosure>
                        </SidebarDisclosureGroup>
                    </SidebarSectionGroup>
                </SidebarContent>

                <SidebarFooter className='flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col'>
                    <Menu>
                        <MenuTrigger
                            className='flex w-full items-center justify-between cursor-pointer'
                            aria-label='Profile'>
                            <div className='flex items-center gap-x-2'>
                                <Avatar
                                    className='size-8 *:size-8 group-data-[state=collapsed]:size-6 group-data-[state=collapsed]:*:size-6'
                                    isSquare
                                    src={organization?.imageUrl}
                                />

                                <div className='in-data-[collapsible=dock]:hidden text-sm'>
                                    <SidebarLabel>{organization?.name}</SidebarLabel>
                                    <span className='-mt-0.5 block text-muted-fg'>{workspace.contactEmail}</span>
                                </div>
                            </div>
                            <IconChevronsY data-slot='chevron' />
                        </MenuTrigger>
                        <MenuContent
                            className='in-data-[sidebar-collapsible=collapsed]:min-w-56 min-w-(--trigger-width)'
                            placement='bottom right'>
                            <MenuSection>
                                <MenuHeader separator>
                                    <span className='block'>{organization?.name}</span>
                                    <span className='font-normal text-muted-fg'>{workspace.contactEmail}</span>
                                </MenuHeader>
                            </MenuSection>

                            <MenuSubmenu>
                                <MenuItem>
                                    <IconDashboardFill />
                                    <MenuLabel>Switch Organization</MenuLabel>
                                </MenuItem>
                                <MenuContent>
                                    <MenuItem onClick={() => handleCreateOrganization()}>
                                        <IconPlus />
                                        <MenuLabel>New Organization</MenuLabel>
                                    </MenuItem>
                                    {userOrgs.map(org => (
                                        <MenuItem
                                            key={org.id}
                                            onClick={() => handleOrganizationSwitch(org.organization.id)}>
                                            <Avatar
                                                isSquare
                                                alt={org.organization.name}
                                                src={org.organization.imageUrl}
                                            />
                                            <MenuLabel>{org.organization.name}</MenuLabel>
                                        </MenuItem>
                                    ))}
                                </MenuContent>
                            </MenuSubmenu>
                            <MenuItem onClick={() => openOrganizationProfile()}>
                                <IconSettingsFill />
                                <MenuLabel>Organization Settings</MenuLabel>
                            </MenuItem>
                            <MenuItem onClick={() => openUserProfile()}>
                                <IconShieldFill />
                                <MenuLabel>Account Settings</MenuLabel>
                            </MenuItem>
                            <MenuSeparator />
                            <ThemeSwitcher />
                            <MenuSeparator />
                            <MenuItem href='#logout'>
                                <IconLogout />
                                <MenuLabel>Log out</MenuLabel>
                            </MenuItem>
                        </MenuContent>
                    </Menu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            <SidebarInset>
                <SidebarNav>
                    <span className='flex items-center gap-x-4'>
                        <SidebarTrigger className='-ml-2' />
                    </span>
                    <Menu>
                        <MenuTrigger className='ml-auto md:hidden' aria-label='Open Menu'>
                            <Avatar isSquare alt={organization?.name} src={organization?.imageUrl} />
                        </MenuTrigger>
                        <MenuContent popover={{ placement: 'bottom end' }} className='min-w-64'>
                            <MenuSection>
                                <MenuHeader separator>
                                    <span className='block'>{organization?.name}</span>
                                    <span className='font-normal text-muted-fg'>{workspace.contactEmail}</span>
                                </MenuHeader>
                            </MenuSection>
                            <MenuSubmenu>
                                <MenuItem>
                                    <IconDashboard />
                                    <MenuLabel>Switch Organization</MenuLabel>
                                </MenuItem>
                                <MenuContent>
                                    <MenuItem onClick={() => handleCreateOrganization()}>
                                        <IconPlus />
                                        <MenuLabel>New Organization</MenuLabel>
                                    </MenuItem>
                                    {userOrgs.map(org => (
                                        <MenuItem
                                            key={org.id}
                                            onClick={() => handleOrganizationSwitch(org.organization.id)}>
                                            <Avatar
                                                isSquare
                                                alt={org.organization.name}
                                                src={org.organization.imageUrl}
                                            />
                                            <MenuLabel>{org.organization.name}</MenuLabel>
                                        </MenuItem>
                                    ))}
                                </MenuContent>
                            </MenuSubmenu>
                            <MenuItem onClick={() => openOrganizationProfile()}>
                                <IconSettings />
                                <MenuLabel>Organization Settings</MenuLabel>
                            </MenuItem>
                            <MenuItem onClick={() => openUserProfile()}>
                                <IconCommandRegular />
                                <MenuLabel>Account Settings</MenuLabel>
                            </MenuItem>
                            <MenuSeparator />
                            <ThemeSwitcher />
                            <MenuSeparator />
                            <MenuItem href='#logout'>
                                <IconLogout />
                                <MenuLabel>Log out</MenuLabel>
                            </MenuItem>
                        </MenuContent>
                    </Menu>
                </SidebarNav>
                <div className='p-4 lg:p-6'>{children}</div>
            </SidebarInset>
            <CommandMenu shortcut='/' isOpen={isCommandMenuOpen} onOpenChange={setIsCommandMenuOpen} isBlurred>
                <CommandMenuSearch placeholder='Quick search...' />
                <CommandMenuList>
                    <CommandMenuSection className='mt-2' title='Pages'>
                        <CommandMenuItem href='/dashboard' textValue='projects'>
                            <IconFolder /> Projects
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/namespaces' textValue='namespaces'>
                            <IconFile /> Namespaces
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/languages' textValue='languages'>
                            <IconGlobe /> Languages
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/releases' textValue='releases'>
                            <IconCube /> Releases
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/api-keys' textValue='api-keys'>
                            <IconBrackets2 /> API Keys
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/analytics' textValue='analytics'>
                            <IconChartLineUp /> Analytics
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/languages' textValue='languages'>
                            <IconGlobe /> Languages
                        </CommandMenuItem>
                        <CommandMenuItem href='https://docs.unlingo.com' target='_blank' textValue='documentation'>
                            <IconGuide /> Documentation
                        </CommandMenuItem>
                        <CommandMenuItem href='/dashboard/billing' textValue='billing'>
                            <IconCreditCard /> Usage & Billing
                        </CommandMenuItem>
                    </CommandMenuSection>
                    <CommandMenuSection title='Support'>
                        <CommandMenuItem href='mailto:support@unlingo.com' target='_blank' textValue='email'>
                            <IconEnvelope /> Email
                        </CommandMenuItem>
                        <CommandMenuItem href='https://discord.gg/TdDYte7KjG' target='_blank' textValue='discord'>
                            <IconBrandDiscord /> Discord
                        </CommandMenuItem>
                        <CommandMenuItem
                            href='https://github.com/twendykirn/unlingo/stargazers'
                            target='_blank'
                            textValue='github'>
                            <IconBrandGithub /> Github
                        </CommandMenuItem>
                    </CommandMenuSection>
                </CommandMenuList>
            </CommandMenu>
        </SidebarProvider>
    );
};

export default DashboardSidebar;
