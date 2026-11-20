"use client";

import PassageGallery, { type PassageGalleryProps, type PassageItem } from "@/components/ui/passage-gallery";
import { useMemo, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Fisher–Yates com semente: mesma semente → mesma ordem. */
function shuffle<T>(list: T[], seed: number) {
  const out = list.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// sorteada uma vez por carregamento da página (estável entre re-renders)
let visitSeed = 0;
const getSeed = () => (visitSeed ||= (Math.random() * 2 ** 32) >>> 0 || 1);

/**
 * Túnel com as fotos em ordem aleatória a cada visita. No servidor (e na
 * hidratação) a ordem é a alfabética; só no cliente, depois de montar, a
 * semente aleatória entra — assim o HTML do servidor e do cliente batem.
 */
export default function ShuffledGallery({ items, ...props }: PassageGalleryProps & { items: PassageItem[] }) {
  const seed = useSyncExternalStore(noopSubscribe, getSeed, () => 0);
  const shuffled = useMemo(() => (seed ? shuffle(items, seed) : items), [items, seed]);
  return <PassageGallery items={shuffled} {...props} />;
}
