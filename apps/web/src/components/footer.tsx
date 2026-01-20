import { Logo } from '@/components/logo'
import { Link } from '@tanstack/react-router'

const links = [
    {
        group: 'Company',
        items: [
            {
                title: 'About',
                to: '/about',
            },
            {
                title: 'Pricing',
                to: '/#pricing',
            },
            {
                title: 'FAQs',
                to: '/#faqs',
            },
            {
                title: 'Docs',
                href: 'https://docs.unlingo.com',
            },
        ],
    },
    {
        group: 'Legal',
        items: [
            {
                title: 'Terms of Service',
                to: '/legal/terms-of-service',
            },
            {
                title: 'Privacy Policy',
                to: '/legal/privacy-policy',
            },
        ],
    },
]

export default function FooterSection() {
    return (
        <footer
            role="contentinfo"
            className="bg-background py-8 sm:py-20">
            <div className="mx-auto max-w-5xl space-y-16 px-6">
                <div className="grid gap-12 md:grid-cols-5">
                    <div className="space-y-6 md:col-span-2 md:space-y-12">
                        <Link
                            to="/"
                            aria-label="go home"
                            className="block size-fit">
                            <Logo />
                        </Link>
                        <p className="text-muted-foreground text-balance text-sm">Simplifying global translation management for developers worldwide.</p>
                    </div>

                    <div className="col-span-3 grid gap-6 sm:grid-cols-3">
                        {links.map((link, index) => (
                            <div
                                key={index}
                                className="space-y-4 text-sm">
                                <span className="block font-medium">{link.group}</span>

                                <div className="flex flex-wrap gap-4 sm:flex-col">
                                    {link.items.map((item, index) => item.to ? (
                                        <Link
                                            key={index}
                                            to={item.to}
                                            className="text-muted-foreground hover:text-primary block duration-150">
                                            <span>{item.title}</span>
                                        </Link>
                                    ) : <a
                                        key={index}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-primary block duration-150">
                                        <span>{item.title}</span>
                                    </a>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="space-y-4">
                            <span className="block font-medium">Community</span>
                            <div className="flex flex-wrap gap-3 text-sm">
                                <a
                                    href="https://x.com/twendykirn"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="X/Twitter"
                                    className="text-muted-foreground hover:text-primary block">
                                    <svg
                                        className="size-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="1em"
                                        height="1em"
                                        viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z"></path>
                                    </svg>
                                </a>
                                <a
                                    href="https://github.com/twendykirn/unlingo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Github"
                                    className="text-muted-foreground hover:text-primary block">
                                    <svg
                                        className="size-5"
                                        width="1em"
                                        height="1em"
                                        viewBox="0 0 1024 1024"
                                        fill="none">
                                        <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
                                            transform="scale(64)"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </a>
                                <a
                                    href="https://discord.gg/TdDYte7KjG"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Discord"
                                    className="text-muted-foreground hover:text-primary block">
                                    <svg
                                        className="size-5"
                                        width="1em"
                                        height="1em"
                                        viewBox="0 0 256 199"
                                        preserveAspectRatio="xMidYMid">
                                        <path
                                            d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    aria-hidden
                    className="h-px bg-[length:6px_1px] bg-repeat-x opacity-25 [background-image:linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)]"
                />
                <div className="flex flex-wrap justify-between gap-4">
                    <span className="text-muted-foreground text-sm">© {new Date().getFullYear()} Igor Kirnosov s.p. All rights reserved </span>

                    <a
                        href="https://unlingo.openstatus.dev"
                        target="_blank"
                        className="ring-foreground/5 bg-card flex items-center gap-2 rounded-full border border-transparent py-1 pl-2 pr-4 shadow ring-1 cursor-pointer"
                    >
                        <div className="relative flex size-3">
                            <span className="duration-1500 absolute inset-0 block size-full animate-pulse rounded-full bg-emerald-100"></span>
                            <span className="relative m-auto block size-1 rounded-full bg-emerald-500"></span>
                        </div>
                        <span className="text-sm">All Systems Normal</span>
                    </a>
                </div>
            </div>
        </footer>
    )
}