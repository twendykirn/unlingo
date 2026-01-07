import { Card } from '@/components/ui/card'
import { ChartIllustration } from "@/components/chart-illustration"
import { DocumentIllustation } from "@/components/document-illustration"
import { KeysIllustration } from "@/components/keys-illustration"
import { FingerprintScanIllustration } from "@/components/fingerprint-scan-illustration"
import { CampaignIllustration } from "@/components/campaign-illustration"

export default function SmartHomeBento() {
    return (
        <section
            data-theme="dark"
            className="bg-background @container">
            <div className="py-24 [--color-primary:var(--color-indigo-300)]">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="@xl:grid-cols-2 @4xl:grid-cols-10 grid grid-cols-1 gap-4">
                        <Card className="@4xl:col-span-4 group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Smart Lighting Control</h3>
                                <p className="text-muted-foreground mt-3">Automate your home lighting with customizable schedules.</p>
                            </div>
                            <KeysIllustration />
                        </Card>
                        <Card className="@xl:col-span-2 @4xl:col-span-6 grid grid-rows-[auto_1fr] gap-8 rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <div>
                                <h3 className="text-foreground font-semibold">Interactive Dashboards</h3>
                                <p className="text-muted-foreground mt-3">Create custom dashboards with drag-and-drop simplicity. Automate your home lighting with customizable schedules.</p>
                            </div>
                            <div className="relative">
                                <ChartIllustration />
                            </div>
                        </Card>
                        <Card className="@4xl:col-span-3 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <FingerprintScanIllustration />
                            <div>
                                <h3 className="text-foreground font-semibold">Smart Lighting Control</h3>
                                <p className="text-muted-foreground mt-3">Automate your home lighting with customizable schedules.</p>
                            </div>
                        </Card>
                        <Card className="@4xl:col-span-4 group grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8 [--color-background:var(--color-muted)]">
                            <CampaignIllustration />
                            <div>
                                <h3 className="text-foreground font-semibold">Smart Lighting Control</h3>
                                <p className="text-muted-foreground mt-3">Automate your home lighting with customizable schedules.</p>
                            </div>
                        </Card>
                        <Card className="@4xl:row-start-auto @4xl:col-span-3 row-start-1 grid grid-rows-[1fr_auto] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="**:mt-0 grid h-fit grid-cols-3 gap-3">
                                <DocumentIllustation />
                                <DocumentIllustation />
                                <DocumentIllustation />
                                <DocumentIllustation />
                                <DocumentIllustation />
                                <DocumentIllustation />
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold">Collaborative Analysis</h3>
                                <p className="text-muted-foreground mt-3">Add comments, share insights, and work together.</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}