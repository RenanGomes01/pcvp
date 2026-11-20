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
 * no <html>/<body>. No Safari do iOS, alternar o overflow do <html> pode
 * desalinhar elementos `position: fixed`.
 * Com `modal: "trap-focus"` o foco continua preso no painel,
 * e a página de trás não rola porque o painel ocupa a tela toda
 * (`touch-none` no cabeçalho/fundo, `overscroll-contain` na área rolável).
 * Assim, abrir e fechar não altera o documento.
 *
 * Retorna as props do <Sheet>: `modal` e `onOpenChangeComplete`, que realinha
 * o visual viewport quando o painel termina de fechar (ver `realignViewport`).
 */
/**
 * Safari iOS: depois de abrir/fechar um painel fixo, o visual viewport pode
 * ficar deslocado do layout viewport (`visualViewport.offsetTop` ≠ 0). Os
 * elementos `position: fixed` (moldura, notch) continuam presos ao layout
 * viewport, então surge uma fresta no topo por onde a página aparece.
 * Um `scrollTo` para a posição atual obriga o WebKit a recalcular os dois
 * viewports; se ainda houver deslocamento, um "tranco" de 1px faz o mesmo.
 */
function realignViewport() {
  requestAnimationFrame(() => {
    const { scrollX, scrollY } = window;
    window.scrollTo(scrollX, scrollY);
    const vv = window.visualViewport;
    if (vv && Math.abs(vv.offsetTop) > 0.5 && vv.scale <= 1.01) {
      window.scrollTo(scrollX, scrollY + 1);
      window.scrollTo(scrollX, scrollY);
    }
  });
}

export function useSheetScrollLock(open: boolean) {
  const lenis = useLenis();
  const touch = useSyncExternalStore(subscribe, isTouch, () => false);

  useEffect(() => {
    if (!lenis || touch) return;
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [lenis, open, touch]);

  return {
    modal: touch ? ("trap-focus" as const) : true,
    onOpenChangeComplete: (isOpen: boolean) => {
      if (!isOpen) realignViewport();
    },
  };
}
