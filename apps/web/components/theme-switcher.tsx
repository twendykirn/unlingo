'use client';

import { IconDeviceDesktop2, IconMoon, IconSun } from '@intentui/icons';
import { useTheme } from 'next-themes';
import { MenuItem, MenuLabel } from './ui/menu';

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
    };

    return (
        <MenuItem onClick={toggleTheme} aria-label='Switch theme'>
            {theme === 'light' ? (
                <>
                    <IconSun />
                    <MenuLabel>Light Mode</MenuLabel>
                </>
            ) : theme === 'dark' ? (
                <>
                    <IconMoon />
                    <MenuLabel>Dark Mode</MenuLabel>
                </>
            ) : (
                <>
                    <IconDeviceDesktop2 />
                    <MenuLabel>System Mode</MenuLabel>
                </>
            )}
        </MenuItem>
    );
}
