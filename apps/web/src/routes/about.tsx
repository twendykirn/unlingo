import { createFileRoute } from '@tanstack/react-router';
import HeroHeader from "@/components/header";
import TeamSection from '@/components/team';
import FooterSection from '@/components/footer';

export const Route = createFileRoute('/about')({
    component: RouteComponent,
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
