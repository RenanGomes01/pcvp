"use client";

import { useLenis } from "lenis/react";
import { notifySheetClosed } from "@/lib/safari-chrome";
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
 * desalinhar elementos `position: fixed` (efeito colateral evitado aqui; a causa
 * do vazamento no topo é outra, ver `lib/safari-chrome.ts`).
 * Com `modal: "trap-focus"` o foco continua preso no painel,
 * e a página de trás não rola porque o painel ocupa a tela toda
 * (`touch-none` no cabeçalho/fundo, `overscroll-contain` na área rolável).
 * Assim, abrir e fechar não altera o documento.
 *
 * Retorna as props do <Sheet>: `modal` e `onOpenChangeComplete`, que avisa a
 * moldura quando o painel terminou de fechar (ver `lib/safari-chrome.ts`).
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

  return {
    modal: touch ? ("trap-focus" as const) : true,
    onOpenChangeComplete: (isOpen: boolean) => {
      if (!isOpen) notifySheetClosed();
    },
  };
}
