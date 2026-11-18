"use client";

import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Scroll suave global (Lenis).
 * - `anchors`: links "#secao" rolam suavemente, compensando a navbar fixa.
 * - Respeita prefers-reduced-motion (desliga a suavização).
 * - No touch o Lenis mantém o scroll nativo (syncTouch desligado).
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp: 0.1, anchors: { offset: -96 } }}>
      {children}
    </ReactLenis>
  );
}
