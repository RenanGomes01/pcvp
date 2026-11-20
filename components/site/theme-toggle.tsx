"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Botão circular fixo no canto inferior direito que alterna claro/escuro. */
export default function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // o tema só é conhecido no cliente: até montar, mostra um botão neutro (sem divergência de hidratação)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Ativar modo claro" : "Ativar modo escuro";

  // barra do navegador acompanha a moldura (bezel): preta no claro, branca no escuro
  useEffect(() => {
    if (!mounted) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#ffffff" : "#0a0a0a"));
  }, [dark, mounted]);

  return (
    <motion.button
      aria-label={mounted ? label : "Alternar tema"}
      className={cn(
        "fixed right-[calc(1rem+env(safe-area-inset-right,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 grid size-11 place-items-center rounded-full bg-neutral-900 text-white shadow-lg ring-1 shadow-black/20 ring-white/15 backdrop-blur-md sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
        "focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
        className
      )}
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={mounted ? label : undefined}
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          key={dark ? "moon" : "sun"}
          transition={{ duration: 0.2 }}
        >
          {dark ? <Moon className="size-5" /> : <Sun className="size-5 text-brand" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
