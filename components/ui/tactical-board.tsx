"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";

/**
 * Prancheta tática de vôlei de praia (SVG puro + motion).
 *
 * Quadra inteira vista de cima (16 m × 8 m, sem linha de ataque, como na
 * areia), dois atletas por lado e uma jogada em loop:
 *   saque → recepção → levantamento → ataque na diagonal.
 *
 * Tudo segue UMA linha do tempo de `LOOP` segundos: cada elemento recebe
 * keyframes com os mesmos instantes (`times`) e `repeat: Infinity`, então bola,
 * atletas, rastros e passos ficam sincronizados sem nenhum estado em JS.
 * Com "reduzir movimento", a prancheta mostra a jogada inteira parada.
 */

/* ------------------------------------------------------------------ escala */
// viewBox 1000 × 560 · quadra de x 100→900 e y 80→480 (50 unidades = 1 m)
const VB = { w: 1000, h: 560 };
const COURT = { x: 100, y: 80, w: 800, h: 400 };
const NET_X = COURT.x + COURT.w / 2;

const LOOP = 7; // segundos
const HOLD = 5; // instante usado no modo estático (jogada completa)

type Pt = readonly [number, number];
/** quadro de animação: [segundo, x, y] */
type Frame = readonly [number, number, number];

/* -------------------------------------------------------------- utilidades */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ponto de uma Bézier quadrática. */
const quad = (p0: Pt, c: Pt, p1: Pt, t: number): Pt => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t ** 2 * p1[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p1[1],
];

const pathOf = (p0: Pt, c: Pt, p1: Pt) =>
  `M${p0[0]},${p0[1]} Q${c[0]},${c[1]} ${p1[0]},${p1[1]}`;

/** Converte quadros em keyframes do motion (valores + `times` normalizados). */
function track(frames: readonly Frame[]) {
  return {
    x: frames.map((f) => f[1]),
    y: frames.map((f) => f[2]),
    times: frames.map((f) => f[0] / LOOP),
  };
}

/** Valor de uma trilha num instante (para o modo estático). */
function sample(frames: readonly Frame[], sec: number): Pt {
  if (sec <= frames[0][0]) return [frames[0][1], frames[0][2]];
  for (let i = 1; i < frames.length; i++) {
    const [t1, x1, y1] = frames[i];
    const [t0, x0, y0] = frames[i - 1];
    if (sec <= t1) {
      const k = t1 === t0 ? 1 : (sec - t0) / (t1 - t0);
      return [lerp(x0, x1, k), lerp(y0, y1, k)];
    }
  }
  const last = frames[frames.length - 1];
  return [last[1], last[2]];
}

/** Keyframes genéricos [segundo, valor] → { values, times }. */
function keys(frames: readonly (readonly [number, number])[]) {
  return {
    values: frames.map((f) => f[1]),
    times: frames.map((f) => f[0] / LOOP),
  };
}

/* ---------------------------------------------------------------- a jogada */
type Segment = {
  from: Pt;
  ctrl: Pt;
  to: Pt;
  t0: number;
  t1: number;
  lift: number;
  home: boolean;
};

// trajetória da bola (o "lift" deixa a bola maior no meio do arco = altura)
const SEGMENTS: Segment[] = [
  {
    from: [945, 385],
    ctrl: [640, 250],
    to: [282, 352],
    t0: 0.4,
    t1: 1.6,
    lift: 6,
    home: false,
  }, // saque
  {
    from: [282, 352],
    ctrl: [330, 220],
    to: [452, 262],
    t0: 1.6,
    t1: 2.4,
    lift: 7,
    home: true,
  }, // recepção
  {
    from: [452, 262],
    ctrl: [500, 290],
    to: [440, 334],
    t0: 2.4,
    t1: 3.1,
    lift: 6,
    home: true,
  }, // levantamento
  {
    from: [440, 334],
    ctrl: [650, 200],
    to: [858, 122],
    t0: 3.1,
    t1: 3.5,
    lift: 2,
    home: true,
  }, // ataque
];
const LANDING: Pt = SEGMENTS[SEGMENTS.length - 1].to;
const RESET = 6.2; // começa a "rebobinar"

