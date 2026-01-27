import { createFileRoute } from '@tanstack/react-router';
import HeroHeader from "@/components/header";
import TeamSection from '@/components/team';
import FooterSection from '@/components/footer';

export const Route = createFileRoute('/about')({
    component: RouteComponent,
    head: () => ({
        meta: [
            {
                title: "About Us - Unlingo",
            },
            {
                name: "description",
                content: "Learn about Unlingo and our mission to simplify internationalization for developers. Meet the team behind the platform.",
            },
            {
                property: "og:type",
                content: "website",
            },
            {
                property: "og:title",
                content: "About Us - Unlingo",
            },
            {
                property: "og:description",
                content: "Learn about Unlingo and our mission to simplify internationalization for developers. Meet the team behind the platform.",
            },
            {
                property: "og:url",
                content: "https://unlingo.com/about",
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
                content: "About Us - Unlingo",
            },
            {
                name: "twitter:description",
                content: "Learn about Unlingo and our mission to simplify internationalization for developers. Meet the team behind the platform.",
            },
            {
                name: "twitter:image",
                content: "/og.png",
            },
        ],
    }),
})

function RouteComponent() {
    return (
        <div className="min-h-screen w-full">
            <HeroHeader />
            <TeamSection />
            <FooterSection />
        </div>
    )
}
