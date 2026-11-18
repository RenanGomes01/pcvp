"use client";

/**
 * ParticleText — "Gravity / Sand" Canvas Particle Text / Image
 *
 * Um único <canvas> (sem dependências) onde a palavra — ou uma IMAGEM (`src`,
 * ex.: a logo do time) — é desenhada por centenas de glifos minúsculos.
 * Com `src`, a imagem é rasterizada num canvas oculto e cada pixel opaco
 * (alpha > 128) da grade de amostragem vira uma partícula. O ponteiro age como uma faca: corta as partículas, que
 * herdam a inércia do movimento, quicam nas paredes, se amontoam no chão e,
 * depois de um tempo, flutuam de volta reconstruindo a palavra ("cura").
 *
 * Integridade estrutural (grafo):
 *  - Malha: cada partícula conhece suas vizinhas diretas (8-conexas na grade
 *    de amostragem: horizontais, verticais e diagonais).
 *  - Âncoras: as linhas do topo de cada peça conexa (cada letra, cada acento)
 *    são os pontos de sustentação.
 *  - No frame em que algo é cortado, uma BFS parte das âncoras ainda presas
 *    (idle/returning) e percorre a malha. Toda partícula presa que NÃO for
 *    alcançada ficou sem sustentação e cai — a ilha inteira, no mesmo instante.
 *    Basta 1 partícula conectando as partes para a estrutura se manter.
 *
 * Máquina de estados de cada partícula:
 *
 *   idle ──(corte | sem sustentação)──▶ falling ──(chão)──▶ resting ──(timer)──▶ returning ──(chegou)──▶ idle
 *                                          ▲                                         │
 *                                          └──────────(corte | sem sustentação)──────┘
 */

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export interface ParticleTextProps {
  /**
   * Texto principal. Use "\n" para forçar quebra de linha. Com `src`, vira só
   * o texto alternativo (leitores de tela) e o fallback se a imagem falhar.
   */
  text: string;
  /** Imagem com transparência (PNG/SVG) a ser desenhada em partículas no lugar do texto. */
  src?: string;
  /**
   * Linha de corte da imagem (fração da altura, 0–1). Tudo abaixo dela é
   * descartado, EXCETO traços que já vinham de cima cruzando a linha e seguem
   * afinando (ex.: a ponta da barriga do coelho). Remove o texto da logo sem
   * um crop retangular. Veja `isolateAboveCutoff`.
   */
  imageCutoff?: number;
  /** Classes do wrapper (defina altura e fundo aqui). */
  className?: string;
  /** Caracteres usados como partículas. */
  glyphs?: string;
  /** Cores dos glifos (sorteadas por partícula). */
  colors?: string[];
  /** Distância (px CSS) entre pontos amostrados. Menor = mais partículas. */
  gap?: number;
  /** Tamanho do glifo relativo ao `gap`. Padrão: 1.25. */
  glyphScale?: number;
  /** Limite de partículas (o `gap` cresce automaticamente se passar). */
  maxParticles?: number;
  /** Peso da fonte do texto-máscara. */
  fontWeight?: number | string;
  /** Família da fonte do texto-máscara. Padrão: a fonte herdada do wrapper. */
  fontFamily?: string;
  /** Largura da "lâmina": distância (px) do ponteiro que corta uma partícula. */
  cutRadius?: number;
  /** Fração da velocidade do ponteiro injetada na partícula cortada. */
  inertia?: number;
  /** Velocidade máxima de arremesso herdada do ponteiro (px/frame). */
  maxThrow?: number;
  /** Quantas linhas do topo de cada peça (letra/acento) são âncoras. */
  anchorRows?: number;
  /** Aceleração da gravidade (px/frame² a 60 fps). */
  gravity?: number;
  /** Velocidade máxima de queda (px/frame a 60 fps). */
  maxFallSpeed?: number;
  /** Atrito do ar aplicado a vx a cada frame (1 = sem atrito). */
  airFriction?: number;
  /** Energia mantida ao bater na parede lateral (vx *= -wallBounce). */
  wallBounce?: number;
  /** Tempo mínimo (ms) parada no chão antes de voltar. */
  restMin?: number;
  /** Tempo máximo (ms) parada no chão antes de voltar. */
  restMax?: number;
  /** Easing da flutuação de volta (x += (targetX - x) * returnEase). */
  returnEase?: number;
  /** Partículas começam espalhadas e flutuam até formar a palavra. */
  intro?: boolean;
}

