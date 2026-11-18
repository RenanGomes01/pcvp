"use client";

import type { ScheduleCategory, ScheduleSession } from "@/config/site";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Moon, Sunrise } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useMemo, useState, useSyncExternalStore } from "react";

/**
 * Grade de horários interativa (estilo painel esportivo).
 *
 * - Turnos (`shifts`): a grade só mostra as horas de cada turno (ex.: 9h–12h e
 *   15h–21h), com uma faixa de título entre eles; o intervalo vazio não aparece.
 * - Desktop (lg+): CSS Grid com uma coluna de horários + uma por dia. A
 *   resolução das linhas é calculada a partir das sessões (MDC dos minutos:
 *   15:40 e 19:30 → linhas de 10 min), então qualquer horário quebrado encaixa
 *   certinho. A altura de uma hora é sempre a mesma (`HOUR_REM`), não importa
 *   a resolução; treinos simultâneos (mesmo dia/início/fim) ficam lado a lado.
 * - Mobile: seletor de dia + lista do dia escolhido, separada por turno.
 * - Filtros por categoria: a escolhida fica em destaque e as outras esmaecem.
 * - Hover: brilho (glow) e borda na cor da categoria.
 */

/* Classes estáticas por categoria (o Tailwind precisa enxergar as strings inteiras). */
const TONES: Record<
  ScheduleCategory,
  { pill: string; dot: string; chip: string; chipActive: string }
> = {
  "feminino-alto": {
    pill: "bg-pink-500/15 text-pink-200 ring-pink-400/20 hover:ring-pink-400/60 hover:shadow-[0_0_28px_-6px] hover:shadow-pink-400/60",
    dot: "bg-pink-400",
    chip: "hover:text-pink-200",
    chipActive: "bg-pink-500/20 text-pink-200 ring-pink-400/40",
  },
  "masculino-alto": {
    pill: "bg-sky-500/15 text-sky-200 ring-sky-400/20 hover:ring-sky-400/60 hover:shadow-[0_0_28px_-6px] hover:shadow-sky-400/60",
    dot: "bg-sky-400",
    chip: "hover:text-sky-200",
    chipActive: "bg-sky-500/20 text-sky-200 ring-sky-400/40",
  },
  iniciante: {
    pill: "bg-amber-500/15 text-amber-200 ring-amber-400/20 hover:ring-amber-400/60 hover:shadow-[0_0_28px_-6px] hover:shadow-amber-400/60",
    dot: "bg-amber-400",
    chip: "hover:text-amber-200",
    chipActive: "bg-amber-500/20 text-amber-200 ring-amber-400/40",
  },
  intermediario: {
    pill: "bg-violet-500/15 text-violet-200 ring-violet-400/20 hover:ring-violet-400/60 hover:shadow-[0_0_28px_-6px] hover:shadow-violet-400/60",
    dot: "bg-violet-400",
    chip: "hover:text-violet-200",
    chipActive: "bg-violet-500/20 text-violet-200 ring-violet-400/40",
  },
  avancado: {
    pill: "bg-orange-500/15 text-orange-200 ring-orange-400/20 hover:ring-orange-400/60 hover:shadow-[0_0_28px_-6px] hover:shadow-orange-400/60",
    dot: "bg-orange-400",
    chip: "hover:text-orange-200",
    chipActive: "bg-orange-500/20 text-orange-200 ring-orange-400/40",
  },
};

type Category = {
  readonly id: ScheduleCategory;
  /** texto do filtro */
  readonly label: string;
  /** título do card (cai para `label`) */
  readonly title?: string;
  /** selo do card (nível / faixa etária) */
  readonly level?: string;
  /** outras turmas que este filtro também exibe */
  readonly includes?: readonly ScheduleCategory[];
};

/** Turno exibido na grade: horas inteiras de `start` até `end` (exclusivo). */
type Shift = { readonly label: string; readonly start: number; readonly end: number };

export type InteractiveScheduleProps = {
  days: readonly string[];
  shifts: readonly Shift[];
  categories: readonly Category[];
  sessions: readonly ScheduleSession[];
  className?: string;
};

