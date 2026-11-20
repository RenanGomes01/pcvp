"use client";

import { siteConfig } from "@/config/site";
import { cn, externalLinkProps } from "@/lib/utils";
import { ArrowDownRight, ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import Image from "next/image";
import { type PointerEvent, useState } from "react";

/**
 * Moldura fixa da tela ("bezel"): uma borda na cor invertida ao tema, com
 * cantos internos bem arredondados. Todo o site rola "dentro" dela, como
 * numa tela de celular. Os recuos somam as safe areas do iOS, então a moldura
 * contorna a Ilha Dinâmica e a barra de gestos.
 *
 * Faixas de topo e base = o elemento que o Safari 26 do iOS amostra para pintar
 * a área da Ilha Dinâmica e da barra de gestos (ver `lib/safari-chrome.ts`).
 * Para a amostragem nunca mudar de dono, elas são:
 * - de largura total, opacas, sem backdrop-filter;
 * - ACIMA dos painéis (z-60 > z-50 do Sheet/fundo escurecido): o painel aberto
 *   nunca ocupa o ponto amostrado (centro da borda), então a cor não troca ao
 *   abrir/fechar. O painel já começa abaixo delas (padding de safe-area);
 * - clicáveis (sem `pointer-events: none`): o Safari faz um 2º teste que
 *   respeita pointer-events, e uma faixa "transparente ao toque" seria pulada.
 */
export function ScreenFrame() {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-[calc(0.375rem+env(safe-area-inset-top,0px))] bg-bezel sm:h-[calc(0.5rem+env(safe-area-inset-top,0px))]"
        data-edge-strip="top"
      />
      <div
        aria-hidden
        className="fixed inset-x-0 bottom-0 z-[60] h-[calc(0.375rem+env(safe-area-inset-bottom,0px))] bg-bezel sm:h-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        data-edge-strip="bottom"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[calc(0.375rem+env(safe-area-inset-top,0px))] right-[calc(0.375rem+env(safe-area-inset-right,0px))] bottom-[calc(0.375rem+env(safe-area-inset-bottom,0px))] left-[calc(0.375rem+env(safe-area-inset-left,0px))] z-40 rounded-[1.75rem] shadow-[0_0_0_100vmax_var(--color-bezel)] sm:top-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:right-[calc(0.5rem+env(safe-area-inset-right,0px))] sm:bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:left-[calc(0.5rem+env(safe-area-inset-left,0px))] sm:rounded-[2.5rem]"
      />
    </>
  );
}

/** Curva côncava que liga o notch à borda superior da moldura. */
function NotchEar({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-[calc(0.375rem+env(safe-area-inset-top,0px))] size-7 sm:top-[calc(0.5rem+env(safe-area-inset-top,0px))]",
        side === "left"
          ? "-left-7 [background:radial-gradient(circle_at_0_100%,transparent_27.5px,var(--color-bezel)_28px)]"
          : "-right-7 [background:radial-gradient(circle_at_100%_100%,transparent_27.5px,var(--color-bezel)_28px)]"
      )}
    />
  );
}

/**
 * Navbar "notch" (Dynamic Island): bloco preso ao topo central, com
 * cantos inferiores arredondados e curvas côncavas nas laterais, de modo que
 * o conteúdo parece contornar a barra.
 *
 * Contraste invertido: o notch e a moldura usam `--color-bezel` (preto no
 * tema claro, branco no escuro) e `.theme-inverted` troca a paleta dos textos,
 * links, dropdown e botão para o tema oposto.
 */