type ParticleState = "idle" | "falling" | "resting" | "returning";

interface Particle {
  /** índice em `all` (nó do grafo) */
  id: number;
  state: ParticleState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  /** é ponto de sustentação da sua peça */
  isAnchor: boolean;
  /** coluna do chão onde está amontoada (-1 = nenhuma) */
  col: number;
  /** resting: sai do chão neste instante */
  restUntil: number;
  char: string;
}

const DEFAULT_GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789#$%&*+=?!<>/";
const DEFAULT_COLORS = ["#ffffff", "#e4e4e7", "#a1a1aa"];
const ARRIVE_DIST = 0.6; // px: perto o bastante do target para voltar a idle
const FRAME_MS = 1000 / 60;
// vizinhança 8-conexa na grade de amostragem (distância <= gap * √2)
const NEIGHBOR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], /* self */ [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

/** Calcula linhas e tamanho de fonte para caber no canvas. */
function layoutText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  font: (size: number) => string
) {
  const padX = w * 0.06;
  // espaço extra embaixo para o monte de letras não cobrir o texto
  const padTop = h * 0.08;
  const padBottom = h * 0.2;
  const availW = w - padX * 2;
  const availH = h - padTop - padBottom;
  const lineHeight = 1.05;

  const fit = (lines: string[]) => {
    ctx.font = font(100);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
    const byW = (availW / widest) * 100;
    const byH = availH / (lines.length * lineHeight);
    return Math.min(byW, byH);
  };

  const forced = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const candidates: string[][] = [forced];
  // no mobile, uma palavra por linha costuma ficar bem maior
  if (forced.length === 1 && forced[0].includes(" ")) candidates.push(forced[0].split(/\s+/));

  let best = { lines: forced, size: 0 };
  for (const lines of candidates) {
    const size = fit(lines);
    if (size > best.size * 1.15) best = { lines, size };
  }
  return { ...best, lineHeight, centerY: padTop + availH / 2 };
}

/**
 * Área útil da imagem: folga embaixo para o monte e um topo maior que o do
 * texto, para a logo não encostar no título sobreposto à seção.
 */
function contentBox(w: number, h: number) {
  const padX = w * 0.06;
  const padTop = Math.max(h * 0.16, 96);
  const padBottom = h * 0.2;
  return { x: padX, y: padTop, w: w - padX * 2, h: h - padTop - padBottom };
}

/** Carrega a imagem-máscara (null se falhar → cai para o texto). */
function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Recorta a imagem na linha `cutoff` preservando as "pontas" que a cruzam.
 *
 * Trabalha na resolução original da imagem, só com o canal alpha (> 128):
 *  1. Acima da linha, nada muda.
 *  2. Cada trecho opaco da última linha acima do corte vira uma semente.
 *  3. Cada semente desce linha a linha seguindo o trecho opaco mais
 *     sobreposto ao anterior, com três regras que separam a ponta das letras:
 *     - nunca alarga (algo encostado de lado, como o "C" de "Coelho", é aparado);
 *     - a borda esquerda só pode andar para a esquerda (a ponta desce em
 *       diagonal; quando volta, é o "o" de "Paulo" fazendo a curva → para);
 *     - some a sobreposição com a linha anterior → o traço terminou.
 *  4. Todo o resto abaixo da linha (o texto) fica transparente.
 */
