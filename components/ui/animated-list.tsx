"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

type AnimatedListProps<T> = {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  /** Quantos cartões ficam montados ao mesmo tempo. */
  visible?: number;
  /** Intervalo (ms) entre um cartão novo e o próximo. */
  interval?: number;
  className?: string;
  label?: string;
};

/**
 * Feed contínuo: um cartão novo entra no topo com mola, empurrando os
 * anteriores para baixo; o mais antigo sai pela base. Pausa com o mouse em
 * cima, com foco dentro dele ou fora da tela. Com "reduzir movimento", vira
 * uma lista estática.
 */
export default function AnimatedList<T>({
  items,
  renderItem,
  visible = 5,
  interval = 2400,
  className,
  label,
}: AnimatedListProps<T>) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);
  // `tick` conta quantos cartões já entraram; a janela visível vem dele
  const [tick, setTick] = useState(Math.min(visible, items.length));

  const running = !reduce && !paused && inView && items.length > 1;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), interval);
    return () => window.clearInterval(id);
  }, [running, interval]);

  const count = Math.min(visible, items.length);
  // do mais novo (topo) para o mais antigo; a chave é o número de entrada, então
  // um atleta que volta no loop entra como cartão novo
  const window_ = Array.from({ length: count }, (_, k) => {
    const n = tick - 1 - k;
    return { key: n, item: items[((n % items.length) + items.length) % items.length] };
  });

  return (
    <ul
      aria-label={label}
      aria-live="off"
      className={cn("flex flex-col gap-2", className)}
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      ref={ref}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {window_.map(({ key, item }) => (
          <motion.li
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
            initial={reduce ? false : { opacity: 0, y: -24, scale: 0.92 }}
            key={key}
            layout={!reduce}
            transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
          >
            {renderItem(item)}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
