"use client";

import { cn } from "@/lib/utils";
import { Check, ClipboardCheck, Dumbbell, Medal, Swords, Trophy, type LucideIcon } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type PipelineStatus = "done" | "active" | "pending";

export type PipelineStep = { title: string; subtitle: string };
export type PipelineOutcome = { title: string; subtitle: string };

type PipelineProps = {
  steps: readonly PipelineStep[];
  /** Destinos finais: o último passo se bifurca em cada um deles. */
  outcomes: readonly PipelineOutcome[];
  label?: string;
  className?: string;
};

const STEP_ICONS: LucideIcon[] = [ClipboardCheck, Dumbbell, Swords];
const OUTCOME_ICONS: LucideIcon[] = [Medal, Trophy];

const STATUS_LABEL: Record<PipelineStatus, string> = {
  done: "Concluído",
  active: "Em execução",
  pending: "Na fila",
};

/** Tempo (s) que cada etapa fica "Em execução" antes de passar para a próxima. */
const STEP_SECONDS = 1.4;

/* -------------------------------------------------------------------------- */
/*                                  conectores                                */
/* -------------------------------------------------------------------------- */

/**
 * Linha reta com um pulso de luz correndo de uma etapa à outra. O mesmo
 * elemento vira vertical no mobile e horizontal no desktop (lg).
 */
function Connector({ lit, delay, reduce }: { lit: boolean; delay: number; reduce: boolean }) {
  return (
    <div aria-hidden className="relative flex items-center justify-center self-stretch">
      {/* trilho: vertical < lg, horizontal ≥ lg */}
      <div
        className={cn(
          "relative h-10 w-px overflow-hidden lg:h-px lg:w-full",
          lit ? "bg-brand/40" : "bg-white/10"
        )}
      >
        {!reduce && (
          <>
            <motion.span
              animate={{ y: ["-100%", "100%"] }}
              className="absolute inset-0 lg:hidden"
              transition={{ duration: 1.6, delay, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.4 }}
            >
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent",
                  lit ? "to-brand" : "to-white/40"
                )}
              />
            </motion.span>
            <motion.span
              animate={{ x: ["-100%", "100%"] }}
              className="absolute inset-0 hidden lg:block"
              transition={{ duration: 1.6, delay, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.4 }}
            >
              <span
                className={cn(
                  "absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-transparent",
                  lit ? "to-brand" : "to-white/40"
                )}
              />
            </motion.span>
          </>
        )}
      </div>
    </div>
  );
}

