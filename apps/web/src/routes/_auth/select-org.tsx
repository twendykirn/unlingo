import { AlertDialog, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertDialogPanel } from '@/components/ui/alert-dialog-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toastManager } from '@/components/ui/toast';
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { useClerk, useOrganization, useOrganizationList, useUser } from '@clerk/tanstack-react-start';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BadgeCheck, ChevronsUpDown, LogOut, Plus } from 'lucide-react';
import { useMemo } from 'react';

export const Route = createFileRoute('/_auth/select-org')({
    component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate();

    const { user } = useUser();
    const { openUserProfile, signOut } = useClerk();
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

    const email = user?.primaryEmailAddress?.emailAddress || '';
    const avatar = user?.imageUrl || '';

    const userOrgs = useMemo(() => {
        if (!orgListLoaded || userMemberships.isLoading) return [];

        return userMemberships.data.filter(org => org.organization);
    }, [orgListLoaded, userMemberships]);

    const handleOrganizationSwitch = async (orgId: string) => {
        if (orgId === organization?.id) {
            navigate({
                to: "/dashboard",
            });
            return;
        }

        try {
            await setActive?.({ organization: orgId });
            navigate({
                to: "/dashboard",
            });
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

    if (!orgListLoaded || userMemberships.isLoading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <Spinner />
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-black text-white flex items-center justify-center p-6'>
            <AlertDialog open={true}>
                <AlertDialogPopup>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Select Organization</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select or create your organization.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogPanel className='grid gap-4'>
                        {userOrgs.map(org => (
                            <Button
                                key={org.id}
                                variant="ghost"
                                onClick={() => handleOrganizationSwitch(org.organization.id)}
                            >
                                <Avatar className="size-6 rounded-md">
                                    <AvatarImage
                                        alt={org.organization.name}
                                        src={org.organization.imageUrl}
                                    />
                                    <AvatarFallback>{org.organization.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {org.organization.name}
                            </Button>
                        ))}
                        <Button onClick={() => handleCreateOrganization()}>
                            <Plus />
                            Add workspace
                        </Button>
                    </AlertDialogPanel>
                    <AlertDialogFooter variant="bare">
                        <Menu>
                            <MenuTrigger
                                className="flex items-center gap-2"
                                render={<Button variant='ghost' />}
                            >
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={avatar} alt={email} />
                                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{email}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4" />
                            </MenuTrigger>
                            <MenuPopup
                                side="right"
                                align="end"
                                sideOffset={4}
                            >
                                <MenuGroup>
                                    <MenuGroupLabel className="p-0 font-normal">
                                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                            <Avatar className="h-8 w-8 rounded-lg">
                                                <AvatarImage src={avatar} alt={email} />
                                                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium">{email}</span>
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
                    </AlertDialogFooter>
                </AlertDialogPopup>
            </AlertDialog>
        </div>
    );
}
