"use client";

import { CtaButton } from "@/components/site/navbar";
import { siteConfig, type TeamGuide } from "@/config/site";
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/** Capa gerada em CSS (sem imagem): gradiente + grade + título. */
const COVERS = [
  "from-amber-300 via-orange-500 to-orange-800",
  "from-yellow-200 via-amber-400 to-orange-600",
] as const;

/**
 * Guias do time: 2 cards informativos lado a lado (capa em degradê, tilt + lift
 * no hover). Conteúdo real do PCVP: como começar e programas de treino.
 */
export default function GuidesSection() {
  const { guides } = siteConfig;
  return (
    <section className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-28" id="guias">
      <motion.div
        className="mb-12 max-w-3xl"
        initial={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <span className="mb-4 inline-block text-xs font-medium tracking-[0.3em] text-brand uppercase">
          {guides.eyebrow}
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-5xl">{guides.title}</h2>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-2">
        {guides.items.map((guide, i) => (
          <GuideCard cover={COVERS[i % COVERS.length]} guide={guide} index={i} key={guide.title} />
        ))}
      </div>
    </section>
  );
}

function GuideCard({ guide, cover, index }: { guide: TeamGuide; cover: string; index: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 180, damping: 18, mass: 0.5 };
  const rotateY = useSpring(useTransform(mx, (v) => v * 7), spring);
  const rotateX = useSpring(useTransform(my, (v) => -v * 7), spring);

  return (
    <motion.div
      className="[perspective:1200px]"
      initial={{ opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-60px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <motion.article
        className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-[2rem] bg-neutral-900 p-6 ring-1 ring-white/10 transition-shadow duration-500 hover:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] sm:flex-row sm:p-7"
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
          my.set(-(((e.clientY - r.top) / r.height) * 2 - 1));
        }}
        style={{ rotateX, rotateY }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ y: -8 }}
      >
        {/* capa */}
        <div
          className={cn(
            "relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br shadow-[0_20px_40px_-12px_rgb(0_0_0/0.8)] transition-transform duration-500 group-hover:-rotate-2 sm:w-36",
            cover
          )}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgb(0_0_0/0.08)_1px,transparent_1px),linear-gradient(90deg,rgb(0_0_0/0.08)_1px,transparent_1px)] bg-[size:14px_14px]" />
          <div className="absolute inset-y-0 left-0 w-2 bg-black/20" />
          <div className="relative flex h-full flex-col justify-between p-3 pl-4">
            <span className="text-[9px] font-semibold tracking-[0.25em] text-neutral-950/70 uppercase">
              {guide.kind} · {siteConfig.name}
            </span>
            <p className="line-clamp-5 text-[11px] leading-tight font-semibold text-neutral-950">{guide.title}</p>
          </div>
        </div>

        {/* texto */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-neutral-300 ring-1 ring-white/10">
            <Compass className="size-3" /> {guide.badge}
          </span>
          <h3 className="text-lg leading-snug font-semibold text-white sm:text-xl">{guide.title}</h3>
          <p className="mt-2 text-sm text-neutral-400">{guide.description}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {guide.topics.map((t) => (
              <li className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] text-brand" key={t}>
                {t}
              </li>
            ))}
          </ul>
          <CtaButton className="mt-6 w-full sm:w-fit" href={guide.cta.href} label={guide.cta.label} />
        </div>
      </motion.article>
    </motion.div>
  );
}
