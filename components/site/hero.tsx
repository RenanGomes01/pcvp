"use client";

import { CtaButton } from "@/components/site/navbar";
import TacticalBoard from "@/components/ui/tactical-board";
import { siteConfig } from "@/config/site";
import { Lighthouse, type LucideIcon, Palmtree, Sailboat, Shell, Sun, Waves, Wind } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const SPONSOR_ICONS: Record<string, LucideIcon> = { Sun, Waves, Wind, Shell, Palmtree, Lighthouse, Sailboat };

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
});

/**
 * Hero dentro de um "frame" arredondado: textura abstrata laranja/amarela
 * (clara no tema claro, escura com brasas no escuro — ver `.hero-texture`),
 * título grande com a palavra de destaque em serifa itálica laranja, a prancheta
 * tática animada flutuando abaixo e o marquee de patrocinadores no "chão" laranja.
 */
export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // parallax: fundo desce devagar, texto sobe, prancheta "levanta" e endireita
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const textY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-30%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const panelY = useTransform(scrollYProgress, [0, 0.6], [80, -40]);
  const panelRotate = useTransform(scrollYProgress, [0, 0.4], [14, 0]);

  const { hero, tactical } = siteConfig;

  return (
    <section
      className="theme-fixed relative mr-[calc(0.375rem+env(safe-area-inset-right,0px))] ml-[calc(0.375rem+env(safe-area-inset-left,0px))] overflow-hidden rounded-b-[1.75rem] sm:mr-[calc(0.5rem+env(safe-area-inset-right,0px))] sm:ml-[calc(0.5rem+env(safe-area-inset-left,0px))] sm:rounded-b-[2.5rem]"
      id="inicio"
      ref={ref}
    >
      {/* textura de fundo (parallax) */}
      <motion.div aria-hidden className="absolute inset-0 -top-[10%] -bottom-[10%]" style={{ y: bgY }}>
        <div className="hero-texture absolute inset-0" />
        <div className="hero-dither absolute inset-0" />
      </motion.div>

      {/* título */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-4 pt-[calc(9rem+env(safe-area-inset-top,0px))] text-center sm:pt-[calc(12rem+env(safe-area-inset-top,0px))]"
        style={{ y: textY, opacity: textOpacity }}
      >
        <motion.span
          {...fadeUp(0.2)}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-neutral-900/10 bg-white/70 px-4 py-1.5 text-sm text-neutral-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-neutral-100"
        >
          {hero.badge} <span className="text-brand">✦</span>
        </motion.span>

        <motion.h1
          {...fadeUp(0.3)}
          className="text-[clamp(2.6rem,8.5vw,6.5rem)] leading-[1.02] font-medium tracking-tight text-neutral-950 dark:text-white"
        >
          {hero.titleLine1}
          <br />
          {hero.titleLine2}{" "}
          <span className="font-serif font-normal text-brand italic [text-shadow:0_1px_0_rgb(0_0_0/0.04)] dark:[text-shadow:0_0_40px_rgb(255_102_0/0.45)]">
            {hero.titleAccent}
          </span>
        </motion.h1>

        <motion.p {...fadeUp(0.45)} className="mt-6 max-w-xl text-base text-neutral-700 sm:text-lg dark:text-neutral-300">
          {hero.subtitle}
        </motion.p>

        <motion.div {...fadeUp(0.55)} className="mt-8">
          <CtaButton
            className="dark:bg-white dark:text-neutral-950"
            href={hero.cta.href}
            label={hero.cta.label}
            variant="dark"
          />
        </motion.div>
      </motion.div>

      {/* prancheta tática flutuante (tilt + parallax ao rolar) */}
      <div className="relative z-10 mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 mt-16 [perspective:1600px] sm:mt-20">
        <motion.div
          className="origin-top overflow-hidden rounded-2xl bg-neutral-950 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.55)] ring-1 ring-white/10 sm:rounded-3xl"
          initial={{ opacity: 0 }}
          style={{ y: panelY, rotateX: panelRotate }}
          transition={{ duration: 1, delay: 0.6 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <TacticalBoard
            legend={tactical.legend}
            live={tactical.live}
            play={tactical.play}
            steps={tactical.steps}
            title={tactical.title}
          />
        </motion.div>
      </div>

      {/* chão laranja + marquee de patrocinadores */}
      <div className="hero-ground relative z-10 -mt-20 pt-28 pb-14 sm:-mt-28 sm:pt-36 sm:pb-20">
        <SponsorsMarquee />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** Marquee infinito (CSS puro): lista duplicada deslocando -50%, bordas com máscara. */
function SponsorsMarquee() {
  const list = siteConfig.sponsors;
  return (
    <div
      aria-label="Patrocinadores"
      className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      role="region"
    >
      <ul className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...list, ...list].map((s, i) => {
          const Icon = SPONSOR_ICONS[s.icon] ?? Sun;
          return (
            <li
              aria-hidden={i >= list.length}
              className="flex shrink-0 items-center gap-2.5 px-8 text-2xl font-semibold tracking-tight whitespace-nowrap text-white/90 sm:px-12 sm:text-3xl"
              key={`${s.name}-${i}`}
            >
              <Icon className="size-7 sm:size-8" strokeWidth={2.25} />
              {s.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
