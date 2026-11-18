"use client";

import CoachSheet, { initials } from "@/components/site/coach-sheet";
import PortraitBackdrop from "@/components/site/portrait-backdrop";
import { siteConfig, type Coach } from "@/config/site";
import type { CoachRecord } from "@/lib/bento";
import { cn } from "@/lib/utils";
import { ArrowRight, Whistle } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type PointerEvent, useState } from "react";

const MAX_TILT = 4; // graus
const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

/* -------------------------------------------------------------------------- */
/*                                   retrato                                  */
/* -------------------------------------------------------------------------- */

/**
 * Retrato do card: fundo padrão (degradê laranja + pontilhado + quadra) com a
 * foto PNG sem fundo do treinador recortada por cima. Sem `image`, o monograma
 * em serifa ocupa o centro; com ela, vira marca d'água sutil atrás da foto.
 */
function Portrait({ coach }: { coach: Coach }) {
  return (
    <div className="theme-fixed relative aspect-[16/11] overflow-hidden rounded-2xl bg-[#3b1600] sm:aspect-[4/5]">
      <PortraitBackdrop />
      {/* monograma */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 grid place-items-center font-serif text-[clamp(5rem,12vw,9rem)] leading-none text-white/95 italic [text-shadow:0_10px_40px_rgb(0_0_0/0.35)]",
          coach.image && "opacity-10"
        )}
      >
        {initials(coach.name)}
      </span>
      {coach.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={coach.fullName}
          className="absolute inset-0 size-full object-cover object-top drop-shadow-[0_12px_24px_rgb(0_0_0/0.35)]"
          src={coach.image}
        />
      )}
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
        <Whistle aria-hidden className="size-3.5" />
        Comissão técnica
      </span>
      <span className="absolute bottom-3 left-3 text-[11px] font-medium tracking-[0.2em] text-white/80 uppercase [text-shadow:0_1px_6px_rgb(0_0_0/0.5)]">
        Cuiabá · MT
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         card com profundidade + luz                        */
/* -------------------------------------------------------------------------- */

/**
 * Card com inclinação 3D (mola, ±4°) e um holofote dourado que segue o
 * cursor no fundo e na borda. Só reage a mouse/caneta; com "reduzir
 * movimento", fica plano e mantém apenas o holofote.
 */
function CoachCard({ coach, onOpen }: { coach: Coach; onOpen: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);
  const rx = useSpring(0, SPRING);
  const ry = useSpring(0, SPRING);
  const [hover, setHover] = useState(false);

  const glow = useMotionTemplate`radial-gradient(520px circle at ${mx}px ${my}px, color-mix(in oklab, var(--color-brand-soft) 16%, transparent), transparent 60%)`;
  const edge = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, color-mix(in oklab, var(--color-brand) 85%, transparent), transparent 65%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    mx.set(x);
    my.set(y);
    if (!reduce) {
      rx.set((0.5 - y / r.height) * 2 * MAX_TILT);
      ry.set((x / r.width - 0.5) * 2 * MAX_TILT);
    }
  };
  const onLeave = () => {
    setHover(false);
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className="group relative h-full cursor-pointer rounded-3xl bg-white/10 p-px [transform-style:preserve-3d]"
      onClick={onOpen}
      onPointerEnter={(e) => e.pointerType !== "touch" && setHover(true)}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
    >
      {/* borda iluminada pelo cursor */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
        style={{ backgroundImage: edge, opacity: hover ? 1 : 0 }}
      />
      <article className="relative flex h-full flex-col gap-6 overflow-hidden rounded-[calc(1.5rem-1px)] bg-neutral-900 p-4 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:p-5 lg:gap-7">
        {/* holofote no fundo */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{ backgroundImage: glow, opacity: hover ? 1 : 0 }}
        />
        <Portrait coach={coach} />

        <div className="relative flex min-w-0 flex-col gap-4 px-1 pb-1 sm:py-2">
          <span className="inline-flex w-fit rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand">{coach.role}</span>
          <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{coach.name}</h3>
          <ul aria-label="Credenciais" className="flex flex-wrap gap-1.5">
            {coach.credentials.map((c) => (
              <li className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300 ring-1 ring-white/10" key={c}>
                {c}
              </li>
            ))}
          </ul>
          <p className="text-[15px] leading-relaxed text-neutral-300">{coach.shortBio}</p>
          <button
            aria-haspopup="dialog"
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 transition-colors group-hover:bg-brand group-hover:text-on-brand group-hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            type="button"
          >
            Ler mais
            <span className="sr-only"> sobre {coach.fullName}</span>
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </article>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    seção                                   */
/* -------------------------------------------------------------------------- */

/** Treinadores chegam do store (`lib/bento-store`, editáveis em /admin), já filtrados pelos ativos. */
export default function CoachesSection({ items }: { items: CoachRecord[] }) {
  const { coaches } = siteConfig;
  const [selected, setSelected] = useState<string | null>(null);
  const coach: Coach | null = items.find((c) => c.id === selected) ?? null;
  if (!items.length) return null;

  return (
    <section
      aria-labelledby="comissao-titulo"
      className="mx-auto w-full max-w-[1680px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12 xl:px-16"
      id="comissao"
    >
      <motion.div
        className="mb-12 max-w-3xl"
        initial={{ opacity: 0, y: 28 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <p className="mb-3 text-xs font-medium tracking-[0.3em] text-brand uppercase">{coaches.eyebrow}</p>
        <h2 className="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl" id="comissao-titulo">
          {coaches.title}
        </h2>
        <p className="mt-4 max-w-2xl text-neutral-400">{coaches.subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {items.map((c, i) => (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            key={c.id}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-80px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <CoachCard coach={c} onOpen={() => setSelected(c.id)} />
          </motion.div>
        ))}
      </div>

      <CoachSheet coach={coach} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}
