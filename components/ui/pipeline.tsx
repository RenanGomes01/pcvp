"use client";

import { cn } from "@/lib/utils";
import { Check, ClipboardCheck, Dumbbell, Medal, Swords, Trophy, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export type PipelineStatus = "done" | "active" | "pending";

export type PipelineStep = { title: string; subtitle: string; status: PipelineStatus };
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
function Fork({ delay, reduce }: { delay: number; reduce: boolean }) {
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
              className="stroke-brand"
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
  status: PipelineStatus | "outcome";
  reduce: boolean;
  className?: string;
}) {
  const active = status === "active";
  const done = status === "done";
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 ring-1 backdrop-blur-sm transition-colors",
        active
          ? "bg-brand/[0.07] shadow-[0_0_40px_-12px_var(--color-brand)] ring-brand/50"
          : "bg-neutral-900/70 ring-white/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            active || done ? "bg-brand text-on-brand" : "bg-white/5 text-brand"
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
        {status === "outcome" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-soft">
            <span className="size-1.5 rounded-full bg-brand-soft" /> Destino
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
            {/* barra de progresso: cheia se concluído, correndo em loop se ativo */}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              {done && <div className="h-full w-full rounded-full bg-brand/60" />}
              {active &&
                (reduce ? (
                  <div className="h-full w-3/5 rounded-full bg-brand" />
                ) : (
                  <motion.div
                    animate={{ width: ["8%", "92%"] }}
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft"
                    transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
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
 */
export default function Pipeline({ steps, outcomes, label, className }: PipelineProps) {
  const reduce = useReducedMotion() ?? false;
  const activeIndex = steps.findIndex((s) => s.status === "active");
  // trechos até a etapa ativa ficam "acesos" (laranja); depois dela, neutros
  const isLit = (i: number) => activeIndex === -1 || i < activeIndex;

  return (
    <div aria-label={label} className={className} role="group">
      <ol className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)_2.5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] lg:items-center">
        {steps.map((step, i) => (
          <li className="contents" key={step.title}>
            <Node
              icon={STEP_ICONS[i] ?? ClipboardCheck}
              index={String(i + 1).padStart(2, "0")}
              reduce={reduce}
              status={step.status}
              subtitle={step.subtitle}
              title={step.title}
            />
            {i < steps.length - 1 ? (
              <Connector delay={i * 0.5} lit={isLit(i + 1)} reduce={reduce} />
            ) : (
              <Fork delay={i * 0.5} reduce={reduce} />
            )}
          </li>
        ))}
        <li className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {outcomes.map((o, i) => (
            <Node
              icon={OUTCOME_ICONS[i] ?? Trophy}
              index={`${steps.length + 1}${String.fromCharCode(65 + i)}`}
              key={o.title}
              reduce={reduce}
              status="outcome"
              subtitle={o.subtitle}
              title={o.title}
            />
          ))}
        </li>
      </ol>
    </div>
  );
}
