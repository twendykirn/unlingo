import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'

export default function CallToAction() {
    return (
        <section className="bg-background py-12 md:py-24">
            <div className="mx-auto max-w-5xl px-6">
                <Card className="relative overflow-hidden p-8 shadow-lg md:px-32 md:py-20">
                    <div className="relative text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-4xl">Translate your app today</h2>
                        <p className="text-muted-foreground mb-6 mt-4 text-balance">Launch globally with fast, reliable localization.</p>
                        <Button render={<Link to="/sign-up/$" />}>
                            Create account
                        </Button>
                    </div>
                </Card>
            </div>
        </section>
    )
}