/** Bifurcação em Y: do último passo para os dois destinos (vertical no mobile, horizontal no desktop). */
function Fork({ delay, lit, reduce }: { delay: number; lit: boolean; reduce: boolean }) {
  // viewBox 100×100 esticado; as pontas caem no centro de cada destino (25% e 75%)
  const horizontal = ["M0 50 C 50 50, 50 25, 100 25", "M0 50 C 50 50, 50 75, 100 75"];
  const vertical = ["M50 0 C 50 50, 25 50, 25 100", "M50 0 C 50 50, 75 50, 75 100"];
  const render = (paths: string[], className: string) => (
    <svg aria-hidden className={className} fill="none" preserveAspectRatio="none" viewBox="0 0 100 100">
      {paths.map((d, i) => (
        <g key={d}>
          <path className="stroke-white/10" d={d} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {!reduce && (
            <motion.path
              animate={{ strokeDashoffset: [100, -20] }}
              className={lit ? "stroke-emerald-400" : "stroke-white/40"}
              d={d}
              pathLength={100}
              strokeDasharray="20 100"
              strokeLinecap="round"
              strokeWidth={1.5}
              transition={{ duration: 1.6, delay: delay + i * 0.25, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.4 }}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      ))}
    </svg>
  );
  return (
    <div className="relative self-stretch">
      {render(vertical, "h-12 w-full lg:hidden")}
      {render(horizontal, "absolute inset-0 hidden size-full lg:block")}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                     nós                                    */
/* -------------------------------------------------------------------------- */

function Node({
  icon: Icon,
  index,
  title,
  subtitle,
  status,
  reduce,
  className,
}: {
  icon: LucideIcon;
  index: string;
  title: string;
  subtitle: string;
  status: PipelineStatus | "outcome" | "champion";
  reduce: boolean;
  className?: string;
}) {
  const active = status === "active";
  const done = status === "done";
  const champion = status === "champion";
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 ring-1 backdrop-blur-sm transition-[background-color,box-shadow] duration-500",
        champion
          ? "bg-emerald-500/[0.08] shadow-[0_0_40px_-12px_var(--color-emerald-500)] ring-2 ring-emerald-500"
          : active
            ? "bg-brand/[0.07] shadow-[0_0_40px_-12px_var(--color-brand)] ring-brand/50"
            : "bg-neutral-900/70 ring-white/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            "transition-colors duration-500",
            champion ? "bg-emerald-600 text-[#fff]" : active || done ? "bg-brand text-on-brand" : "bg-white/5 text-brand"
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="font-mono text-[11px] tracking-wider text-neutral-500">{index}</span>
      </div>

      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-white sm:text-base">{title}</h4>
        <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
      </div>

      <div className="mt-auto">
        {champion ? (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Trophy className="size-3" /> Campeão
          </motion.span>
        ) : status === "outcome" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
            <span className="size-1.5 rounded-full bg-neutral-600" /> Destino
          </span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-medium",
                active ? "text-brand" : done ? "text-neutral-300" : "text-neutral-500"
              )}
            >
              {done ? (
                <Check className="size-3" />
              ) : (
                <span className="relative flex size-1.5">
                  {active && !reduce && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                  )}
                  <span className={cn("relative size-1.5 rounded-full", active ? "bg-brand" : "bg-neutral-600")} />
                </span>
              )}
              {STATUS_LABEL[status]}
            </span>
            {/* barra de progresso: cheia se concluído; enche uma vez durante a execução */}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              {done && <div className="h-full w-full rounded-full bg-brand/60" />}
              {active &&
                (reduce ? (
                  <div className="h-full w-3/5 rounded-full bg-brand" />
                ) : (
                  <motion.div
                    animate={{ width: "100%" }}
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft"
                    initial={{ width: "0%" }}
                    transition={{ duration: STEP_SECONDS, ease: "easeInOut" }}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   pipeline                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fluxo de etapas conectadas por linhas com pulsos de luz, terminando numa
 * bifurcação para os destinos finais. Horizontal no desktop, empilhado no
 * mobile (sem scroll lateral).
 *
 * Toca uma única vez, quando a seção entra na tela (IntersectionObserver via
 * `useInView({ once: true })`): 01 → 02 → 03 e, por fim, os destinos 4A e 4B
 * ficam com borda verde e o selo "Campeão", e permanecem assim.
 */
export default function Pipeline({ steps, outcomes, label, className }: PipelineProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  // -1 = ainda não visto; 0..n-1 = etapa em execução; n = destinos alcançados
  const [stage, setStage] = useState(-1);
  const finalStage = steps.length;
  const current = reduce && inView ? finalStage : stage;

  useEffect(() => {
    if (!inView || reduce || stage >= finalStage) return;
    // começa logo ao entrar; cada etapa fica STEP_SECONDS em execução
    const id = window.setTimeout(() => setStage((s) => s + 1), stage < 0 ? 250 : STEP_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [inView, reduce, stage, finalStage]);

  const statusOf = (i: number): PipelineStatus => (i < current ? "done" : i === current ? "active" : "pending");
  // trecho entre a etapa i-1 e a i fica "aceso" (laranja) quando a i já começou
  const isLit = (i: number) => current >= i;
  const reached = current >= finalStage;

  return (
    <div aria-label={label} className={className} ref={ref} role="group">
      <ol className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)_2.5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] lg:items-center">
        {steps.map((step, i) => (
          <li className="contents" key={step.title}>
            <Node
              icon={STEP_ICONS[i] ?? ClipboardCheck}
              index={String(i + 1).padStart(2, "0")}
              reduce={reduce}
              status={statusOf(i)}
              subtitle={step.subtitle}
              title={step.title}
            />
            {i < steps.length - 1 ? (
              <Connector delay={i * 0.5} lit={isLit(i + 1)} reduce={reduce} />
            ) : (
              <Fork delay={i * 0.5} lit={reached} reduce={reduce} />
            )}
          </li>
        ))}
        <li aria-live="polite" className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {outcomes.map((o, i) => (
            <Node
              icon={OUTCOME_ICONS[i] ?? Trophy}
              index={`${steps.length + 1}${String.fromCharCode(65 + i)}`}
              key={o.title}
              reduce={reduce}
              status={reached ? "champion" : "outcome"}
              subtitle={o.subtitle}
              title={o.title}
            />
          ))}
        </li>
      </ol>
    </div>
  );
}
