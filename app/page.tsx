import CoachesSection from "@/components/site/coaches-section";
import CallToAction from "@/components/site/cta-section";
import GallerySection from "@/components/site/gallery-section";
import GuidesSection from "@/components/site/guides-section";
import Hero from "@/components/site/hero";
import Navbar, { ScreenFrame } from "@/components/site/navbar";
import PricingSection from "@/components/site/pricing-section";
import { Bento, Footer, ParticleShowcase, ScheduleSection, Statement, Steps } from "@/components/site/sections";
import { getBentoView } from "@/lib/bento-store";

/** Dados dinâmicos (editáveis em /admin). Cacheados com a tag "bento": cada edição expira o cache. */
async function BentoWithData() {
  return <Bento data={await getBentoView()} />;
}

async function CoachesWithData() {
  return <CoachesSection items={(await getBentoView()).coachesList} />;
}

export default function Home() {
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-950"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>
      <ScreenFrame />
      <Navbar />
      <main className="flex-1" id="conteudo">
        <Hero />
        <Statement />
        <CoachesWithData />
        <BentoWithData />
        <ScheduleSection />
        <PricingSection />
        <ParticleShowcase />
        <Steps />
        <GallerySection />
        <GuidesSection />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
