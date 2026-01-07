import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Link } from '@tanstack/react-router'

export default function FAQs() {
    const faqItems = [
        {
            group: 'General',
            items: [
                {
                    id: 'item-1',
                    question: 'Does Unlingo have a free trial?',
                    answer: 'Yes! We offer a 30-day free trial so you can test Unlingo before committing to a paid plan. After the trial period, you can choose a plan that fits your needs.',
                },
                {
                    id: 'item-2',
                    question: 'Is Unlingo open source?',
                    answer: 'Yes, Unlingo is fully open source. You can view our source code, contribute to the project, and even self-host it if you prefer. We believe in transparency and community-driven development.',
                },
                {
                    id: 'item-3',
                    question: 'Is everything really unlimited?',
                    answer: 'Many features are unlimited including projects, namespaces, glossary entries, and language rules. You also get access to 90+ languages, screenshots, releases with A/B tests, and AI translations. The only limits are on monthly API requests and keys per workspace based on your selected plan.',
                },
            ],
        },
        {
            group: 'Integration',
            items: [
                {
                    id: 'item-1',
                    question: 'Do I need to modify a lot of code to use Unlingo?',
                    answer: 'Not at all! Unlingo is designed to be easy to integrate. Since we are just an API, you only need a few lines of code in your codebase to get started. Our platform handles all the heavy lifting for localization.',
                },
                {
                    id: 'item-2',
                    question: 'What languages does Unlingo support?',
                    answer: 'Unlingo supports 90+ languages out of the box. Whether you need common languages or more specialized ones, we have you covered for your localization needs.',
                },
                {
                    id: 'item-3',
                    question: 'What kind of support do you offer?',
                    answer: 'We offer multiple support channels to help you succeed. You can reach us via email, join our Discord community for real-time help, or open GitHub issues for bug reports and feature requests.',
                },
            ],
        },
    ]

    return (
        <section className="bg-background py-16 md:py-24">
            <div className="mx-auto max-w-5xl px-1 md:px-6">
                <div className="grid gap-8 md:grid-cols-5 md:gap-12">
                    <div className="max-w-lg max-md:px-6 md:col-span-2">
                        <h2 className="text-foreground text-4xl font-semibold">FAQs</h2>
                        <p className="text-muted-foreground mt-4 text-balance text-lg">Your questions answered</p>
                        <p className="text-muted-foreground mt-6 max-md:hidden">
                            Can't find what you're looking for? Contact our{' '}
                            <Link
                                to="/"
                                className="text-primary font-medium hover:underline">
                                customer support team
                            </Link>
                        </p>
                    </div>

                    <div className="space-y-12 md:col-span-3">
                        {faqItems.map((item) => (
                            <div
                                className="space-y-4"
                                key={item.group}>
                                <h3 className="text-foreground pl-6 text-lg font-semibold">{item.group}</h3>
                                <Accordion
                                    className="-space-y-1">
                                    {item.items.map((item) => (
                                        <AccordionItem
                                            key={item.id}
                                            value={item.id}
                                            className="data-[state=open]:bg-card data-[state=open]:ring-foreground/5 peer rounded-xl border-none px-6 py-1 data-[state=open]:border-none data-[state=open]:shadow-sm data-[state=open]:ring-1">
                                            <AccordionTrigger className="cursor-pointer rounded-none border-b text-base transition-none hover:no-underline data-[state=open]:border-transparent">{item.question}</AccordionTrigger>
                                            <AccordionContent>
                                                <p className="text-muted-foreground text-base">{item.answer}</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-muted-foreground mt-12 px-6 md:hidden">
                    Can't find what you're looking for? Contact our{' '}
                    <Link
                        to="/"
                        className="text-primary font-medium hover:underline">
                        customer support team
                    </Link>
                </p>
            </div>
        </section>
    )
}