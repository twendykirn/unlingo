import { Card } from '@/components/ui/card'
import { ArrowBigRight, Equal } from 'lucide-react'
import { ReplyIllustration } from "@/components/reply-illustration"
import { IDCheckIllustration } from "@/components/id-check-illustration"
import { KeysIllustration } from "@/components/keys-illustration"
import { DocumentIllustation } from "@/components/document-illustration"
import { CardDecorator } from "@/components/card-decorator"

export default function BentoFour() {
    return (
        <section
            data-theme="dark"
            className="bg-background">
            <h2 className="sr-only">Quartz Bento Four</h2>
            <div className="@container py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@xl:grid-cols-2 @4xl:grid-cols-3 grid gap-4">
                        <Card className="group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="relative flex flex-wrap items-center justify-between gap-1 from-transparent via-blue-50 to-indigo-50">
                                <div className="mx-auto size-2/3">
                                    <SecurityShieldIsoIcon />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Smart Lighting Control</h3>
                                <p className="text-muted-foreground mt-3">Automate your home lighting with customizable schedules.</p>
                            </div>
                        </Card>
                        <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <KeysIllustration />
                            <div>
                                <h3 className="text-foreground font-semibold">Smart Lighting Control</h3>
                                <p className="text-muted-foreground mt-3">Automate your home lighting with customizable schedules.</p>
                            </div>
                        </Card>
                        <Card className="grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="@xl:aspect-auto bg-linear-to-b relative -m-8 flex aspect-video items-center p-8 [--color-background:var(--color-muted)]">
                                <div className="absolute -inset-x-6 inset-y-0 bg-[repeating-linear-gradient(-45deg,white,white_1px,transparent_1px,transparent_6px)] opacity-25 mix-blend-overlay [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                                <ReplyIllustration className="relative mt-0 w-full" />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Collaborative Analysis</h3>
                                <p className="text-muted-foreground mt-3">Add comments, share insights, and work together with your team.</p>
                            </div>
                        </Card>

                        <Card className="@xl:col-span-2 grid grid-rows-[1fr_auto] gap-8 rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div className="relative flex flex-col items-center justify-center">
                                <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

                                <div className="@lg:flex-row @4xl:aspect-auto flex aspect-video flex-col items-center gap-12">
                                    <div className="relative">
                                        <div className="relative mx-auto size-fit bg-black/35 p-2">
                                            <CardDecorator className="size-2" />
                                            <DocumentIllustation />
                                        </div>
                                        <ArrowBigRight
                                            strokeWidth={4}
                                            className="fill-border stroke-border @lg:inset-y-0 @lg:right-0 @lg:my-auto @lg:translate-x-[150%] @lg:rotate-0 @xl:translate-y-0 absolute bottom-0 translate-x-[125%] translate-y-[200%] rotate-90"
                                        />
                                    </div>

                                    <div className="relative">
                                        <IDCheckIllustration />
                                        <Equal
                                            strokeWidth={4}
                                            className="fill-border stroke-border @lg:inset-x-auto @lg:inset-y-0 @lg:right-0 @lg:my-auto @lg:translate-x-[150%] @xl:translate-y-0 absolute inset-x-0 bottom-0 mx-auto translate-y-[150%]"
                                        />
                                    </div>
                                    <div className="relative mx-auto flex size-fit -space-x-6">
                                        <DocumentIllustation className="translate-y-1 -rotate-12" />
                                        <DocumentIllustation className="z-11 relative" />
                                        <DocumentIllustation className="translate-y-1 rotate-12" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Interactive Dashboards</h3>
                                <p className="text-muted-foreground mt-3">Create custom dashboards with drag-and-drop simplicity. Combine multiple visualization types to get a complete view of your data story.</p>
                            </div>
                        </Card>
                        <div className="@xl:row-start-2 @4xl:row-start-auto @xl:space-y-0 @4xl:space-y-4 grid grid-rows-[1fr_auto] space-y-4">
                            <Card className="group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                                <div className="relative flex flex-wrap items-center justify-between gap-1 from-transparent via-blue-50 to-indigo-50">
                                    <div className="mx-auto size-2/3">
                                        <LeaderBoardIsoIcon />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-foreground font-semibold">Smart Lighting Control</h3>
                                    <p className="text-muted-foreground mt-3">Automate your home lighting with customizable schedules.</p>
                                </div>
                            </Card>
                            <Card className="@4xl:block @xl:hidden group space-y-4 overflow-hidden rounded-2xl p-8 text-center">
                                <span className="to-primary block bg-gradient-to-r from-indigo-400 bg-clip-text text-5xl font-bold text-transparent">65%</span>
                                <div>
                                    <p className="text-foreground font-semibold">Faster Integration</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const SecurityShieldIsoIcon = () => {
    return (
        <svg
            width="48"
            height="48"
            viewBox="0 0 122 92"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            strokeWidth="0.5px"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-border fill-muted/35 size-full">
            <path
                d="M119.19 42.6401V62.6401L92.9399 77.7901C82.0399 84.0801 68.8599 87.9201 53.3999 89.3101C37.9399 90.6901 23.9399 89.2101 11.3999 84.8701V64.8701C23.9399 69.2101 37.9399 70.6901 53.3999 69.3101C59.8399 68.7301 65.8899 67.7301 71.5399 66.2901C75.6899 65.2401 79.63 63.9601 83.36 62.4401C86.73 61.0801 89.9199 59.5301 92.9399 57.7901L108.33 48.9101L119.19 42.6401Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M97.4598 15.1801L49.9098 2.64014L23.6598 17.7901C12.7598 24.0801 6.10984 31.6901 3.70984 40.6201C3.12984 42.7801 2.83984 44.8901 2.83984 46.9501C2.83984 50.2901 3.59976 53.5001 5.12976 56.5701C6.54976 59.4501 8.63978 62.2201 11.3998 64.8701C23.9398 69.2101 37.9398 70.6901 53.3998 69.3101C59.8398 68.7301 65.8898 67.7301 71.5398 66.2901C75.6898 65.2401 79.6299 63.9601 83.3599 62.4401C86.7299 61.0801 89.9198 59.5301 92.9398 57.7901L108.33 48.9101L119.19 42.6401L97.4598 15.1801ZM46.8699 46.2401L34.5999 46.2201L34.5198 31.5201V28.6501L39.4799 28.6601H46.8098L46.8699 39.1401L83.3398 39.2101L83.3798 46.3101L46.8699 46.2401Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M46.8699 39.1401V46.2401L34.5999 46.2201L34.5198 31.5201L34.5098 28.6501L39.4799 28.6601L46.8098 28.6701L46.8699 39.1401Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M83.3798 46.3101L46.8699 46.2401V39.1401L83.3398 39.2101L83.3798 46.3101Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M11.3998 64.8702V84.8702C5.68978 79.3802 2.83984 73.4102 2.83984 66.9502V46.9502C2.83984 50.2902 3.59976 53.5002 5.12976 56.5702C6.54976 59.4502 8.63978 62.2202 11.3998 64.8702Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M2.83984 67.2602V66.9502"
                stroke="currentColor"
                strokeLinejoin="round"
            />
        </svg>
    )
}

const LeaderBoardIsoIcon = () => {
    return (
        <svg
            width="48"
            height="48"
            viewBox="0 0 126 98"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            strokeWidth="0.5px"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-border fill-muted/25 size-full">
            <path
                d="M52.99 58.5701V78.5701L31.1699 65.9701V45.9701L41.5598 51.9701L48.49 55.9701L52.99 58.5701Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M121.17 52.4201L103.85 62.4201L81.7498 75.1701L77.2598 72.5801L70.3096 68.5701L59.9297 62.5801L99.3496 39.8201L109.73 45.8101L121.17 52.4201Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M71.53 14.6601L54.22 24.6601L24.23 41.9701L19.73 39.3701L2.41992 29.3701L49.72 2.06006L71.53 14.6601Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M123.94 17.61L106.62 27.61L52.99 58.57L48.49 55.97L41.5598 51.97L31.1699 45.97L61.1499 28.66L71.53 22.67L102.13 5.01001L123.94 17.61Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M123.94 17.6101V37.6101L109.73 45.8101L99.3501 39.8201L59.9302 62.5801V74.5601L52.9902 78.5701V58.5701L106.62 27.6101L123.94 17.6101Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M121.17 52.42V72.42L81.75 95.17V75.17L103.85 62.42L121.17 52.42Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M81.7498 75.1701V95.1701L59.9297 82.5801V62.5801L70.3096 68.5701L77.2598 72.5801L81.7498 75.1701Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M71.5305 14.66V22.67L61.1504 28.66L31.1704 45.97V57.96L24.2305 61.97V41.97L54.2205 24.66L71.5305 14.66Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
            <path
                d="M24.23 41.9701V61.9701L2.41992 49.3701V29.3701L19.73 39.3701L24.23 41.9701Z"
                stroke="currentColor"
                strokeLinejoin="round"
            />
        </svg>
    )
}