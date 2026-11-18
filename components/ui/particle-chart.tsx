"use client";

import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type ParticleChartColumn = { label: string; value: number };
export type ParticleChartTab = {
  id: string;
  label: string;
  /** Total em destaque (ex.: "144"). */
  total: string;
  /** Unidade do total (ex.: "Pódios"). */
  unit: string;
  /** Use o mesmo número de colunas em todas as abas: os tubos ficam fixos e a areia pula entre eles. */
  columns: readonly ParticleChartColumn[];
};

type ParticleChartProps = {
  tabs: readonly ParticleChartTab[];
  /** Cabeçalho à esquerda (ícone + título); o seletor de abas fica à direita. */
  header?: ReactNode;
  className?: string;
  /** Altura mínima dos tubos em px (eles crescem para preencher o card). */
  height?: number;
};

/** Tons de areia: laranja da marca → dourado. */
const SAND = ["#ff6600", "#ff7a1a", "#ff8f33", "#ffa31f", "#ffb703", "#f6c25b", "#e85d04"];

const GRAIN = 1.6; // raio (px CSS)
const STEP = 4.2; // distância entre grãos na pilha
const ROW = STEP * 0.88; // altura de cada camada (camadas desencontradas encaixam)
const PAD = 5; // folga entre a pilha e o vidro
const FILL = 0.9; // a maior coluna da aba ocupa 90% do tubo
const G = 0.25; // gravidade (px/quadro²)
const SPOUT = 40; // altura do bico de despejo acima da boca do tubo
const MOUTH = 6; // o grão só sai do tubo depois de passar esta folga acima da boca
const POUR_RATE = 5; // grãos liberados por quadro em cada bico
const OUT_RATE = 4; // grãos que decolam por quadro do topo de cada tubo doador
/**
 * Todo grão (de arco ou de despejo) cruza a boca do receptor com esta mesma
 * velocidade e só então reserva a vaga: quem chega antes à boca pousa antes,
 * então nenhum grão assenta sobre uma vaga ainda vazia.
 */
const V_IN = 2.2;

/**
 * Estados de um grão:
 *  rest  assentado na pilha (a posição na pilha é a vaga)
 *  in    caindo por dentro do tubo receptor até a sua vaga
 *  pour  caindo do bico em cone até a boca do tubo (entrada e faltas)
 *  rise  subindo por dentro do tubo doador até passar da boca
 *  arc   voando por cima de todos os tubos (Bézier acima das bocas)
 *  wait  aguardando a vez no bico de despejo (invisível)
 */
type Mode = "rest" | "in" | "pour" | "rise" | "arc" | "wait";

type Grain = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  mode: Mode;
  /** tubo de destino (-1 = sobra que vira poeira) */
  dest: number;
  color: string;
  alpha: number;
  // arco (Bézier quadrática): início, controle, fim
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  bx: number;
  by: number;
  // despejo balístico
  x0: number;
  y0: number;
  vy0: number;
  t: number;
  T: number;
  wait: number;
  /** boca do tubo de onde o grão está saindo */
  mouth: number;
  dead?: boolean;
};

/** Sobra: sai pela boca, sobe um pouco e se dissolve no ar. */
type Dust = { x: number; y: number; vx: number; vy: number; alpha: number; color: string };

type Tube = { left: number; top: number; width: number; height: number };

const cols = (tube: Tube) => Math.max(1, Math.floor((tube.width - PAD * 2 - GRAIN * 2 - STEP / 2) / STEP) + 1);

/** Vaga do grão `i`: camadas de baixo para cima, desencontradas, com leve irregularidade. */
function slot(tube: Tube, i: number, c: number) {
  const n = cols(tube);
  const row = Math.floor(i / n);
  const col = i % n;
  const seed = (i * 9301 + c * 49297 + 233) % 233280;
  const jitter = seed / 233280 - 0.5;
  return {
    x: tube.left + PAD + GRAIN + col * STEP + (row % 2 ? STEP / 2 : 0) + jitter * 0.6,
    y: tube.top + tube.height - PAD - GRAIN - row * ROW + jitter * 0.5,
  };
}