export default function Navbar() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { nav } = siteConfig;

  return (
    <motion.header
      animate={{ opacity: 1 }}
      // centralizado por margens (sem translate) e entrada só por opacidade: nenhum
      // `transform` num elemento fixo encostado na barra de status do Safari iOS
      className="theme-inverted fixed inset-x-0 top-0 z-50 mx-auto w-[calc(100%-5rem)] max-w-5xl"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative rounded-b-[1.75rem] bg-bezel pt-[calc(0.375rem+env(safe-area-inset-top,0px))] text-white sm:rounded-b-[2rem] sm:pt-[calc(0.5rem+env(safe-area-inset-top,0px))]">
        <NotchEar side="left" />
        <NotchEar side="right" />

        <nav
          aria-label="Principal"
          className="flex h-14 items-center justify-between pr-2 pl-5 sm:h-[68px] sm:pr-3 sm:pl-7"
          onMouseLeave={() => setOpenGroup(null)}
        >
          <MagneticLogo />

          {/* links centrais (desktop) */}
          <ul className="hidden items-center gap-1 lg:flex">
            {nav.groups.map((group) => (
              <li className="relative" key={group.label} onMouseEnter={() => setOpenGroup(group.label)}>
                <button
                  aria-expanded={openGroup === group.label}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors hover:text-white"
                  onClick={() => setOpenGroup((g) => (g === group.label ? null : group.label))}
                  type="button"
                >
                  {group.label}
                  <ChevronDown
                    className={cn("size-4 transition-transform", openGroup === group.label && "rotate-180")}
                  />
                </button>
                <AnimatePresence>
                  {openGroup === group.label && (
                    <motion.div
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute top-full left-1/2 w-72 -translate-x-1/2 pt-4"
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                    >
                      <ul className="rounded-2xl bg-shell p-2 shadow-2xl ring-1 ring-white/10">
                        {group.items.map((item) => (
                          <li key={item.label}>
                            <a
                              className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                              href={item.href}
                              onClick={() => setOpenGroup(null)}
                            >
                              <span className="block text-sm font-medium text-white">{item.label}</span>
                              {item.description && (
                                <span className="block text-xs text-neutral-400">{item.description}</span>
                              )}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
            {nav.links.map((link) => (
              <li key={link.label}>
                <a
                  className="rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors hover:text-white"
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1 sm:gap-3">
            <a
              className="hidden text-sm text-neutral-300 transition-colors hover:text-white md:block"
              href={nav.secondary.href}
            >
              {nav.secondary.label}
            </a>
            <CtaButton className="hidden sm:inline-flex" href={nav.cta.href} label={nav.cta.label} />
            <button
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              className="grid size-10 place-items-center rounded-xl text-white lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              type="button"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* menu mobile: o notch "cresce" para baixo */}
        <AnimatePresence initial={false}>
          {mobileOpen && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden lg:hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
            >
              <div className="px-4 pb-5">
                {nav.groups.map((group) => (
                  <div className="mb-3" key={group.label}>
                    <p className="px-2 pb-1 text-xs font-medium tracking-widest text-neutral-500 uppercase">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <a
                        className="block rounded-lg px-2 py-2 text-white hover:bg-white/5"
                        href={item.href}
                        key={item.label}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                ))}
                <CtaButton
                  className="mt-2 flex w-full"
                  href={nav.cta.href}
                  label={nav.cta.label}
                  onClick={() => setMobileOpen(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

/**
 * Logo com "Magnetic Hover": segue o cursor com uma mola enquanto ele está por
 * perto e acende um brilho laranja pulsante atrás. Imagens (PNG sem fundo):
 * `public/logo.png` (branca, tema claro) e `public/logo-black.png` (preta,
 * tema escuro), pois o notch da navbar tem a cor oposta à do tema.
 */
function MagneticLogo() {
  const [hover, setHover] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.4 });

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const reset = () => {
    setHover(false);
    mx.set(0);
    my.set(0);
  };

  return (
    <a
      aria-label={`${siteConfig.name}: início`}
      className="relative -m-2 flex items-center p-2"
      href="#inicio"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={reset}
      onPointerMove={onMove}
    >
      <motion.span className="relative block" style={{ x, y }}>
        {/* brilho pulsante */}
        <motion.span
          animate={hover ? { opacity: [0.35, 0.85, 0.35], scale: [0.9, 1.25, 0.9] } : { opacity: 0, scale: 0.8 }}
          aria-hidden
          className="absolute inset-0 rounded-full bg-brand blur-md"
          transition={hover ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        />
        <motion.span
          animate={{ scale: hover ? 1.08 : 1, rotate: hover ? -8 : 0 }}
          className="relative block"
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {/* O notch (bg-bezel) é sempre o oposto do tema: preto no claro,
              branco no escuro. A logo alterna para contrastar com ele. */}
          <Image
            alt="PCVP Logo"
            className="h-8 w-auto sm:h-9 dark:hidden"
            height={432}
            loading="eager"
            src="/logo.png"
            width={578}
          />
          <Image
            alt="PCVP Logo"
            className="hidden h-8 w-auto sm:h-9 dark:block"
            height={432}
            loading="eager"
            src="/logo-black.png"
            width={578}
          />
        </motion.span>
      </motion.span>
    </a>
  );
}

/** Botão com "bloco" laranja de seta à direita, que gira no hover. */
export function CtaButton({
  label,
  href,
  className,
  onClick,
  variant = "light",
}: {
  label: string;
  href: string;
  className?: string;
  onClick?: () => void;
  variant?: "light" | "dark";
}) {
  return (
    <a
      className={cn(
        "group inline-flex h-11 items-stretch overflow-hidden rounded-xl text-sm font-medium sm:h-12",
        variant === "light" ? "bg-white text-neutral-950" : "bg-neutral-950 text-white",
        className
      )}
      href={href}
      onClick={onClick}
      {...externalLinkProps(href)}
    >
      <span className="flex flex-1 items-center justify-center px-5">{label}</span>
      <span className="grid w-11 place-items-center bg-brand text-on-brand sm:w-12">
        <ArrowDownRight className="size-4 transition-transform duration-300 group-hover:-rotate-45" />
      </span>
    </a>
  );
}