function isolateAboveCutoff(img: HTMLImageElement, cutoff: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  if (!cx) return c;
  cx.drawImage(img, 0, 0);
  const cut = Math.max(1, Math.min(h, Math.round(h * cutoff)));
  if (cut >= h) return c;

  const id = cx.getImageData(0, 0, w, h);
  const px = id.data;
  const opaque = (x: number, y: number) => px[(y * w + x) * 4 + 3] > 128;
  /** trechos contínuos opacos da linha y entre lo e hi (inclusive) */
  const runsOf = (y: number, lo: number, hi: number) => {
    const out: [number, number][] = [];
    for (let x = Math.max(0, lo); x <= Math.min(w - 1, hi); x++) {
      if (!opaque(x, y)) continue;
      const s = x;
      while (x + 1 <= Math.min(w - 1, hi) && opaque(x + 1, y)) x++;
      out.push([s, x]);
    }
    return out;
  };

  const keep = new Uint8Array(w * (h - cut)); // 1 = preservar (linhas abaixo do corte)
  for (const seed of runsOf(cut - 1, 0, w - 1)) {
    let [L, R] = seed;
    let width = R - L + 1;
    let minL = L;
    for (let y = cut; y < h; y++) {
      const rs = runsOf(y, L - 2, R + 1);
      if (!rs.length) break;
      // trecho mais sobreposto ao anterior
      let best = rs[0];
      let bestOv = -Infinity;
      for (const r of rs) {
        const ov = Math.min(r[1], R) - Math.max(r[0], L);
        if (ov > bestOv) {
          bestOv = ov;
          best = r;
        }
      }
      const nl = best[0];
      if (nl > minL + 1) break; // voltou para a direita: virou outra forma
      const nr = Math.min(best[1], nl + width - 1); // nunca alarga
      for (let x = nl; x <= nr; x++) keep[(y - cut) * w + x] = 1;
      L = nl;
      R = nr;
      width = nr - nl + 1;
      minL = Math.min(minL, nl);
    }
  }

  for (let y = cut; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!keep[(y - cut) * w + x]) px[(y * w + x) * 4 + 3] = 0;
    }
  }
  cx.putImageData(id, 0, 0);
  return c;
}

/** Distância² do ponto (px,py) ao segmento (ax,ay)-(bx,by). */
function distToSegment2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + dx * t - px;
  const cy = ay + dy * t - py;
  return cx * cx + cy * cy;
}

const clamp = (v: number, lim: number) => (v > lim ? lim : v < -lim ? -lim : v);

/** Partícula que faz parte da estrutura (conduz sustentação). */
const isHeld = (p: Particle) => p.state === "idle" || p.state === "returning";

