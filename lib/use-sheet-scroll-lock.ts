"use client";

import { useLenis } from "lenis/react";
import { useEffect, useSyncExternalStore } from "react";

const TOUCH_QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(TOUCH_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const isTouch = () => window.matchMedia(TOUCH_QUERY).matches;

/**
 * Trava de scroll dos painéis laterais (atleta, treinador).
 *
 * Mouse/trackpad: pausa o Lenis e deixa o Base UI travar o scroll da página
 * (`modal: true`), como antes.
 *
 * Toque (iPhone/iPad): NÃO mexe no <html> nem no <body>. O Lenis põe
 * `overflow: clip` no <html> ao parar, e o Base UI põe `overflow: hidden`
 * no <html>/<body>. No Safari do iOS, alternar o overflow do <html> desalinha
 * os elementos `position: fixed`: a faixa da moldura que cobre a Ilha Dinâmica
 * deixava de acompanhar a rolagem e o conteúdo vazava por cima do topo depois de
 * fechar o painel. Com `modal: "trap-focus"` o foco continua preso no painel,
 * e a página de trás não rola porque o painel ocupa a tela toda
 * (`touch-none` no cabeçalho/fundo, `overscroll-contain` na área rolável).
 * Assim, abrir e fechar não altera o documento: o topo volta exatamente ao
 * estado do carregamento.
 */
export function useSheetScrollLock(open: boolean) {
  const lenis = useLenis();
  const touch = useSyncExternalStore(subscribe, isTouch, () => false);

  useEffect(() => {
    if (!lenis || touch) return;
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [lenis, open, touch]);

  return touch ? ("trap-focus" as const) : true;
}