// bola: amostra os arcos em quadros [t, x, y] + raio
const BALL_FRAMES: Frame[] = [];
const BALL_R: [number, number][] = [];
BALL_FRAMES.push([0, ...SEGMENTS[0].from]);
BALL_R.push([0, 9]);
for (const s of SEGMENTS) {
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const t = lerp(s.t0, s.t1, k);
    if (i === 0 && BALL_FRAMES[BALL_FRAMES.length - 1][0] === t) continue;
    BALL_FRAMES.push([t, ...quad(s.from, s.ctrl, s.to, k)]);
    BALL_R.push([t, 9 + Math.sin(Math.PI * k) * s.lift]);
  }
}
BALL_FRAMES.push(
  [RESET, ...LANDING],
  [RESET + 0.01, ...SEGMENTS[0].from],
  [LOOP, ...SEGMENTS[0].from],
);
BALL_R.push([RESET, 9], [RESET + 0.01, 9], [LOOP, 9]);

type Player = {
  id: string;
  label: string;
  home: boolean;
  frames: Frame[];
  arrow?: { t0: number; t1: number };
};

const PLAYERS: Player[] = [
  // PCVP (lado esquerdo)
  {
    id: "a1",
    label: "1",
    home: true,
    arrow: { t0: 2.3, t1: 3.0 },
    frames: [
      [0, 270, 362],
      [2.3, 270, 362],
      [3.0, 422, 346],
      [RESET, 422, 346],
      [LOOP, 270, 362],
    ],
  },
  {
    id: "a2",
    label: "2",
    home: true,
    arrow: { t0: 0.9, t1: 1.9 },
    frames: [
      [0, 250, 190],
      [0.9, 250, 190],
      [1.9, 455, 252],
      [RESET, 455, 252],
      [LOOP, 250, 190],
    ],
  },
  // adversário (lado direito)
  {
    id: "b1",
    label: "1",
    home: false,
    frames: [
      [0, 945, 385],
      [0.55, 945, 385],
      [1.4, 770, 360],
      [3.15, 770, 360],
      [3.6, 812, 196],
      [RESET, 812, 196],
      [LOOP, 945, 385],
    ],
  },
  {
    id: "b2",
    label: "2",
    home: false,
    arrow: { t0: 2.5, t1: 3.1 },
    frames: [
      [0, 720, 200],
      [2.5, 720, 200],
      [3.1, 528, 336],
      [RESET, 528, 336],
      [LOOP, 720, 200],
    ],
  },
];

/* ------------------------------------------------------------------ props */
export type TacticalBoardProps = {
  title: string;
  play: string;
  live?: string;
  legend: { home: string; away: string };
  steps: readonly { label: string; detail: string }[];
  className?: string;
};

