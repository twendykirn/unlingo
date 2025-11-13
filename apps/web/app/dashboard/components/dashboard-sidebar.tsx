'use client';

import { useOrganization, useClerk, useOrganizationList, useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo } from 'react';
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
    SidebarMenuTrigger,
    SidebarNav,
    SidebarProvider,
    SidebarRail,
    SidebarSection,
    SidebarSectionGroup,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    EllipsisHorizontalIcon,
    ChatBubbleLeftRightIcon,
    UserIcon,
    UserGroupIcon,
    ArrowLeftStartOnRectangleIcon,
    DocumentTextIcon,
    LanguageIcon,
    FolderIcon,
    NewspaperIcon,
    EnvelopeIcon,
    CreditCardIcon,
    ArrowsRightLeftIcon,
    KeyIcon,
    ChevronUpDownIcon,
    ChartBarIcon,
    CubeIcon,
    PhotoIcon,
    MapIcon,
    QuestionMarkCircleIcon,
    RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import {
    Menu,
    MenuContent,
    MenuHeader,
    MenuItem,
    MenuLabel,
    MenuSection,
    MenuSeparator,
    MenuSubMenu,
} from '@/components/ui/menu';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Container } from '@/components/ui/container';
import { Note } from '@/components/ui/note';
import { Doc } from '@/convex/_generated/dataModel';

export interface WorkspaceWithPremium extends Doc<'workspaces'> {
    isPremium: boolean;
}

interface Props extends PropsWithChildren {
    activeItem:
        | 'projects'
        | 'namespaces'
        | 'languages'
        | 'releases'
        | 'api-keys'
        | 'analytics'
        | 'billing'
        | 'screenshots';
    onWorkspaceChange?: (workspace: WorkspaceWithPremium) => void;
}

