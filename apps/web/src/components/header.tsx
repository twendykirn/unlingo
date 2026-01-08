import { Logo, LogoIcon } from '@/components/logo'
import { Button } from '@/components/ui/button'
import React from 'react'
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import { Menu, X } from 'lucide-react'
import { useMedia } from '@/hooks/use-media'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from '@tanstack/react-router'

interface FeatureLink {
    href: string
    name: string
    description?: string
    icon: React.ReactElement
}

interface MobileLink {
    groupName?: string
    links?: FeatureLink[]
    name?: string
    href?: string
}

const mobileLinks: MobileLink[] = [
    { name: 'About', href: '/about' },
    { name: 'Docs', href: '/' },
    { name: 'Pricing', href: '/' },
    { name: 'Discord', href: '/' },
]

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const isLarge = useMedia('(min-width: 64rem)')
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 75)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    React.useEffect(() => {
        const originalOverflow = document.body.style.overflow

        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [isMobileMenuOpen])

    return (
        <header
            role="banner"
            data-theme="dark"
            {...(isScrolled && { 'data-scrolled': true })}
            data-state={isMobileMenuOpen ? 'active' : 'inactive'}
            className="bg-background [--color-popover:color-mix(in_oklch,var(--color-muted)_25%,var(--color-background))]">
            <div className={cn('relative', 'not-in-data-scrolled:has-data-[state=open]:[--viewport-translate:-4rem]', !isLarge && 'in-data-scrolled:border-b in-data-scrolled:border-foreground/5 in-data-scrolled:backdrop-blur in-data-scrolled:bg-card/50 fixed inset-x-0 top-0 z-50 h-16 overflow-hidden', 'max-lg:in-data-[state=active]:bg-card/50 max-lg:in-data-[state=active]:h-screen max-lg:in-data-[state=active]:backdrop-blur')}>
                <div className="mx-auto max-w-6xl px-6">
                    <div className="max-lg:not-in-data-[state=active]:h-16 relative flex flex-wrap items-center justify-between py-1.5 lg:py-5">
                        <div className="max-lg:in-data-[state=active]:border-foreground/5 max-lg:in-data-[state=active]:border-b flex items-center justify-between gap-8 max-lg:h-14 max-lg:w-full">
                            <Link
                                to="/"
                                aria-label="home">
                                <Logo className="h-5" />
                            </Link>

                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label={isMobileMenuOpen == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-5 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-5 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        {isLarge && (
                            <motion.div
                                animate={{ width: 'fit-content', gap: 8 }}
                                className="bg-popover/50 ring-background inset-shadow-sm inset-shadow-white/[0.02] border-foreground/5 fixed inset-x-0 z-50 mx-auto size-fit max-w-xl rounded-xl border p-1.5 shadow-xl shadow-black/25 ring-1 backdrop-blur-xl">
                                <div className="flex items-center">
                                    <AnimatePresence>
                                        {isScrolled && (
                                            <motion.div
                                                key="logo"
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: '3rem' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                className="before:bg-foreground/10 before:border-background/75 relative before:absolute before:inset-y-1 before:right-2 before:w-0.5 before:rounded before:border-r">
                                                <Link
                                                    to="/"
                                                    aria-label="home"
                                                    className="hover:bg-foreground/5 flex size-7 rounded-md">
                                                    <LogoIcon className="m-auto size-4" />
                                                </Link>
                                            </motion.div>
                                        )}
                                        <NavMenu key="nav-menu" />
                                        {isScrolled && (
                                            <motion.div
                                                key="sign-in-button"
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                className="overflow-hidden">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-foreground/10 ml-4 h-7 ring-0">
                                                    <Link to="/sign-in/$">
                                                        <span>Sign In</span>
                                                    </Link>
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                        {!isLarge && isMobileMenuOpen && <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />}

                        <div className="max-lg:in-data-[state=active]:mt-6 in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button
                                    variant="ghost"
                                    size="sm">
                                    <Link to="/sign-in/$">
                                        <span>Sign In</span>
                                    </Link>
                                </Button>
                                <Button
                                    size="sm">
                                    <Link to="/sign-up/$">
                                        <span>Get started</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
        <nav
            role="navigation"
            className="w-full [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]">
            <Accordion
                className="**:hover:no-underline -mx-4 mt-0.5 space-y-0.5">
                {mobileLinks.map((link, index) => {
                    if (link.groupName && link.links) {
                        return (
                            <AccordionItem
                                key={index}
                                value={link.groupName}
                                className="before:border-border group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b">
                                <AccordionTrigger className="**:!font-normal data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg">{link.groupName}</AccordionTrigger>
                                <AccordionContent className="pb-5">
                                    <ul>
                                        {link.links.map((feature, featureIndex) => (
                                            <li key={featureIndex}>
                                                <Link
                                                    to={feature.href}
                                                    onClick={closeMenu}
                                                    className="grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2">
                                                    <div
                                                        aria-hidden
                                                        className="flex items-center justify-center *:size-4">
                                                        {feature.icon}
                                                    </div>
                                                    <div className="text-base">{feature.name}</div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    }
                    return null
                })}
            </Accordion>
            {mobileLinks.map((link, index) => {
                if (link.name && link.href) {
                    return (
                        <Link
                            key={index}
                            to={link.href}
                            onClick={closeMenu}
                            className="group relative block border-0 border-b py-4 text-lg">
                            {link.name}
                        </Link>
                    )
                }
                return null
            })}
        </nav>
    )
}

const NavMenu = () => {
    return (
        <NavigationMenu className="**:data-[slot=navigation-menu-viewport]:translate-x-(--viewport-translate) **:data-[slot=navigation-menu-viewport]:transition-all **:data-[slot=navigation-menu-viewport]:min-w-lg **:data-[slot=navigation-menu-viewport]:max-w-2xl **:data-[slot=navigation-menu-viewport]:bg-[color-mix(in_oklch,var(--color-muted)_25%,var(--color-background))] max-lg:hidden">
            <NavigationMenuList className="**:data-[slot=navigation-menu-trigger]:h-7 **:data-[slot=navigation-menu-trigger]:text-foreground/75 **:data-[slot=navigation-menu-trigger]:px-3 **:data-[slot=navigation-menu-trigger]:text-sm gap-0 gap-1">
                <NavigationMenuItem>
                    <NavigationMenuLink
                        asChild
                        className={navigationMenuTriggerStyle({ className: 'text-foreground/75 h-7 px-3 text-sm' })}>
                        <Link to="/about">About</Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuLink
                        asChild
                        className={navigationMenuTriggerStyle({ className: 'text-foreground/75 h-7 px-3 text-sm' })}>
                        <Link to="/">Docs</Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuLink
                        asChild
                        className={navigationMenuTriggerStyle({ className: 'text-foreground/75 h-7 px-3 text-sm' })}>
                        <Link to="/">Pricing</Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuLink
                        asChild
                        className={navigationMenuTriggerStyle({ className: 'text-foreground/75 h-7 px-3 text-sm' })}>
                        <Link to="/">Discord</Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    )
}