export default function TacticalBoard({
  title,
  play,
  live,
  legend,
  steps,
  className,
}: TacticalBoardProps) {
  const reduce = useReducedMotion() ?? false;

  /** transição compartilhada por todos os elementos animados */
  const loop = (times: number[]) =>
    reduce
      ? { duration: 0 }
      : { duration: LOOP, times, repeat: Infinity, ease: "linear" as const };

  return (
    <div className={cn("text-left", className)}>
      {/* barra superior */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="hidden gap-1.5 sm:flex">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="truncate text-xs text-neutral-400">{play}</p>
          </div>
        </div>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand ring-1 ring-brand/25">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-75 motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-brand" />
            </span>
            {live}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* ------------------------------------------------------- quadra */}
        <div className="relative min-w-0 flex-1 p-3 sm:p-5">
          <svg
            aria-label={`${title}: ${steps.map((s) => s.label).join(", ")}`}
            className="block h-auto w-full"
            role="img"
            viewBox={`0 0 ${VB.w} ${VB.h}`}
          >
            <defs>
              <linearGradient id="tb-sand" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b3222" />
                <stop offset="55%" stopColor="#2c251a" />
                <stop offset="100%" stopColor="#221d15" />
              </linearGradient>
              <radialGradient cx="50%" cy="45%" id="tb-light" r="65%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.07" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              {/* granulado da areia */}
              <pattern
                height="14"
                id="tb-grain"
                patternUnits="userSpaceOnUse"
                width="14"
              >
                <circle cx="2" cy="3" fill="#fff" opacity="0.05" r="0.9" />
                <circle cx="9" cy="8" fill="#fff" opacity="0.04" r="0.7" />
                <circle cx="5" cy="12" fill="#000" opacity="0.12" r="0.8" />
                <circle cx="12" cy="1.5" fill="#000" opacity="0.1" r="0.6" />
              </pattern>
              <pattern
                height="40"
                id="tb-grid"
                patternUnits="userSpaceOnUse"
                width="40"
              >
                <path
                  d="M40 0H0V40"
                  fill="none"
                  stroke="#fff"
                  strokeOpacity="0.035"
                />
              </pattern>
              <filter height="200%" id="tb-glow" width="200%" x="-50%" y="-50%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* fundo da prancheta */}
            <rect fill="url(#tb-grid)" height={VB.h} width={VB.w} />

            {/* areia + linhas da quadra */}
            <g>
              <rect
                fill="url(#tb-sand)"
                height={COURT.h}
                rx="6"
                width={COURT.w}
                x={COURT.x}
                y={COURT.y}
              />
              <rect
                fill="url(#tb-grain)"
                height={COURT.h}
                width={COURT.w}
                x={COURT.x}
                y={COURT.y}
              />
              <rect
                fill="url(#tb-light)"
                height={COURT.h}
                width={COURT.w}
                x={COURT.x}
                y={COURT.y}
              />
              {/* linhas de fita da quadra */}
              <rect
                fill="none"
                height={COURT.h}
                stroke="#f5f5f4"
                strokeOpacity="0.85"
                strokeWidth="5"
                width={COURT.w}
                x={COURT.x}
                y={COURT.y}
              />
              {/* rede + postes */}
              <line
                stroke="#000"
                strokeOpacity="0.35"
                strokeWidth="12"
                x1={NET_X + 4}
                x2={NET_X + 4}
                y1={COURT.y - 30}
                y2={COURT.y + COURT.h + 30}
              />
              <line
                stroke="#fafafa"
                strokeDasharray="2 6"
                strokeLinecap="round"
                strokeWidth="6"
                x1={NET_X}
                x2={NET_X}
                y1={COURT.y - 30}
                y2={COURT.y + COURT.h + 30}
              />
              <circle cx={NET_X} cy={COURT.y - 34} fill="#d4d4d4" r="7" />
              <circle
                cx={NET_X}
                cy={COURT.y + COURT.h + 34}
                fill="#d4d4d4"
                r="7"
              />
            </g>

            {/* rótulos dos lados */}
            <text
              className="fill-brand text-[22px] font-semibold tracking-[0.2em]"
              x={COURT.x}
              y={COURT.y - 28}
            >
              {legend.home.toUpperCase()}
            </text>
            <text
              className="fill-neutral-400 text-[22px] font-semibold tracking-[0.2em]"
              textAnchor="end"
              x={COURT.x + COURT.w}
              y={COURT.y - 28}
            >
              {legend.away.toUpperCase()}
            </text>
            {/* medidas */}
            <text
              className="fill-neutral-500 font-mono text-[16px]"
              textAnchor="middle"
              x={NET_X}
              y={VB.h - 14}
            >
              16 m × 8 m
            </text>

            {/* setas de movimentação dos atletas */}
            {PLAYERS.filter((p) => p.arrow).map((p) => {
              const a = p.arrow!;
              const from = sample(p.frames, a.t0 - 0.001);
              const to = sample(p.frames, a.t1);
              // encurta a seta para não encostar no pino
              const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
              const k0 = 26 / len;
              const k1 = 1 - 30 / len;
              const p0: Pt = [
                lerp(from[0], to[0], k0),
                lerp(from[1], to[1], k0),
              ];
              const p1: Pt = [
                lerp(from[0], to[0], k1),
                lerp(from[1], to[1], k1),
              ];
              const draw = keys([
                [0, 0],
                [a.t0, 0],
                [a.t1, 1],
                [RESET, 1],
                [RESET + 0.4, 1],
                [LOOP, 0],
              ]);
              const fade = keys([
                [0, 0],
                [a.t0, 0],
                [a.t0 + 0.05, 0.9],
                [RESET, 0.9],
                [RESET + 0.4, 0],
                [LOOP, 0],
              ]);
              // a ponta só aparece quando o traço chega ao fim
              const tip = keys([
                [0, 0],
                [a.t1 - 0.06, 0],
                [a.t1, 1],
                [RESET, 1],
                [RESET + 0.4, 0],
                [LOOP, 0],
              ]);
              const angle =
                (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI;
              const color = p.home ? "var(--color-brand)" : "#e5e5e5";
              return (
                <g key={`arrow-${p.id}`}>
                  <motion.path
                    animate={
                      reduce
                        ? { pathLength: 1, opacity: 0.9 }
                        : { pathLength: draw.values, opacity: fade.values }
                    }
                    d={`M${p0[0]},${p0[1]} L${p1[0]},${p1[1]}`}
                    fill="none"
                    initial={{
                      pathLength: reduce ? 1 : 0,
                      opacity: reduce ? 0.9 : 0,
                    }}
                    stroke={color}
                    strokeLinecap="round"
                    strokeOpacity="0.85"
                    strokeWidth="3.5"
                    transition={loop(draw.times)}
                  />
                  <g
                    transform={`translate(${p1[0]} ${p1[1]}) rotate(${angle})`}
                  >
                    <motion.path
                      animate={
                        reduce ? { opacity: 1 } : { opacity: tip.values }
                      }
                      d="M-4,-8 L10,0 L-4,8 Z"
                      fill={color}
                      initial={{ opacity: reduce ? 1 : 0 }}
                      transition={loop(tip.times)}
                    />
                  </g>
                </g>
              );
            })}

            {/* rastros da bola (cada fundamento desenha o próprio arco) */}
            {SEGMENTS.map((s, i) => {
              const draw = keys([
                [0, 0],
                [s.t0, 0],
                [s.t1, 1],
                [RESET, 1],
                [LOOP, 1],
              ]);
              const fade = keys([
                [0, 0],
                [s.t0, 0],
                [s.t0 + 0.02, 1],
                [RESET, 1],
                [RESET + 0.5, 0],
                [LOOP, 0],
              ]);
              return (
                <motion.path
                  animate={
                    reduce
                      ? { pathLength: 1, opacity: 1 }
                      : { pathLength: draw.values, opacity: fade.values }
                  }
                  d={pathOf(s.from, s.ctrl, s.to)}
                  fill="none"
                  initial={{
                    pathLength: reduce ? 1 : 0,
                    opacity: reduce ? 1 : 0,
                  }}
                  key={`trail-${i}`}
                  stroke={s.home ? "var(--color-brand)" : "#fafafa"}
                  strokeLinecap="round"
                  strokeOpacity={s.home ? 0.9 : 0.55}
                  strokeWidth={i === SEGMENTS.length - 1 ? 5 : 3}
                  transition={loop(draw.times)}
                />
              );
            })}

            {/* impacto na areia */}
            {[0, 0.18].map((delay) => {
              const t0 = SEGMENTS[SEGMENTS.length - 1].t1 + delay;
              const r = keys([
                [0, 8],
                [t0, 8],
                [t0 + 0.8, 46],
                [LOOP, 46],
              ]);
              const o = keys([
                [0, 0],
                [t0, 0],
                [t0 + 0.02, 0.9],
                [t0 + 0.8, 0],
                [LOOP, 0],
              ]);
              return (
                <motion.circle
                  animate={
                    reduce
                      ? { r: 28, opacity: 0.5 }
                      : { r: r.values, opacity: o.values }
                  }
                  cx={LANDING[0]}
                  cy={LANDING[1]}
                  fill="none"
                  initial={{ r: 8, opacity: 0 }}
                  key={delay}
                  stroke="var(--color-brand)"
                  strokeWidth="3"
                  transition={loop(r.times)}
                />
              );
            })}
            {/* "X" do ponto */}
            {(() => {
              const t0 = SEGMENTS[SEGMENTS.length - 1].t1;
              const o = keys([
                [0, 0],
                [t0, 0],
                [t0 + 0.1, 1],
                [RESET, 1],
                [RESET + 0.4, 0],
                [LOOP, 0],
              ]);
              return (
                <motion.g
                  animate={reduce ? { opacity: 1 } : { opacity: o.values }}
                  initial={{ opacity: reduce ? 1 : 0 }}
                  stroke="var(--color-brand)"
                  strokeLinecap="round"
                  strokeWidth="4"
                  transition={loop(o.times)}
                >
                  <path
                    d={`M${LANDING[0] - 9},${LANDING[1] - 9} L${LANDING[0] + 9},${LANDING[1] + 9}`}
                  />
                  <path
                    d={`M${LANDING[0] + 9},${LANDING[1] - 9} L${LANDING[0] - 9},${LANDING[1] + 9}`}
                  />
                </motion.g>
              );
            })()}

            {/* atletas (pinos) */}
            {PLAYERS.map((p) => {
              const tr = track(p.frames);
              const still = sample(p.frames, HOLD);
              return (
                <motion.g
                  animate={
                    reduce ? { x: still[0], y: still[1] } : { x: tr.x, y: tr.y }
                  }
                  initial={{
                    x: reduce ? still[0] : tr.x[0],
                    y: reduce ? still[1] : tr.y[0],
                  }}
                  key={p.id}
                  transition={loop(tr.times)}
                >
                  <circle fill="#000" opacity="0.35" r="24" cx="3" cy="5" />
                  <circle
                    className={p.home ? "fill-brand" : "fill-neutral-100"}
                    r="22"
                    stroke={p.home ? "#3a1400" : "#404040"}
                    strokeWidth="3"
                  />
                  <text
                    className="fill-neutral-950 text-[20px] font-bold"
                    dominantBaseline="central"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                </motion.g>
              );
            })}

            {/* bola (sombra + brilho + bola) */}
            {(() => {
              const tr = track(BALL_FRAMES);
              const r = keys(BALL_R);
              const still = LANDING;
              return (
                <motion.g
                  animate={
                    reduce ? { x: still[0], y: still[1] } : { x: tr.x, y: tr.y }
                  }
                  initial={{
                    x: reduce ? still[0] : tr.x[0],
                    y: reduce ? still[1] : tr.y[0],
                  }}
                  transition={loop(tr.times)}
                >
                  <circle
                    fill="var(--color-brand)"
                    filter="url(#tb-glow)"
                    opacity="0.55"
                    r="16"
                  />
                  <motion.circle
                    animate={reduce ? { r: 9 } : { r: r.values }}
                    fill="#fde047"
                    initial={{ r: 9 }}
                    stroke="#1c1917"
                    strokeWidth="2.5"
                    transition={loop(r.times)}
                  />
                </motion.g>
              );
            })()}
          </svg>
        </div>

        {/* ------------------------------------------------------- passos */}
        <div className="flex flex-col justify-center gap-3 border-t border-white/5 p-3 sm:w-56 sm:shrink-0 sm:border-t-0 sm:border-l sm:p-5">
          <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-2">
            {steps.map((step, i) => {
              const s = SEGMENTS[i];
              const on = s
                ? keys([
                    [0, 0],
                    [s.t0, 0],
                    [s.t0 + 0.08, 1],
                    [s.t1, 1],
                    [s.t1 + 0.08, i === steps.length - 1 ? 1 : 0],
                    [RESET, i === steps.length - 1 ? 1 : 0],
                    [RESET + 0.3, 0],
                    [LOOP, 0],
                  ])
                : keys([
                    [0, 0],
                    [LOOP, 0],
                  ]);
              return (
                <li
                  className="relative overflow-hidden rounded-xl px-3 py-2 ring-1 ring-white/5"
                  key={step.label}
                >
                  <motion.span
                    animate={reduce ? { opacity: 0 } : { opacity: on.values }}
                    aria-hidden
                    className="absolute inset-0 bg-brand/10 ring-1 ring-brand/30 ring-inset"
                    initial={{ opacity: 0 }}
                    transition={loop(on.times)}
                  />
                  <p className="relative flex items-center gap-2 text-xs font-semibold text-white">
                    <span className="font-mono text-[10px] text-brand">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {step.label}
                  </p>
                  <p className="relative mt-0.5 hidden text-[11px] leading-snug text-neutral-400 sm:block">
                    {step.detail}
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="flex items-center gap-3 px-1 text-[11px] text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-brand" /> {legend.home}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-neutral-100" />{" "}
              {legend.away}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
