"use client";

import { CtaButton } from "@/components/site/navbar";
import { externalLinkProps } from "@/lib/utils";
import ShaderCard from "@/components/ui/shader-card";
import { siteConfig } from "@/config/site";
import { motion } from "motion/react";

/** Laranja da marca (= --color-brand) para a chama. */
const BRAND_FLAME = "#ff6600";

/**
 * CTA final: card escuro com a chama laranja (ShaderCard) subindo por trás
 * do texto e dos botões, que flutuam com parallax ao inclinar. O card é uma
 * "ilha" escura (`theme-fixed`): fica igual nos temas claro e escuro.
 */
export default function CallToAction() {
  const { cta } = siteConfig;

  return (
    <section className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-28" id="contato">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <ShaderCard
          backgroundColor="#0d0a08"
          borderRadius="2rem"
          className="theme-fixed ring-1 ring-white/10"
          color={BRAND_FLAME}
          height="auto"
          tiltStrength={4}
          width="100%"
        >
          <div className="flex min-h-[520px] flex-col items-center px-6 pt-16 pb-56 text-center [text-shadow:0_2px_24px_rgb(0_0_0/0.6)] sm:min-h-[600px] sm:px-12 sm:pt-24 sm:pb-64">
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-5xl">{cta.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-300">{cta.description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CtaButton href={cta.primary.href} label={cta.primary.label} />
              <a
                className="inline-flex h-11 items-center rounded-xl px-5 text-sm font-medium bg-black/30 text-white ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/10 sm:h-12"
                href={cta.secondary.href}
                {...externalLinkProps(cta.secondary.href)}
              >
                {cta.secondary.label}
              </a>
            </div>
          </div>
        </ShaderCard>
      </motion.div>
    </section>
  );
}
