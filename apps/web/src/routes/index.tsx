import BentoFour from "@/components/bento-4";
import SmartHomeBento from "@/components/bento-5";
import CallToAction from "@/components/call-to-action";
import FAQs from "@/components/faqs-1";
import FeaturesSection from "@/components/features-8";
import FooterSection from "@/components/footer";
import GithubSpaceLogo from "@/components/github-space-logo";
import HeroSection from "@/components/hero-section";
import PricingSection from "@/components/pricing-section";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
	head: () => ({
		meta: [
			{
				title: "Unlingo - Developer Platform for Internationalization",
			},
			{
				name: "description",
				content: "Unlingo is a developer platform for internationalization. Manage translations, host translation files, and integrate with popular i18n libraries.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:title",
				content: "Unlingo - Developer Platform for Internationalization",
			},
			{
				property: "og:description",
				content: "Unlingo is a developer platform for internationalization. Manage translations, host translation files, and integrate with popular i18n libraries.",
			},
			{
				property: "og:url",
				content: "https://unlingo.com",
			},
			{
				property: "og:image",
				content: "/og.png",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: "Unlingo - Developer Platform for Internationalization",
			},
			{
				name: "twitter:description",
				content: "Unlingo is a developer platform for internationalization. Manage translations, host translation files, and integrate with popular i18n libraries.",
			},
			{
				name: "twitter:image",
				content: "/og.png",
			},
		],
	}),
});

function HomeComponent() {
	return (
		<div className="min-h-screen w-full">
			<HeroSection />
			<BentoFour />
			<section className="bg-background">
				<div className="py-24">
					<div className="perspective-dramatic group mx-auto max-w-5xl px-6">
						<div className="rotate-x-6 hover:rotate-x-0 mask-radial-from-70% mask-radial-[50%_90%] group relative mx-auto max-w-2xl scale-y-90 items-center justify-between space-y-6 from-transparent pb-1 transition-transform duration-1000 hover:scale-y-100">
							<div className="mask-radial-to-55% absolute inset-0 bg-[radial-gradient(var(--color-foreground)_1px,transparent_1px)] opacity-25 [background-size:16px_16px]" />
							<GithubSpaceLogo />
						</div>
						<div className="mx-auto mt-12 max-w-xl text-center">
							<h2 className="text-balance text-3xl font-semibold md:text-5xl">Open Source</h2>
							<p className="text-muted-foreground mb-6 mt-4 text-balance">Connect seamlessly with popular frameworks and platforms to enhance your workflow.</p>
							<div className="flex w-full gap-2 justify-center">
								<Button size='sm' render={<a href='https://github.com/twendykirn/unlingo' target='_blank' />}>
									Visit repository
								</Button>
								<Button
									size="sm"
									variant="outline"
									render={<a href='https://docs.unlingo.com' target='_blank' />}>
									Docs
								</Button>
							</div>
						</div>
					</div>
				</div>
			</section>
			<SmartHomeBento />
			<PricingSection />
			<FeaturesSection />
			<FAQs />
			<CallToAction />
			<FooterSection />
		</div>
	);
}
