'use client';

import { MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
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
                    <SunIcon />
                    <MenuLabel>Light Mode</MenuLabel>
                </>
            ) : theme === 'dark' ? (
                <>
                    <MoonIcon />
                    <MenuLabel>Dark Mode</MenuLabel>
                </>
            ) : (
                <>
                    <ComputerDesktopIcon />
                    <MenuLabel>System Mode</MenuLabel>
                </>
            )}
        </MenuItem>
    );
}