const DashboardSidebar = ({ activeItem, children, onWorkspaceChange }: Props) => {
    const { user } = useUser();
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
        if (typeof window !== 'undefined' && user) {
            const uj = (window as any).uj;

            if (uj) {
                uj.init('cmhxden6400i615qplccwlxhq', {
                    widget: true,
                    position: 'right',
                    theme: 'auto',
                });
                uj.identify({
                    id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    avatar: user.imageUrl,
                });
            }
        }
    }, [user]);

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
                                            <FolderIcon />
                                            <SidebarLabel>Projects</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <SidebarMenuTrigger aria-label='Manage'>
                                                    <EllipsisHorizontalIcon />
                                                </SidebarMenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-order'>
                                                        <PlusIcon />
                                                        <MenuLabel>New Project</MenuLabel>
                                                    </MenuItem>
                                                    <MenuItem href='#view-all'>
                                                        <PencilIcon />
                                                        <MenuLabel>Edit Project</MenuLabel>
                                                    </MenuItem>
                                                    <MenuItem href='#pending-orders' intent='danger'>
                                                        <TrashIcon />
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
                                            <NewspaperIcon />
                                            <SidebarLabel>Namespaces</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <SidebarMenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <EllipsisHorizontalIcon />
                                                </SidebarMenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-product'>
                                                        <PlusIcon />
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
                                            <LanguageIcon />
                                            <SidebarLabel>Languages</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <SidebarMenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <EllipsisHorizontalIcon />
                                                </SidebarMenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-product'>
                                                        <PlusIcon />
                                                        <MenuLabel>New Language</MenuLabel>
                                                    </MenuItem>
                                                </MenuContent>
                                            </Menu>
                                        )}
                                    </>
                                )}
                            </SidebarItem>
                            <SidebarItem
                                href='/dashboard/screenshots'
                                tooltip='Screenshots'
                                isCurrent={activeItem === 'screenshots'}>
                                <PhotoIcon />
                                <SidebarLabel>Screenshots</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem tooltip='Releases' isCurrent={activeItem === 'releases'}>
                                {({ isCollapsed, isFocused }) => (
                                    <>
                                        <SidebarLink href='/dashboard/releases'>
                                            <CubeIcon />
                                            <SidebarLabel>Releases</SidebarLabel>
                                        </SidebarLink>
                                        {(!isCollapsed || isFocused) && (
                                            <Menu>
                                                <SidebarMenuTrigger data-slot='menu-action-trigger' aria-label='Manage'>
                                                    <EllipsisHorizontalIcon />
                                                </SidebarMenuTrigger>
                                                <MenuContent popover={{ offset: 0, placement: 'right top' }}>
                                                    <MenuItem href='#new-product'>
                                                        <PlusIcon />
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
                                <KeyIcon />
                                <SidebarLabel>API Keys</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem
                                href='/dashboard/analytics'
                                tooltip='Analytics'
                                isCurrent={activeItem === 'analytics'}>
                                <ChartBarIcon />
                                <SidebarLabel>Analytics</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem href='https://docs.unlingo.com' target='_blank' tooltip='Documentation'>
                                <DocumentTextIcon />
                                <SidebarLabel>Documentation</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem
                                href='/dashboard/billing'
                                tooltip='Usage & Billing'
                                isCurrent={activeItem === 'billing'}>
                                <CreditCardIcon />
                                <SidebarLabel>Usage & Billing</SidebarLabel>
                            </SidebarItem>
                        </SidebarSection>
                        <SidebarDisclosureGroup defaultExpandedKeys={[1]}>
                            <SidebarDisclosure id={1}>
                                <SidebarDisclosureTrigger>
                                    <QuestionMarkCircleIcon />
                                    <SidebarLabel>Support</SidebarLabel>
                                </SidebarDisclosureTrigger>
                                <SidebarDisclosurePanel>
                                    <SidebarItem
                                        tooltip='Changelog'
                                        onClick={() => {
                                            (window as any).uj?.showWidget({ section: 'updates' });
                                        }}>
                                        <RocketLaunchIcon />
                                        <SidebarLabel>Changelog</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        tooltip='Roadmap'
                                        onClick={() => {
                                            (window as any).uj?.showWidget({ section: 'roadmap' });
                                        }}>
                                        <MapIcon />
                                        <SidebarLabel>Roadmap</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        tooltip='Feedback'
                                        onClick={() => {
                                            (window as any).uj?.showWidget({ section: 'feedback' });
                                        }}>
                                        <ChatBubbleLeftRightIcon />
                                        <SidebarLabel>Feedback</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem href='mailto:support@unlingo.com' target='_blank' tooltip='Email'>
                                        <EnvelopeIcon />
                                        <SidebarLabel>Email</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem href='https://discord.gg/TdDYte7KjG' target='_blank' tooltip='Discord'>
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
                                        <SidebarLabel>Discord</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        href='https://github.com/twendykirn/unlingo/stargazers'
                                        target='_blank'
                                        tooltip='Github'>
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
                                        <SidebarLabel>Github</SidebarLabel>
                                    </SidebarItem>
                                </SidebarDisclosurePanel>
                            </SidebarDisclosure>
                        </SidebarDisclosureGroup>
                    </SidebarSectionGroup>
                </SidebarContent>

                <SidebarFooter className='flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col'>
                    <Menu>
                        <SidebarMenuTrigger
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
                            <ChevronUpDownIcon data-slot='chevron' />
                        </SidebarMenuTrigger>
                        <MenuContent
                            className='in-data-[sidebar-collapsible=collapsed]:min-w-56 min-w-(--trigger-width)'
                            placement='bottom right'>
                            <MenuSection>
                                <MenuHeader separator>
                                    <span className='block'>{organization?.name}</span>
                                    <span className='font-normal text-muted-fg'>{workspace.contactEmail}</span>
                                </MenuHeader>
                            </MenuSection>

                            <MenuSubMenu>
                                <MenuItem>
                                    <ArrowsRightLeftIcon />
                                    <MenuLabel>Switch Organization</MenuLabel>
                                </MenuItem>
                                <MenuContent>
                                    <MenuItem onClick={() => handleCreateOrganization()}>
                                        <PlusIcon />
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
                            </MenuSubMenu>
                            <MenuItem onClick={() => openOrganizationProfile()}>
                                <UserGroupIcon />
                                <MenuLabel>Organization Settings</MenuLabel>
                            </MenuItem>
                            <MenuItem onClick={() => openUserProfile()}>
                                <UserIcon />
                                <MenuLabel>Account Settings</MenuLabel>
                            </MenuItem>
                            <MenuSeparator />
                            <ThemeSwitcher />
                            <MenuSeparator />
                            <MenuItem href='#logout'>
                                <ArrowLeftStartOnRectangleIcon />
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
                        <SidebarMenuTrigger className='ml-auto md:hidden' aria-label='Open Menu'>
                            <Avatar isSquare alt={organization?.name} src={organization?.imageUrl} />
                        </SidebarMenuTrigger>
                        <MenuContent popover={{ placement: 'bottom end' }} className='min-w-64'>
                            <MenuSection>
                                <MenuHeader separator>
                                    <span className='block'>{organization?.name}</span>
                                    <span className='font-normal text-muted-fg'>{workspace.contactEmail}</span>
                                </MenuHeader>
                            </MenuSection>
                            <MenuSubMenu>
                                <MenuItem>
                                    <ArrowsRightLeftIcon />
                                    <MenuLabel>Switch Organization</MenuLabel>
                                </MenuItem>
                                <MenuContent>
                                    <MenuItem onClick={() => handleCreateOrganization()}>
                                        <PlusIcon />
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
                            </MenuSubMenu>
                            <MenuItem onClick={() => openOrganizationProfile()}>
                                <UserGroupIcon />
                                <MenuLabel>Organization Settings</MenuLabel>
                            </MenuItem>
                            <MenuItem onClick={() => openUserProfile()}>
                                <UserIcon />
                                <MenuLabel>Account Settings</MenuLabel>
                            </MenuItem>
                            <MenuSeparator />
                            <ThemeSwitcher />
                            <MenuSeparator />
                            <MenuItem href='#logout'>
                                <ArrowLeftStartOnRectangleIcon />
                                <MenuLabel>Log out</MenuLabel>
                            </MenuItem>
                        </MenuContent>
                    </Menu>
                </SidebarNav>
                <div className='p-4 lg:p-6'>{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default DashboardSidebar;