function capacity(tube: Tube) {
  const rows = Math.max(1, Math.floor((tube.height - PAD * 2) / ROW));
  return cols(tube) * rows;
}

/** X aleatório por dentro das paredes de um tubo. */
const insideX = (tube: Tube) => tube.left + PAD + GRAIN + Math.random() * Math.max(0, tube.width - 2 * (PAD + GRAIN));

let colorSeq = 0;
function newGrain(): Grain {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    mode: "rest",
    dest: -1,
    color: SAND[colorSeq++ % SAND.length],
    alpha: 0.78 + Math.random() * 0.22,
    ax: 0,
    ay: 0,
    cx: 0,
    cy: 0,
    bx: 0,
    by: 0,
    x0: 0,
    y0: 0,
    vy0: 0,
    t: 0,
    T: 1,
    wait: 0,
    mouth: 0,
  };
}

/**
 * Gráfico de colunas em que cada coluna é um tubo de vidro com areia, e os
 * tubos se comportam como recipientes sólidos:
 *  - Entrada: a areia cai de um bico acima de cada tubo, abre em cone e empilha.
 *  - Troca de aba: o tubo que diminui solta grãos estritamente do topo; cada
 *    grão sobe por dentro dele, passa da boca, faz um arco por cima de todos os
 *    tubos e cai por dentro do tubo que cresce. A vaga é reservada só quando o
 *    grão chega à boca do receptor, então a pilha nunca abre vãos.
 *  - O número de cada tubo acompanha, quadro a quadro, a areia assentada.
 */
