"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * `true` enquanto o elemento estiver dentro (ou a `margin` de distância) da viewport.
 *
 * Use para montar um <Canvas> WebGL só quando ele está perto da tela: ao
 * desmontar, o R3F descarta o renderer e chama `forceContextLoss()`, liberando
 * o contexto. O navegador só aceita ~16 contextos WebGL vivos por página, e
 * `frameloop="never"` pausa o render mas NÃO libera o contexto.
 */
export function useNearViewport(ref: RefObject<Element | null>, margin = "600px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}
