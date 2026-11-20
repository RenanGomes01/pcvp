"use client";

/**
 * HoverPreview — texto com termos que mostram uma foto ao passar o mouse.
 *
 * API no estilo do "Hover Preview" do React Bits (implementação própria):
 * `content` é o texto com marcadores `{0}`, `{1}`… e `targets[i]` define o
 * termo que entra no lugar de `{i}` e a imagem exibida (rotação, deslocamento
 * em relação ao cursor, largura, borda arredondada e sombra).
 *
 * - Só liga em dispositivos com mouse (`hover: hover` + `pointer: fine`). No
 *   toque o termo aparece só com o sublinhado, sem pré-visualização.
 * - A foto vai num portal com `position: fixed` e `pointer-events: none`,
 *   presa ao viewport: não cria rolagem horizontal nem é cortada pelo
 *   `overflow-hidden` do card. A posição é limitada às bordas da janela.
 * - Some ao sair do termo, ao rolar a página ou ao perder o foco da janela.
 */

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { Fragment, type PointerEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type HoverPreviewTarget = {
  /** Termo exibido no texto no lugar do marcador `{i}`. */
  text: string;
  /** Caminho/URL da imagem (ex.: "/gallery/lippe.png"). */
  image: string;
  alt?: string;
  /** Largura da foto em px (a altura segue a proporção). Padrão: 220. */
  width?: number;
  /** Rotação em graus. Padrão: -4. */
  rotate?: number;
  /** Deslocamento em px em relação ao cursor. Padrão: 24 / -24 (direita, acima). */
  offsetX?: number;
  offsetY?: number;
  /** Raio da borda em px. Padrão: 16. */
  radius?: number;
  /** `box-shadow` da foto. */
  shadow?: string;
};

type HoverPreviewProps = {
  content: string;
  targets: readonly HoverPreviewTarget[];
  className?: string;
  /** Classes extras para os termos com pré-visualização. */
  targetClassName?: string;
};

const MOUSE_QUERY = "(hover: hover) and (pointer: fine)";
const DEFAULTS = { width: 220, rotate: -4, offsetX: 24, offsetY: -24, radius: 16, shadow: "0 24px 60px -12px rgb(0 0 0 / 0.55)" };
const EDGE = 12;

function subscribeMouse(onChange: () => void) {
  const mq = window.matchMedia(MOUSE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const hasMouse = () => window.matchMedia(MOUSE_QUERY).matches;

/** "a {0} b {1}" → ["a ", 0, " b ", 1] */
function parse(content: string): (string | number)[] {
  return content
    .split(/(\{\d+\})/)
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^\{(\d+)\}$/);
      return m ? Number(m[1]) : part;
    });
}

export default function HoverPreview({ content, targets, className, targetClassName }: HoverPreviewProps) {
  const enabled = useSyncExternalStore(subscribeMouse, hasMouse, () => false);
  const parts = useMemo(() => parse(content), [content]);
  const [active, setActive] = useState<number | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // posição do canto superior esquerdo da foto (mola suave atrás do cursor)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 450, damping: 38, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 450, damping: 38, mass: 0.6 });

  const target = active !== null ? targets[active] : undefined;
  const cfg = { ...DEFAULTS, ...target };

  // pré-carrega as fotos (aparecem sem atraso no primeiro hover)
  useEffect(() => {
    if (!enabled) return;
    targets.forEach((t) => {
      const img = new Image();
      img.src = t.image;
    });
  }, [enabled, targets]);

  // rolar ou trocar de janela esconde a foto (o cursor deixa de estar "sobre" o termo)
  useEffect(() => {
    if (active === null) return;
    const hide = () => setActive(null);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("blur", hide);
    };
  }, [active]);

  const place = (e: PointerEvent, t: HoverPreviewTarget, jump: boolean) => {
    const c = { ...DEFAULTS, ...t };
    const h = size?.w === c.width ? size.h : c.width * 1.25;
    const nx = Math.min(Math.max(e.clientX + c.offsetX, EDGE), window.innerWidth - c.width - EDGE);
    // acima do cursor por padrão; se não couber, vai para baixo
    let ny = e.clientY + c.offsetY - h;
    if (ny < EDGE) ny = Math.min(e.clientY - c.offsetY, window.innerHeight - h - EDGE);
    x.set(nx);
    y.set(ny);
    if (jump) {
      sx.jump(nx);
      sy.jump(ny);
    }
  };

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (typeof part === "string") return <Fragment key={i}>{part}</Fragment>;
        const t = targets[part];
        if (!t) return <Fragment key={i}>{`{${part}}`}</Fragment>;
        return (
          <span
            className={cn(
              "font-medium text-neutral-200 underline decoration-brand/50 decoration-dotted decoration-2 underline-offset-4 transition-colors",
              enabled && "cursor-default hover:text-white hover:decoration-brand",
              targetClassName
            )}
            key={i}
            onPointerEnter={
              enabled
                ? (e) => {
                    if (e.pointerType !== "mouse") return;
                    place(e, t, true);
                    setActive(part);
                  }
                : undefined
            }
            onPointerLeave={enabled ? () => setActive(null) : undefined}
            onPointerMove={enabled ? (e) => e.pointerType === "mouse" && place(e, t, false) : undefined}
          >
            {t.text}
          </span>
        );
      })}

      {enabled &&
        createPortal(
          <AnimatePresence>
            {target && (
              <motion.div
                animate={{ opacity: 1, scale: 1, rotate: cfg.rotate }}
                aria-hidden
                className="pointer-events-none fixed top-0 left-0 z-50 overflow-hidden"
                exit={{ opacity: 0, scale: 0.85, rotate: 0 }}
                initial={{ opacity: 0, scale: 0.85, rotate: 0 }}
                key={target.image}
                style={{ x: sx, y: sy, width: cfg.width, borderRadius: cfg.radius, boxShadow: cfg.shadow }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={target.alt ?? ""}
                  className="block h-auto w-full"
                  onLoad={(e) => setSize({ w: cfg.width, h: (cfg.width * e.currentTarget.naturalHeight) / e.currentTarget.naturalWidth })}
                  src={target.image}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </span>
  );
}
