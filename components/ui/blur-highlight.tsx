"use client";

import { cn } from "@/lib/utils";
import { motion, useInView, useReducedMotion } from "motion/react";
import { type ElementType, Fragment, useMemo, useRef, useState } from "react";

type Segment = { text: string; highlight: boolean };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Divide o texto em trechos comuns e trechos destacados (na ordem em que aparecem). */
function splitSegments(text: string, highlights: readonly string[]): Segment[] {
  const phrases = highlights.filter(Boolean);
  if (phrases.length === 0) return [{ text, highlight: false }];
  // frases mais longas primeiro, para não casar um pedaço de outra frase
  const pattern = new RegExp(`(${[...phrases].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "g");
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, highlight: phrases.includes(part) }));
}

export type BlurHighlightProps = {
  /** Texto completo do parágrafo. */
  text: string;
  /** Frases (exatamente como aparecem em `text`) que ganham foco e destaque. */
  highlights: readonly string[];
  as?: ElementType;
  className?: string;
  /** Classes extras para as frases destacadas. */
  highlightClassName?: string;
  /** Opacidade do texto que fica em segundo plano (alta o bastante para leitura confortável). */
  dimOpacity?: number;
  /** Desfoque (px) do texto em segundo plano; some ao passar o mouse ou focar. */
  dimBlur?: number;
  /** Duração (s) da entrada do texto em segundo plano. */
  duration?: number;
  /** Intervalo (s) entre uma frase destacada e a próxima. */
  stagger?: number;
  /** Fração do parágrafo visível para disparar a animação. */
  amount?: number;
  /**
   * Controla de fora o modo 100% nítido (ex.: hover da seção inteira). Quando
   * omitido, o próprio parágrafo reage a mouse e foco.
   */
  active?: boolean;
};

/**
 * Desfoque de destaque: o parágrafo entra desfocado, assenta levemente atenuado
 * e as frases-chave ganham nitidez, cor plena e um marcador da marca, uma a uma.
 * Toca uma única vez (não reverte ao rolar para cima). Com o mouse sobre o
 * parágrafo (ou `active`), todo o texto fica 100% nítido e opaco.
 */
export default function BlurHighlight({
  text,
  highlights,
  as: Tag = "p",
  className,
  highlightClassName,
  dimOpacity = 0.75,
  dimBlur = 0.5,
  duration = 0.9,
  stagger = 0.45,
  amount = 0.5,
  active,
}: BlurHighlightProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount });
  const reduce = useReducedMotion() ?? false;
  const segments = useMemo(() => splitSegments(text, highlights), [text, highlights]);
  const controlled = active !== undefined;
  const [hovered, setHovered] = useState(false);
  const focused = controlled ? active : hovered;
  // depois da primeira interação, as trocas nítido ↔ atenuado são rápidas e sem cascata
  const [interacted, setInteracted] = useState(false);
  if (focused && !interacted) setInteracted(true);
  const state = !inView && !reduce ? "hidden" : focused ? "focus" : "visible";
  const quick = reduce ? { duration: 0 } : interacted ? { duration: 0.3, delay: 0, ease: "easeOut" as const } : null;
  const handlers = controlled
    ? {}
    : {
        onBlur: () => setHovered(false),
        onFocus: () => setHovered(true),
        onPointerEnter: () => setHovered(true),
        onPointerLeave: () => setHovered(false),
      };

  let wordIndex = 0;
  let phraseIndex = 0;

  return (
    <Tag className={className} ref={ref} {...handlers}>
      {segments.map((seg, s) => {
        const words = seg.text.split(/(\s+)/);

        if (!seg.highlight) {
          return (
            <Fragment key={s}>
              {words.map((w, i) => {
                if (!w || /^\s+$/.test(w)) return w;
                const delay = wordIndex++ * 0.018;
                return (
                  <motion.span
                    animate={state}
                    className="inline-block"
                    initial={reduce ? "visible" : "hidden"}
                    key={i}
                    transition={quick ?? { duration, delay, ease: [0.22, 1, 0.36, 1] }}
                    variants={{
                      hidden: { opacity: 0, filter: "blur(10px)" },
                      visible: { opacity: dimOpacity, filter: `blur(${dimBlur}px)` },
                      focus: { opacity: 1, filter: "blur(0px)" },
                    }}
                  >
                    {w}
                  </motion.span>
                );
              })}
            </Fragment>
          );
        }

        // frases destacadas entram depois do texto de fundo, uma após a outra
        const phraseDelay = duration * 0.6 + phraseIndex++ * stagger;
        return (
          <motion.span
            animate={state}
            className={cn(
              "rounded-[0.2em] bg-no-repeat [box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
              "bg-[linear-gradient(transparent_62%,color-mix(in_oklab,var(--color-brand)_32%,transparent)_62%)]",
              highlightClassName
            )}
            initial={reduce ? "visible" : "hidden"}
            key={s}
            transition={quick ?? { duration: 0.7, delay: phraseDelay + 0.25, ease: [0.65, 0, 0.35, 1] }}
            variants={{
              hidden: { backgroundSize: "0% 100%" },
              visible: { backgroundSize: "100% 100%" },
              focus: { backgroundSize: "100% 100%" },
            }}
          >
            {words.map((w, i) => {
              if (!w || /^\s+$/.test(w)) return w;
              return (
                <motion.span
                  animate={state}
                  className="inline-block"
                  initial={reduce ? "visible" : "hidden"}
                  key={i}
                  transition={quick ?? { duration: 0.6, delay: phraseDelay + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  variants={{
                    hidden: { opacity: 0, filter: "blur(10px)" },
                    visible: { opacity: 1, filter: "blur(0px)" },
                    focus: { opacity: 1, filter: "blur(0px)" },
                  }}
                >
                  {w}
                </motion.span>
              );
            })}
          </motion.span>
        );
      })}
    </Tag>
  );
}