export default function ParticleChart({ tabs, header, className, height = 180 }: ParticleChartProps) {
  const [tabId, setTabId] = useState(tabs[0]?.id);
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tubeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tubesRef = useRef<Tube[]>([]);
  /** pilhas por tubo, de baixo para cima (índice = vaga) */
  const pilesRef = useRef<Grain[][]>([]);
  /** grãos fora das pilhas: subindo, em arco ou esperando no bico */
  const airRef = useRef<Grain[]>([]);
  const dustRef = useRef<Dust[]>([]);
  /** quantos grãos ainda vão decolar do topo de cada tubo */
  const outRef = useRef<number[]>([]);
  /** destinos dos próximos grãos a decolar (fila) */
  const destRef = useRef<number[]>([]);
  /** grãos por unidade do valor exibido, por tubo (escala da aba atual) */
  const scaleRef = useRef<number[]>([]);
  /** número exibido em cada tubo (interpolado até a contagem real da areia) */
  const shownRef = useRef<number[]>([]);
  /** no próximo quadro, os números pulam direto para a contagem real (sem animação) */
  const snapLabelsRef = useRef(false);
  const rafRef = useRef(0);
  const inView = useInView(wrapRef, { once: true, amount: 0.4 });
  const reduce = useReducedMotion() ?? false;
  const uid = useId();

  /* ------------------------------ quadro a quadro ----------------------------- */

  const frameRef = useRef<() => void>(() => {});
  useEffect(() => {
    /** Na boca do tubo `c`: reserva a próxima vaga livre e o grão cai por dentro até ela. */
    const claim = (g: Grain, c: number) => {
      const tubes = tubesRef.current;
      const pile = (pilesRef.current[c] ??= []);
      const s = slot(tubes[c], pile.length, c);
      g.tx = s.x;
      g.ty = s.y;
      g.mode = "in";
      g.vy = V_IN;
      pile.push(g);
    };

    /** Despejo: queda balística exata do bico até um ponto da boca — o feixe abre em cone. */
    const startPour = (g: Grain) => {
      const to = tubesRef.current[g.dest];
      g.x0 = g.x;
      g.y0 = g.y;
      g.bx = insideX(to);
      g.by = to.top - MOUTH - 2;
      g.vy0 = 0.4;
      g.T = Math.max(1, (-g.vy0 + Math.sqrt(g.vy0 * g.vy0 + 2 * G * Math.max(0, g.by - g.y0))) / G);
      g.vx = (g.bx - g.x0) / g.T;
      g.t = 0;
      g.mode = "pour";
    };

    /** Arco aéreo: Bézier quadrática com início, controle e fim acima das bocas. */
    const planArc = (g: Grain) => {
      const tubes = tubesRef.current;
      const to = tubes[g.dest];
      const mouthY = Math.min(...tubes.map((t) => t.top)) - MOUTH;
      g.ax = g.x;
      g.ay = Math.min(g.y, mouthY);
      g.bx = insideX(to);
      g.by = to.top - MOUTH - 2;
      const dist = Math.abs(g.bx - g.ax);
      g.cx = (g.ax + g.bx) / 2;
      g.cy = Math.min(g.ay, g.by) - (28 + Math.min(44, dist * 0.12) + Math.random() * 10);
      g.t = 0;
      g.T = Math.round(20 + dist / 9);
      g.mode = "arc";
    };

    const toDust = (g: Grain) =>
      dustRef.current.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 3, vy: Math.min(g.vy, 0) * 0.5 - 1.5, alpha: g.alpha, color: g.color });

    frameRef.current = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      const tubes = tubesRef.current;
      const piles = pilesRef.current;
      const air = airRef.current;
      let moving = false;

      const dot = (x: number, y: number, color: string, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, GRAIN, 0, Math.PI * 2);
        ctx.fill();
      };

      // 1) decolagens: sempre do topo da pilha (camada superficial primeiro)
      outRef.current.forEach((n, c) => {
        if (n <= 0) return;
        moving = true;
        for (let k = 0; k < OUT_RATE && outRef.current[c] > 0; k++) {
          const g = piles[c]?.pop();
          if (!g) {
            outRef.current[c] = 0;
            break;
          }
          outRef.current[c]--;
          g.dest = destRef.current.length ? destRef.current.shift()! : -1;
          g.mode = "rise";
          g.vy = Math.min(g.vy, -1);
          g.mouth = tubes[c].top;
          air.push(g);
        }
      });

      // 2) grãos fora das pilhas
      for (let i = air.length - 1; i >= 0; i--) {
        const g = air[i];
        moving = true;
        if (g.mode === "wait") {
          if (--g.wait > 0) continue;
          startPour(g);
        }
        if (g.mode === "pour") {
          g.t++;
          if (g.t >= g.T) {
            // chegou à boca: entra no tubo como qualquer outro grão
            g.x = g.bx;
            g.y = g.by;
            air.splice(i, 1);
            claim(g, g.dest);
            continue;
          }
          g.x = g.x0 + g.vx * g.t;
          g.y = g.y0 + g.vy0 * g.t + 0.5 * G * g.t * g.t;
        } else if (g.mode === "rise") {
          // fase A: sobe na vertical por dentro do tubo doador
          g.vy = Math.max(g.vy - 0.6, -7);
          g.y += g.vy;
          if (g.y < g.mouth - MOUTH) {
            if (g.dest < 0 || !tubes[g.dest]) {
              air.splice(i, 1);
              toDust(g);
              continue;
            }
            planArc(g);
          }
        } else if (g.mode === "arc") {
          // fase B: arco por cima dos tubos (todos os pontos de controle acima das bocas)
          g.t++;
          const u = Math.min(1, g.t / g.T);
          const v = 1 - u;
          g.x = v * v * g.ax + 2 * v * u * g.cx + u * u * g.bx;
          g.y = v * v * g.ay + 2 * v * u * g.cy + u * u * g.by;
          if (u >= 1) {
            air.splice(i, 1);
            if (g.dest < 0 || !tubes[g.dest]) toDust(g);
            // fase C: alinhado sobre a boca do receptor, reserva a vaga e cai por dentro
            else claim(g, g.dest);
            continue;
          }
        }
        dot(g.x, g.y, g.color, g.alpha);
      }

      // 3) pilhas: quedas por dentro dos tubos, superfície e números
      const snapLabels = snapLabelsRef.current;
      snapLabelsRef.current = false;
      tubes.forEach((tube, c) => {
        const pile = piles[c] ?? [];
        let surface = tube.top + tube.height - PAD;
        let rested = 0;
        for (const g of pile) {
          if (g.mode === "in") {
            moving = true;
            g.vy += G * 1.6;
            g.y += g.vy;
            g.x += (g.tx - g.x) * 0.2;
            if (g.y >= g.ty) Object.assign(g, { x: g.tx, y: g.ty, vy: 0, mode: "rest" });
          }
          if (g.mode === "rest") {
            rested++;
            if (g.y - GRAIN < surface) surface = g.y - GRAIN;
          }
          dot(g.x, g.y, g.color, g.alpha);
        }

        // número: a posição segue a superfície da areia neste quadro; o valor
        // persegue a contagem real com lerp — na troca de aba a escala muda de
        // uma vez, mas o número parte do que estava na tela e desliza até ela
        const label = labelRefs.current[c];
        if (label) {
          const scale = scaleRef.current[c] || 1;
          const real = rested / scale;
          const prev = shownRef.current[c] ?? real;
          const diff = real - prev;
          const shown = snapLabels || Math.abs(diff) < 0.5 ? real : prev + diff * 0.14;
          shownRef.current[c] = shown;
          if (shown !== real) moving = true;
          const text = String(Math.round(shown));
          if (label.textContent !== text) label.textContent = text;
          label.style.transform = `translate(-50%, ${surface - 18}px)`;
          label.style.left = `${tube.left + tube.width / 2}px`;
        }
      });

      // 4) poeira das sobras
      const dust = dustRef.current;
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        moving = true;
        d.vy += 0.12;
        d.x += d.vx;
        d.y += d.vy;
        d.alpha -= 0.04;
        if (d.alpha <= 0) dust.splice(i, 1);
        else dot(d.x, d.y, d.color, d.alpha);
      }

      ctx.globalAlpha = 1;
      // para o loop quando tudo assentou (nada de 60fps à toa)
      rafRef.current = moving ? requestAnimationFrame(frameRef.current) : 0;
    };
  });

  const kick = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(() => frameRef.current());
  };

  /* --------------------------------- medidas -------------------------------- */

  const measure = () => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return [];
    const box = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;
    tubesRef.current = tab.columns.map((_, i) => {
      const r = tubeRefs.current[i]?.getBoundingClientRect();
      return r
        ? { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height }
        : { left: 0, top: 0, width: 0, height: 0 };
    });
    return tubesRef.current;
  };

  /* ------------------------------- reconciliação ------------------------------ */

  /** Ajusta a areia aos valores da aba atual. `snap` posiciona tudo sem animação. */
  const sync = (snap: boolean) => {
    const tubes = measure();
    const max = Math.max(...tab.columns.map((c) => c.value), 1);
    const targets = tubes.map((tube, c) => Math.round((tab.columns[c].value / max) * capacity(tube) * FILL));
    scaleRef.current = tubes.map((tube) => (capacity(tube) * FILL) / max);
    const piles = pilesRef.current;
    const air = airRef.current;

    if (snap) {
      // sem animação: cada tubo recebe exatamente a sua pilha, reaproveitando os grãos
      const pool = [...piles.flat(), ...air.filter((g) => g.mode !== "wait")];
      airRef.current = [];
      dustRef.current = [];
      outRef.current = [];
      destRef.current = [];
      snapLabelsRef.current = true;
      pilesRef.current = tubes.map((tube, c) =>
        Array.from({ length: targets[c] }, (_, i) => {
          const g = pool.pop() ?? newGrain();
          const s = slot(tube, i, c);
          return Object.assign(g, { x: s.x, y: s.y, tx: s.x, ty: s.y, vy: 0, mode: "rest" as const });
        })
      );
      kick();
      return;
    }

    // tubos que deixaram de existir: a areia vira poeira
    for (let c = tubes.length; c < piles.length; c++) {
      for (const g of piles[c]) dustRef.current.push({ x: g.x, y: g.y, vx: 0, vy: -2, alpha: g.alpha, color: g.color });
    }
    piles.length = Math.min(piles.length, tubes.length);

    // areia já a caminho de cada tubo (voando ou esperando no bico)
    const incoming: Grain[][] = tubes.map(() => []);
    for (const g of air) if (g.dest >= 0 && g.dest < tubes.length) incoming[g.dest].push(g);

    const released: Grain[] = [];
    const deficit: number[] = [];
    const out: number[] = [];
    tubes.forEach((_, c) => {
      let excess = (piles[c]?.length ?? 0) + incoming[c].length - targets[c];
      // primeiro desvia o que ainda vinha para cá; depois tira do topo da pilha
      while (excess > 0 && incoming[c].length) {
        const g = incoming[c].pop()!;
        excess--;
        if (g.mode === "wait") g.dead = true;
        else released.push(g);
      }
      out[c] = Math.max(0, excess);
      deficit[c] = Math.max(0, -excess);
    });
    airRef.current = air.filter((g) => !g.dead);

    // destinos intercalados entre os tubos que crescem (vários fluxos ao mesmo tempo)
    const dests: number[] = [];
    const left = deficit.slice();
    while (left.some((n) => n > 0)) left.forEach((n, c) => n > 0 && (dests.push(c), left[c]--));

    // grãos desviados em pleno voo: novo destino (ou viram poeira)
    for (const g of released) {
      g.dest = dests.length ? dests.shift()! : -1;
      // em arco ou despejo, o grão já está acima das bocas: só refaz o arco até o novo tubo
      if (g.mode === "arc" || g.mode === "pour") {
        if (g.dest < 0) {
          g.dead = true;
          dustRef.current.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 3, vy: -1.5, alpha: g.alpha, color: g.color });
        } else {
          g.mode = "arc";
          // replaneja o arco a partir de onde está (já acima das bocas)
          const to = tubes[g.dest];
          const dist = Math.abs(to.left - g.x);
          Object.assign(g, {
            ax: g.x,
            ay: g.y,
            bx: insideX(to),
            by: to.top - MOUTH - 2,
            t: 0,
            T: Math.round(16 + dist / 9),
          });
          g.cx = (g.ax + g.bx) / 2;
          g.cy = Math.min(g.ay, g.by) - 24;
        }
      }
    }
    airRef.current = airRef.current.filter((g) => !g.dead);

    // decolagens do topo dos tubos que diminuem
    const totalOut = out.reduce((a, b) => a + b, 0);
    outRef.current = out;
    destRef.current = dests.splice(0, totalOut);

    // o que ainda falta é despejado pelo bico, depois das transferências
    const transferring = totalOut + released.length > 0;
    const longestOut = Math.max(0, ...out.map((n) => n / OUT_RATE));
    const base = transferring ? Math.ceil(longestOut) + 70 : 0;
    const count: number[] = [];
    for (const c of dests) {
      const n = (count[c] = (count[c] ?? 0) + 1);
      const tube = tubes[c];
      const g = newGrain();
      g.x = tube.left + tube.width / 2 + (Math.random() - 0.5) * 2;
      g.y = tube.top - SPOUT - Math.random() * 4;
      g.mode = "wait";
      g.dest = c;
      g.wait = 1 + base + Math.floor(n / POUR_RATE) + (transferring ? 0 : c * 6);
      airRef.current.push(g);
    }

    kick();
  };

  const syncRef = useRef(sync);
  const measureRef = useRef(measure);
  useLayoutEffect(() => {
    syncRef.current = sync;
    measureRef.current = measure;
  });

  // antes da areia entrar, os números ficam no fundo dos tubos vazios
  useLayoutEffect(() => {
    measureRef.current();
    if (!rafRef.current) rafRef.current = requestAnimationFrame(() => frameRef.current());
  }, []);

  // primeira entrada na tela e cada troca de aba
  useLayoutEffect(() => {
    if (!inView && !reduce) return;
    syncRef.current(reduce);
  }, [tabId, inView, reduce]);

  // redimensionamento: reposiciona sem animação
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      if (pilesRef.current.some((p) => p.length) || airRef.current.length) syncRef.current(true);
      else measureRef.current();
      if (!rafRef.current) rafRef.current = requestAnimationFrame(() => frameRef.current());
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  /* ---------------------------------- UI ---------------------------------- */

  const panelId = `${uid}-panel`;
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        <div
          aria-label="Filtrar pódios"
          className="flex w-full gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/10 sm:w-auto"
          role="tablist"
        >
          {tabs.map((t) => {
            const selected = t.id === tab.id;
            return (
              <button
                aria-controls={panelId}
                aria-selected={selected}
                className={cn(
                  "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:flex-none sm:px-3 sm:text-xs",
                  selected ? "bg-brand text-on-brand" : "text-neutral-400 hover:text-white"
                )}
                key={t.id}
                onClick={() => setTabId(t.id)}
                role="tab"
                type="button"
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col" id={panelId} role="tabpanel">
        <p className="flex items-baseline gap-2">
          <span className="text-5xl font-semibold tracking-tight text-white tabular-nums">{tab.total}</span>
          <span className="text-sm font-medium text-brand">{tab.unit}</span>
        </p>

        {/* espaço no topo para o bico de despejo e os arcos entre tubos */}
        {/* cresce com flex-1: os tubos esticam até a base do card vizinho */}
        <div className="relative mt-2 flex flex-1 flex-col pt-14" ref={wrapRef}>
          {/* tubos fixos (chave = posição): só rótulo e valor mudam entre abas */}
          <ul className="flex flex-1 gap-2 sm:gap-4">
            {tab.columns.map((col, i) => (
              <li className="flex min-w-0 flex-1 flex-col items-center gap-2" key={i}>
                <div
                  className="relative w-full max-w-16 flex-1 overflow-hidden rounded-t-md rounded-b-2xl bg-neutral-950/50 ring-1 ring-white/15"
                  ref={(el) => {
                    tubeRefs.current[i] = el;
                  }}
                  style={{ minHeight: height }}
                >
                  {/* textura pontilhada do vidro + reflexo lateral */}
                  <span className="absolute inset-0 bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-white)_14%,transparent)_0.75px,transparent_1.25px)] bg-[length:6px_6px]" />
                  <span className="absolute inset-y-2 left-1.5 w-1 rounded-full bg-gradient-to-b from-white/25 to-transparent" />
                </div>
                <span
                  className="w-full truncate text-center text-[10px] leading-tight text-neutral-400 sm:text-xs"
                  title={col.label}
                >
                  {col.label}
                </span>
              </li>
            ))}
          </ul>
          <canvas aria-hidden className="pointer-events-none absolute inset-0" ref={canvasRef} />
          {/* números: valor e posição escritos quadro a quadro a partir da areia assentada */}
          {tab.columns.map((_, i) => (
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 text-xs font-semibold text-white tabular-nums"
              key={i}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
            />
          ))}
        </div>

        {/* leitura para leitores de tela */}
        <table className="sr-only">
          <caption>
            {tab.label}: {tab.total} {tab.unit}
          </caption>
          <tbody>
            {tab.columns.map((c) => (
              <tr key={c.label}>
                <th scope="row">{c.label}</th>
                <td>{c.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
