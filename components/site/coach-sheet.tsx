"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PortraitBackdrop from "@/components/site/portrait-backdrop";
import type { Coach } from "@/config/site";
import { BadgeCheck } from "lucide-react";
import { useSheetScrollLock } from "@/lib/use-sheet-scroll-lock";

/** Logo do Instagram (o lucide-react instalado não traz ícones de marcas). */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      <rect height="20" rx="5" width="20" x="2" y="2" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}

/** Iniciais do nome curto ("Paulo Coelho" → "PC"). */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/**
 * Painel lateral (direita) com o currículo completo do treinador, no mesmo
 * padrão do AthleteSheet: fecha com ESC, clique no fundo ou no X.
 */
export default function CoachSheet({ coach, onOpenChange }: { coach: Coach | null; onOpenChange: (open: boolean) => void }) {
  const open = coach !== null;

  // trava o scroll sem tocar no <html>/<body> no iPhone e, ao fechar, avisa a
  // moldura para o Safari reamostrar a cor da Ilha Dinâmica (ver o hook)
  const sheetProps = useSheetScrollLock(open);

  return (
    <Sheet {...sheetProps} onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="gap-0 border-white/10 bg-neutral-950 p-0 pt-[env(safe-area-inset-top,0px)] text-neutral-200 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        side="right"
      >
        {coach && (
          <>
            <SheetHeader className="touch-none border-b border-white/5 p-6 pr-14">
              <div className="flex items-center gap-4">
                <span className="theme-fixed relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#3b1600] font-serif text-2xl text-white italic">
                  <PortraitBackdrop lines={false} />
                  {coach.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="absolute inset-0 size-full origin-top scale-[1.6] object-cover object-top" src={coach.image} />
                  ) : (
                    <span className="relative">{initials(coach.name)}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="text-2xl font-semibold text-white">{coach.fullName}</SheetTitle>
                  <SheetDescription className="text-brand">{coach.role}</SheetDescription>
                </div>
              </div>
              <ul aria-label="Credenciais" className="mt-4 flex flex-wrap gap-1.5">
                {coach.credentials.map((c) => (
                  <li
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-300 ring-1 ring-white/10"
                    key={c}
                  >
                    <BadgeCheck aria-hidden className="size-3.5 text-brand" />
                    {c}
                  </li>
                ))}
              </ul>
            </SheetHeader>

            {/* conteúdo rolável (data-lenis-prevent: o Lenis não intercepta o wheel aqui) */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)]" data-lenis-prevent="">
              {/* 1px a mais que a área: sempre rolável, então o overscroll-contain segura o gesto mesmo em perfis curtos */}
              <div className="min-h-[calc(100%+1px)]">
              {coach.sections.map((section) => (
                <section className="mt-8 px-6" key={section.title}>
                  <h3 className="mb-3 text-xs font-medium tracking-[0.25em] text-brand uppercase">{section.title}</h3>
                  <ul className="space-y-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                    {section.items.map((item) => (
                      <li className="flex gap-3 text-[15px] leading-relaxed text-neutral-300" key={item}>
                        <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <p className="mt-8 flex items-center gap-2 px-6 text-sm text-neutral-400">
                <InstagramIcon className="size-4 text-brand" />
                <span className="sr-only">Instagram:</span>
                {coach.instagramUrl ? (
                  <a
                    className="font-medium text-white underline-offset-4 hover:underline"
                    href={coach.instagramUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {coach.instagramLabel}
                  </a>
                ) : (
                  <span className="font-medium text-neutral-200">{coach.instagramLabel}</span>
                )}
              </p>

              <div className="h-8" />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