export default function ParticleText({
  text,
  src,
  imageCutoff,
  className,
  glyphs = DEFAULT_GLYPHS,
  colors = DEFAULT_COLORS,
  gap = 6,
  glyphScale = 1.25,
  maxParticles = 4500,
  fontWeight = 900,
  fontFamily,
  cutRadius = 14,
  inertia = 0.35,
  maxThrow = 22,
  anchorRows = 2,
  gravity = 0.45,
  maxFallSpeed = 16,
  airFriction = 0.985,
  wallBounce = 0.6,
  restMin = 1500,
  restMax = 3000,
  returnEase = 0.03,
  intro = true,
}: ParticleTextProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Props de física lidas ao vivo pelo loop (sem recriar partículas)
  const phys = {
    cutRadius,
    inertia,
    maxThrow,
    gravity,
    maxFallSpeed,
    airFriction,
    wallBounce,
    restMin,
    restMax,
    returnEase,
  };
  const physRef = useRef(phys);
  useEffect(() => {
    physRef.current = phys;
  });

  // `colors` costuma vir como literal de array; serializa para estabilizar deps
  const colorsKey = colors.join("|");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const palette = colorsKey.split("|");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ponteiro: posição atual + do frame anterior (segmento da lâmina) e velocidade suavizada
    const pointer = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, active: false, fresh: false };

    let W = 0;
    let H = 0;
    let step = 6;
    let glyphFont = "";
    let all: Particle[] = []; // nós do grafo (índice = id)
    let buckets: Particle[][] = []; // partículas agrupadas por cor (desenho)
    let pile = new Float32Array(0); // altura do monte por coluna do chão

    // Grafo em formato CSR: vizinhos de i = nbrList[nbrStart[i] .. nbrStart[i+1])
    let nbrStart = new Int32Array(1);
    let nbrList = new Int32Array(0);
    let anchors = new Int32Array(0);
    // buffers da BFS (reaproveitados; `visited` usa carimbo de geração para não limpar)
    let visited = new Uint32Array(0);
    let queue = new Int32Array(0);
    let stamp = 0;

    let mask: HTMLImageElement | HTMLCanvasElement | null = null; // imagem já recortada (modo `src`)
    let raf = 0;
    let last = 0;
    let visible = true;
    let firstBuild = true;
    // retângulo ocupado pelas letras (px CSS): toque aqui dentro corta em vez de rolar
    const textBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

    const randChar = () => glyphs[(Math.random() * glyphs.length) | 0] ?? "·";

    /* ---------- 1–3: texto -> pixels -> partículas + grafo ---------- */
    const build = () => {
      const rect = wrap.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // canvas offscreen na resolução CSS (amostragem não precisa de DPR)
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;

      if (mask) {
        // imagem: "contain" centralizado na área útil (só o alpha importa)
        const box = contentBox(W, H);
        const iw = mask.width;
        const ih = mask.height;
        const scale = Math.min(box.w / iw, box.h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        octx.drawImage(mask, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
      } else {
        const family = fontFamily ?? getComputedStyle(wrap).fontFamily;
        const font = (size: number) => `${fontWeight} ${size}px ${family}`;
        const { lines, size, lineHeight, centerY } = layoutText(octx, text.normalize("NFC"), W, H, font);

        octx.font = font(size);
        octx.fillStyle = "#fff";
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        const totalH = lines.length * size * lineHeight;
        lines.forEach((line, i) => {
          octx.fillText(line, W / 2, centerY - totalH / 2 + size * lineHeight * (i + 0.5));
        });
      }

      const data = octx.getImageData(0, 0, W, H).data;

      // ajusta o passo ao limite de partículas
      step = Math.max(2, Math.round(gap));
      const countAt = (s: number) => {
        let n = 0;
        for (let y = 0; y < H; y += s)
          for (let x = 0; x < W; x += s) if (data[(y * W + x) * 4 + 3] > 128) n++;
        return n;
      };
      while (countAt(step) > maxParticles) step++;

      pile = new Float32Array(Math.ceil(W / step) + 1);

      // grade de amostragem: cell[gy * gw + gx] = id da partícula (ou -1)
      const gw = Math.ceil(W / step);
      const gh = Math.ceil(H / step);
      const cell = new Int32Array(gw * gh).fill(-1);
      const gxOf: number[] = [];
      const gyOf: number[] = [];

      // ao re-medir (resize), partículas reaproveitam a posição atual e flutuam até o novo alvo
      const old = all;
      all = [];
      buckets = palette.map(() => []);
      const scatter = firstBuild && intro && !reducedMotion;
      for (let gy = 0; gy < gh; gy++) {
        const y = gy * step;
        for (let gx = 0; gx < gw; gx++) {
          const x = gx * step;
          if (data[(y * W + x) * 4 + 3] <= 128) continue;
          const id = all.length;
          // leve jitter visual para não parecer uma grade perfeita (o grafo usa a grade)
          const tx = x + (Math.random() - 0.5) * step * 0.6;
          const ty = y + (Math.random() - 0.5) * step * 0.6;
          const prev = old[id];
          const moving = prev ? true : scatter;
          const p: Particle = {
            id,
            state: moving ? "returning" : "idle",
            x: prev ? prev.x : scatter ? Math.random() * W : tx,
            y: prev ? prev.y : scatter ? Math.random() * H : ty,
            vx: 0,
            vy: 0,
            targetX: tx,
            targetY: ty,
            isAnchor: false,
            col: -1,
            restUntil: 0,
            char: randChar(),
          };
          all.push(p);
          gxOf.push(gx);
          gyOf.push(gy);
          cell[gy * gw + gx] = id;
          buckets[(Math.random() * palette.length) | 0].push(p);
        }
      }

      const n = all.length;

      // caixa das letras (com folga de um dedo) para decidir toque = corte ou rolagem
      textBox.x0 = textBox.y0 = Infinity;
      textBox.x1 = textBox.y1 = -Infinity;
      for (const p of all) {
        if (p.targetX < textBox.x0) textBox.x0 = p.targetX;
        if (p.targetX > textBox.x1) textBox.x1 = p.targetX;
        if (p.targetY < textBox.y0) textBox.y0 = p.targetY;
        if (p.targetY > textBox.y1) textBox.y1 = p.targetY;
      }
      const pad = 28;
      textBox.x0 -= pad;
      textBox.y0 -= pad;
      textBox.x1 += pad;
      textBox.y1 += pad;

      // 1) Malha de vizinhos (8-conexa) em CSR
      nbrStart = new Int32Array(n + 1);
      const tmp: number[] = [];
      for (let i = 0; i < n; i++) {
        nbrStart[i] = tmp.length;
        const gx = gxOf[i];
        const gy = gyOf[i];
        for (const [ox, oy] of NEIGHBOR_OFFSETS) {
          const nx = gx + ox;
          const ny = gy + oy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = cell[ny * gw + nx];
          if (j >= 0) tmp.push(j);
        }
      }
      nbrStart[n] = tmp.length;
      nbrList = Int32Array.from(tmp);

      // 2) Âncoras: as `anchorRows` linhas do topo de cada peça conexa.
      //    (por peça, para que letras mais baixas e acentos tenham sustentação própria)
      const comp = new Int32Array(n).fill(-1);
      const q = new Int32Array(n);
      const anchorList: number[] = [];
      for (let s = 0; s < n; s++) {
        if (comp[s] >= 0) continue;
        let head = 0;
        let tail = 0;
        q[tail++] = s;
        comp[s] = s;
        let minGy = gyOf[s];
        while (head < tail) {
          const i = q[head++];
          if (gyOf[i] < minGy) minGy = gyOf[i];
          for (let e = nbrStart[i]; e < nbrStart[i + 1]; e++) {
            const j = nbrList[e];
            if (comp[j] < 0) {
              comp[j] = s;
              q[tail++] = j;
            }
          }
        }
        const limit = minGy + Math.max(1, anchorRows) - 1;
        for (let t = 0; t < tail; t++) {
          const i = q[t];
          if (gyOf[i] <= limit) {
            all[i].isAnchor = true;
            anchorList.push(i);
          }
        }
      }
      anchors = Int32Array.from(anchorList);

      visited = new Uint32Array(n);
      queue = new Int32Array(n);
      stamp = 0;

      glyphFont = `500 ${Math.max(6, step * glyphScale).toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      firstBuild = false;
    };

    /* ---------- corte ---------- */

    /** Solta uma partícula com uma velocidade inicial. */
    const release = (p: Particle, vx: number, vy: number) => {
      p.state = "falling";
      p.col = -1;
      p.vx = vx;
      p.vy = vy;
      p.char = randChar();
    };

    /**
     * 3–4) Flood fill a partir das âncoras presas. Quem continua preso mas não
     * foi alcançado perdeu toda conexão com a sustentação: a ilha cai inteira.
     * Custo O(partículas + arestas); só roda em frames com corte.
     */
    const dropUnsupported = (throwX: number) => {
      stamp++;
      if (stamp === 0xffffffff) {
        visited.fill(0);
        stamp = 1;
      }
      let head = 0;
      let tail = 0;
      for (let a = 0; a < anchors.length; a++) {
        const i = anchors[a];
        if (isHeld(all[i]) && visited[i] !== stamp) {
          visited[i] = stamp;
          queue[tail++] = i;
        }
      }
      while (head < tail) {
        const i = queue[head++];
        for (let e = nbrStart[i]; e < nbrStart[i + 1]; e++) {
          const j = nbrList[e];
          if (visited[j] !== stamp && isHeld(all[j])) {
            visited[j] = stamp;
            queue[tail++] = j;
          }
        }
      }
      // ilhas: caem juntas (mesma velocidade inicial → despencam como um bloco
      // e se desfazem ao bater no chão), com um resquício da inércia do corte
      const islandVx = throwX * 0.25;
      for (let i = 0; i < all.length; i++) {
        const p = all[i];
        if (isHeld(p) && visited[i] !== stamp) {
          release(p, islandVx + (Math.random() - 0.5) * 0.4, 0);
        }
      }
    };

    /* ---------- máquina de estados + desenho ---------- */
    const frame = (now: number) => {
      // normaliza para 60 fps (física igual em telas 60/120 Hz)
      const k = Math.min((now - (last || now - FRAME_MS)) / FRAME_MS, 3);
      last = now;

      const P = physRef.current;
      const easeK = 1 - (1 - P.returnEase) ** k;
      const airK = P.airFriction ** k;

      // segmento da lâmina neste frame + velocidade do ponteiro (px/frame, suavizada)
      const cutting = pointer.active;
      const ax = pointer.fresh ? pointer.x : pointer.px;
      const ay = pointer.fresh ? pointer.y : pointer.py;
      const bx = pointer.x;
      const by = pointer.y;
      pointer.vx = pointer.vx * 0.4 + ((bx - ax) / k) * 0.6;
      pointer.vy = pointer.vy * 0.4 + ((by - ay) / k) * 0.6;
      pointer.px = bx;
      pointer.py = by;
      pointer.fresh = false;
      const throwX = clamp(pointer.vx * P.inertia, P.maxThrow);
      const throwY = clamp(pointer.vy * P.inertia, P.maxThrow);

      const R = P.cutRadius;
      const R2 = R * R;
      const minX = Math.min(ax, bx) - R;
      const maxX = Math.max(ax, bx) + R;
      const minY = Math.min(ay, by) - R;
      const maxY = Math.max(ay, by) + R;
      let cutThisFrame = false;

      const half = step * glyphScale * 0.5;
      const left = half;
      const right = W - half;

      ctx.clearRect(0, 0, W, H);
      ctx.font = glyphFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let b = 0; b < buckets.length; b++) {
        ctx.fillStyle = palette[b];
        const list = buckets[b];
        for (let i = 0; i < list.length; i++) {
          const p = list[i];

          // corte: idle ou returning tocada pela lâmina → falling com a inércia do ponteiro
          if (
            cutting &&
            (p.state === "idle" || p.state === "returning") &&
            p.x > minX && p.x < maxX && p.y > minY && p.y < maxY &&
            distToSegment2(p.x, p.y, ax, ay, bx, by) < R2
          ) {
            release(
              p,
              throwX * (0.7 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.8,
              throwY * (0.7 + Math.random() * 0.6)
            );
            cutThisFrame = true;
          }

          switch (p.state) {
            case "falling": {
              // cinética: gravidade em vy, atrito do ar em vx
              p.vy = Math.min(p.vy + P.gravity * k, P.maxFallSpeed);
              p.vx *= airK;
              p.x += p.vx * k;
              p.y += p.vy * k;

              // paredes laterais: quica perdendo energia
              if (p.x < left) {
                p.x = left;
                p.vx = -p.vx * P.wallBounce;
              } else if (p.x > right) {
                p.x = right;
                p.vx = -p.vx * P.wallBounce;
              }

              // chão: canvas.height menos a altura do monte daquela coluna
              const col = Math.min(pile.length - 1, Math.max(0, (p.x / step) | 0));
              const floor = H - half - pile[col];
              if (p.y >= floor) {
                p.y = floor;
                p.vx = 0;
                p.vy = 0;
                p.col = col;
                // cada glifo soma uma fração aleatória → monte irregular
                pile[col] += step * (0.35 + Math.random() * 0.5);
                p.restUntil = now + P.restMin + Math.random() * Math.max(0, P.restMax - P.restMin);
                p.state = "resting";
              }
              break;
            }

            case "resting": {
              if (now >= p.restUntil) {
                if (p.col >= 0) pile[p.col] = Math.max(0, pile[p.col] - step * 0.6);
                p.col = -1;
                p.state = "returning";
              }
              break;
            }

            case "returning": {
              // flutuação suave de volta à origem
              p.x += (p.targetX - p.x) * easeK;
              p.y += (p.targetY - p.y) * easeK;
              const dx = p.targetX - p.x;
              const dy = p.targetY - p.y;
              if (dx * dx + dy * dy < ARRIVE_DIST * ARRIVE_DIST) {
                p.x = p.targetX;
                p.y = p.targetY;
                p.state = "idle";
              }
              break;
            }
          }

          ctx.fillText(p.char, p.x, p.y);
        }
      }

      // 5) grafo só é verificado no frame em que houve corte
      if (cutThisFrame) dropUnsupported(throwX);

      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    /* ---------- ponteiro: mouse e caneta (Pointer Events) ---------- */
    const moveTo = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = clientX - r.left;
      pointer.y = clientY - r.top;
      if (!pointer.active) {
        // não corta (nem calcula velocidade) a partir de um ponto antigo
        pointer.fresh = true;
        pointer.vx = pointer.vy = 0;
      }
      pointer.active = true;
    };
    // o toque é tratado pelos Touch Events abaixo; aqui só mouse/caneta
    const setPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      moveTo(e.clientX, e.clientY);
    };
    const clearPointer = (e?: PointerEvent) => {
      if (e?.pointerType === "touch") return;
      pointer.active = false;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "pen") pointer.active = false;
    };
    canvas.addEventListener("pointermove", setPointer);
    canvas.addEventListener("pointerdown", setPointer);
    canvas.addEventListener("pointerleave", clearPointer);
    canvas.addEventListener("pointercancel", clearPointer);
    canvas.addEventListener("pointerup", onUp);

    /*
     * ---------- toque (Touch Events) ----------
     * O dedo corta como o mouse. Se o toque COMEÇA sobre as letras, o gesto é
     * todo de corte (preventDefault cancela a rolagem desse gesto, em qualquer
     * direção). Se começa fora delas, a página rola normalmente — assim a seção
     * alta nunca prende o usuário no celular.
     */
    let touchId: number | null = null;
    const findTouch = (list: TouchList) => {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === touchId) return list[i];
      return null;
    };
    const onTouchStart = (e: TouchEvent) => {
      if (touchId !== null) return;
      const t = e.changedTouches[0];
      const r = canvas.getBoundingClientRect();
      const x = t.clientX - r.left;
      const y = t.clientY - r.top;
      if (x < textBox.x0 || x > textBox.x1 || y < textBox.y0 || y > textBox.y1) return; // deixa rolar
      e.preventDefault();
      touchId = t.identifier;
      pointer.active = false; // começa um traço novo (sem riscar desde o último ponto)
      moveTo(t.clientX, t.clientY);
      start();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchId === null) return;
      const t = findTouch(e.changedTouches);
      if (!t) return;
      e.preventDefault();
      moveTo(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchId === null || !findTouch(e.changedTouches)) return;
      touchId = null;
      pointer.active = false;
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    /* ---------- responsivo ---------- */
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let lastSize = "";
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const key = `${Math.round(width)}x${Math.round(height)}`;
      if (key === lastSize) return;
      lastSize = key;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 120);
    });
    ro.observe(wrap);

    // pausa quando fora da tela
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
    });
    io.observe(wrap);

    // fontes web (texto) e a imagem (`src`) precisam estar prontas antes de rasterizar
    let cancelled = false;
    Promise.all([document.fonts.ready, src ? loadImage(src) : null]).then(([, img]) => {
      if (cancelled) return;
      mask = img ? (imageCutoff !== undefined ? isolateAboveCutoff(img, imageCutoff) : img) : null;
      build();
      start();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", setPointer);
      canvas.removeEventListener("pointerdown", setPointer);
      canvas.removeEventListener("pointerleave", clearPointer);
      canvas.removeEventListener("pointercancel", clearPointer);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [text, src, imageCutoff, glyphs, colorsKey, gap, glyphScale, maxParticles, fontWeight, fontFamily, intro, anchorRows]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-[60svh] min-h-72 w-full overflow-hidden bg-neutral-950", className)}
    >
      <span className="sr-only">{text}</span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        // pan-y: fora das letras a página rola; sobre elas os Touch Events assumem o gesto
        className="absolute inset-0 block cursor-crosshair touch-pan-y select-none [-webkit-touch-callout:none]"
      />
    </div>
  );
}
