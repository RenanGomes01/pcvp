import CoachesSection from "@/components/site/coaches-section";
import CallToAction from "@/components/site/cta-section";
import EbooksSection from "@/components/site/ebooks-section";
import GallerySection from "@/components/site/gallery-section";
import Hero from "@/components/site/hero";
import Navbar, { ScreenFrame } from "@/components/site/navbar";
import PricingSection from "@/components/site/pricing-section";
import { Bento, Footer, ParticleShowcase, ScheduleSection, Statement, Steps } from "@/components/site/sections";

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
        <CoachesSection />
        <Bento />
        <ScheduleSection />
        <PricingSection />
        <ParticleShowcase />
        <Steps />
        <GallerySection />
        <EbooksSection />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