const toHour = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h + (m || 0) / 60;
};
/** Altura de uma hora na grade (rem), independente da resolução das linhas. */
const HOUR_REM = 6.5;
const toMin = (hhmm: string) => Math.round(toHour(hhmm) * 60);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** Maior resolução (min) que divide todos os horários: 15:40 + 19:30 → 10 min. Mínimo de 5. */
const slotMinutesFor = (sessions: readonly ScheduleSession[]) =>
  Math.max(5, sessions.reduce((g, s) => gcd(gcd(g, toMin(s.start) % 60), toMin(s.end) % 60), 60));
const noopSubscribe = () => () => {};
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
/** Índice de hoje em `days` (comparando o nome do dia); 0 se hoje não tem coluna. */
const todayIndex = (days: readonly string[]) => {
  const name = WEEKDAYS[new Date().getDay()];
  const i = days.findIndex((d) => d.toLowerCase().startsWith(name));
  return i >= 0 ? i : 0;
};
const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

type Block = {
  key: string;
  day: number;
  start: string;
  end: string;
  row: number; // linha da grade (CSS) onde o bloco começa
  span: number; // em slots (linhas)
  minutes: number;
  items: ScheduleSession[];
};

export default function InteractiveSchedule({
  days,
  shifts,
  categories,
  sessions,
  className,
}: InteractiveScheduleProps) {
  const [filter, setFilter] = useState<ScheduleCategory | "all">("all");
  // no mobile, abre no dia de hoje; no SSR usa o primeiro dia, sem divergência de hidratação
  const today = useSyncExternalStore(noopSubscribe, () => todayIndex(days), () => 0);
  const [picked, setDay] = useState<number | null>(null);
  const day = picked ?? today;

  /*
   * Linhas da grade: linha 1 = cabeçalho dos dias; cada turno ganha uma faixa de
   * título e depois uma linha por slot. `rowOf[slot]` = linha CSS do slot.
   */
  const slotMin = useMemo(() => slotMinutesFor(sessions), [sessions]);
  const slotsPerHour = 60 / slotMin;
  const layout = useMemo(() => {
    const rows: ({ kind: "shift"; shift: Shift; i: number } | { kind: "slot"; hour: number; first: boolean })[] = [];
    const rowOf = new Map<number, number>();
    shifts.forEach((shift, i) => {
      rows.push({ kind: "shift", shift, i });
      for (let h = shift.start; h < shift.end; h++) {
        for (let k = 0; k < slotsPerHour; k++) {
          rows.push({ kind: "slot", hour: h, first: k === 0 });
          rowOf.set(h * slotsPerHour + k, rows.length + 1); // +1 por causa do cabeçalho
        }
      }
    });
    return { rows, rowOf };
  }, [shifts, slotsPerHour]);

  const catOf = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<ScheduleCategory, Category>, [categories]);

  /** O filtro `f` exibe a turma `c`? (a própria turma + as listadas em `includes`) */
  const matches = (f: ScheduleCategory, c: ScheduleCategory) => f === c || (catOf[f]?.includes?.includes(c) ?? false);

  const counts = useMemo(() => {
    const c: Partial<Record<ScheduleCategory, number>> = {};
    for (const cat of categories) {
      const shown = new Set([cat.id, ...(cat.includes ?? [])]);
      c[cat.id] = sessions.filter((s) => shown.has(s.category)).length;
    }
    return c;
  }, [categories, sessions]);

  // agrupa sessões simultâneas em blocos posicionados na grade
  const blocks = useMemo(() => {
    const map = new Map<string, Block>();
    for (const s of sessions) {
      const key = `${s.day}-${s.start}-${s.end}`;
      const row = layout.rowOf.get(Math.round(toMin(s.start) / slotMin));
      if (row === undefined) continue; // fora dos turnos configurados
      const minutes = toMin(s.end) - toMin(s.start);
      const span = Math.max(1, Math.round(minutes / slotMin));
      const b = map.get(key) ?? { key, day: s.day, start: s.start, end: s.end, row, span, minutes, items: [] };
      b.items.push(s);
      map.set(key, b);
    }
    return [...map.values()].sort((a, b) => a.day - b.day || a.row - b.row);
  }, [sessions, layout, slotMin]);

  const isDimmed = (c: ScheduleCategory) => filter !== "all" && !matches(filter, c);
  const isHighlighted = (c: ScheduleCategory) => filter !== "all" && matches(filter, c);

  return (
    <div className={cn("rounded-[1.75rem] bg-neutral-900/60 p-3 ring-1 ring-white/10 sm:p-5", className)}>
      {/* filtros */}
        <div aria-label="Filtrar por categoria" className="flex flex-wrap gap-2 pb-4" role="toolbar">
          <FilterChip active={filter === "all"} count={sessions.length} label="Todos" onClick={() => setFilter("all")} />
          {categories.map((c) => (
            <FilterChip
              active={filter === c.id}
              count={counts[c.id] ?? 0}
              dot={TONES[c.id].dot}
              hoverClass={TONES[c.id].chip}
              key={c.id}
              label={c.label}
              onClick={() => setFilter((f) => (f === c.id ? "all" : c.id))}
              toneActive={TONES[c.id].chipActive}
            />
          ))}
        </div>

      {/* ---------------------------------------------------------- desktop */}
      <div
        // sem gap vertical: o espaçamento fica nos próprios blocos, então a
        // altura da hora não cresce com a quantidade de linhas
        className="hidden gap-x-2 lg:grid"
        style={{
          gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))`,
          gridTemplateRows: [
            "auto",
            ...layout.rows.map((r) => (r.kind === "shift" ? "auto" : `minmax(${(HOUR_REM / slotsPerHour).toFixed(3)}rem, auto)`)),
          ].join(" "),
        }}
      >
        {/* cabeçalho */}
        <div />
        {days.map((d, i) => (
          <div
            className="mb-2 rounded-xl bg-white/[0.03] py-2.5 text-center text-xs font-medium tracking-widest text-neutral-400 uppercase ring-1 ring-white/5"
            key={d}
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {d}
          </div>
        ))}

        {/* faixas de turno, coluna de horários e células de fundo */}
        {layout.rows.map((r, idx) => {
          const gridRow = idx + 2;
          if (r.kind === "shift") {
            return (
              <ShiftLabel
                className={idx > 0 ? "mt-4 mb-2" : "mt-1 mb-2"}
                key={`shift-${r.shift.label}`}
                shift={r.shift}
                style={{ gridColumn: "1 / -1", gridRow }}
                variant={r.i}
              />
            );
          }
          // rótulo e células de fundo cobrem a hora inteira (3 slots)
          if (!r.first) return null;
          const hourRows = `${gridRow} / span ${slotsPerHour}`;
          return [
            <div
              className="flex items-start justify-end pt-2 pr-1 font-mono text-xs text-neutral-500"
              key={`h-${r.hour}`}
              style={{ gridColumn: 1, gridRow: hourRows }}
            >
              {pad(r.hour)}
            </div>,
            ...days.map((d, c) => (
              <div
                aria-hidden
                className="my-[3px] rounded-xl border border-dashed border-white/[0.05]"
                key={`${r.hour}-${d}`}
                style={{ gridColumn: c + 2, gridRow: hourRows }}
              />
            )),
          ];
        })}

        {/* blocos */}
        {blocks.map((b, i) => (
          <motion.div
            className="flex gap-2 py-[3px]"
            initial={{ opacity: 0, y: 10 }}
            key={b.key}
            style={{ gridColumn: b.day + 2, gridRow: `${b.row} / span ${b.span}` }}
            transition={{ duration: 0.45, delay: Math.min(i * 0.025, 0.4), ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-60px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            {b.items.map((s, j) => (
              <SessionPill
                compact={b.items.length > 1}
                dimmed={isDimmed(s.category)}
                highlighted={isHighlighted(s.category)}
                category={catOf[s.category]}
                key={j}
                session={s}
                short={b.minutes <= 40}
                tall={b.minutes > 60}
              />
            ))}
          </motion.div>
        ))}
      </div>

      {/* ----------------------------------------------------------- mobile */}
      <div className="lg:hidden">
        <div
          aria-label="Dia da semana"
          className="mb-3 grid gap-1 rounded-2xl bg-white/[0.03] p-1 ring-1 ring-white/5"
          role="tablist"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((d, i) => (
            <button
              aria-selected={day === i}
              className={cn(
                "relative rounded-xl py-2 text-xs font-medium transition-colors",
                day === i ? "text-neutral-950" : "text-neutral-400"
              )}
              key={d}
              onClick={() => setDay(i)}
              role="tab"
              type="button"
            >
              {day === i && (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-white"
                  layoutId="schedule-day"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{d.slice(0, 3)}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
            exit={{ opacity: 0, x: -12 }}
            initial={{ opacity: 0, x: 12 }}
            key={day}
            role="tabpanel"
            transition={{ duration: 0.2 }}
          >
            {shifts.map((shift, i) => {
              const items = blocks
                .filter((b) => b.day === day && toHour(b.start) >= shift.start && toHour(b.start) < shift.end)
                .flatMap((b) => b.items);
              if (!items.length) return null;
              return (
                <li className="space-y-2" key={shift.label}>
                  <ShiftLabel className={i > 0 ? "pt-2" : undefined} shift={shift} variant={i} />
                  <ul className="space-y-2">
                    {items.map((s, j) => (
                      <li className="flex" key={j}>
                        <SessionPill
                          category={catOf[s.category]}
                          dimmed={isDimmed(s.category)}
                          highlighted={isHighlighted(s.category)}
                          session={s}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>

      {/* rodapé */}
      <p className="mt-4 flex items-center gap-1.5 px-1 text-xs text-neutral-500">
        <Clock className="size-3.5 shrink-0" />
        {shifts.map((t) => `${pad(t.start)} – ${pad(t.end)}`).join(" · ")} · {days[0]?.toLowerCase()} a{" "}
        {days.at(-1)?.toLowerCase()} · horários sujeitos a alteração
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** Faixa de título de um turno (Manhã, Tarde / Noite…). */
function ShiftLabel({
  shift,
  variant,
  className,
  style,
}: {
  shift: Shift;
  variant: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = shift.start < 12 ? Sunrise : Moon;
  return (
    <div className={cn("flex items-center gap-3 px-1", className)} style={style}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-widest uppercase ring-1",
          variant % 2 === 0 ? "bg-amber-300/10 text-amber-200 ring-amber-300/20" : "bg-indigo-400/10 text-indigo-200 ring-indigo-400/20"
        )}
      >
        <Icon className="size-3.5" />
        {shift.label}
      </span>
      <span className="font-mono text-[11px] text-neutral-500">
        {pad(shift.start)} – {pad(shift.end)}
      </span>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

function SessionPill({
  session,
  category,
  dimmed,
  highlighted,
  compact,
  short,
  tall,
}: {
  session: ScheduleSession;
  category: Category;
  dimmed?: boolean;
  highlighted?: boolean;
  compact?: boolean;
  /** bloco curto (≤ 40 min na grade): padding e espaçamento menores */
  short?: boolean;
  tall?: boolean;
}) {
  const tone = TONES[session.category];
  return (
    <motion.article
      animate={{ opacity: dimmed ? 0.22 : 1, scale: highlighted ? 1.02 : 1 }}
      className={cn(
        "group/pill relative flex min-w-0 flex-1 cursor-default flex-col justify-between rounded-2xl ring-1 transition-[box-shadow,--tw-ring-color] duration-300",
        // lado a lado (compact): padding mínimo para o selo caber inteiro
        compact ? "gap-1 px-1.5 py-2" : short ? "gap-1 px-3 py-2" : "gap-2 p-3",
        tone.pill,
        highlighted && "ring-2",
        dimmed && "pointer-events-none saturate-0"
      )}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <div className="min-w-0">
        <p className={cn("leading-tight font-semibold", compact ? "text-xs" : "text-sm")}>
          {category.title ?? category.label}
        </p>
        {session.court && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-70">
            <MapPin className="size-3" />
            {session.court}
          </p>
        )}
      </div>
      <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", tall && "mt-auto")}>
        <span className={cn("font-mono opacity-80", compact ? "text-[10px] leading-tight tracking-tight" : "text-[11px]")}>
          {session.start}–{session.end}
        </span>
        {category.level && (
          <span
            className={cn(
              "max-w-full truncate rounded-full bg-white/10 font-medium uppercase",
              compact ? "px-1 py-0.5 text-[9px] leading-none tracking-tight" : "px-2 py-0.5 text-[10px] tracking-wide"
            )}
            title={category.level}
          >
            {category.level}
          </span>
        )}
      </div>
    </motion.article>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  dot,
  hoverClass,
  toneActive,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
  hoverClass?: string;
  toneActive?: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 transition-colors",
        active
          ? (toneActive ?? "bg-white text-neutral-950 ring-white")
          : cn("text-neutral-400 ring-white/10 hover:bg-white/5", hoverClass ?? "hover:text-white")
      )}
      onClick={onClick}
      type="button"
    >
      {dot && <span className={cn("size-2 rounded-full", dot)} />}
      {label}
      <span className="font-mono text-[10px] opacity-60">{count}</span>
    </button>
  );
}
