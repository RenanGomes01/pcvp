"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PortraitBackdrop from "@/components/site/portrait-backdrop";
import type { TeamMember } from "@/config/site";
import { Medal, Quote, Trophy } from "lucide-react";
import { useSheetScrollLock } from "@/lib/use-sheet-scroll-lock";

/**
 * Painel lateral (direita) com o perfil detalhado do atleta:
 * citação em serifa itálica, bio longa com scroll próprio e listas de
 * "Principais Conquistas" e "Prêmios Individuais".
 */
export default function AthleteSheet({
  member,
  stats,
  onOpenChange,
}: {
  member: TeamMember | null;
  /** Números do perfil (editáveis em /admin). Zerados = não aparecem. */
  stats?: { podiums: number; titles: number };
  onOpenChange: (open: boolean) => void;
}) {
  const open = member !== null;

  // trava o scroll da página sem tocar no <html>/<body> no iPhone (ver o hook)
  const modal = useSheetScrollLock(open);

  return (
    <Sheet modal={modal} onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="gap-0 border-white/10 bg-neutral-950 p-0 pt-[env(safe-area-inset-top,0px)] text-neutral-200 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        side="right"
      >
        {member && (
          <>
            <SheetHeader className="touch-none border-b border-white/5 p-6 pr-14">
              <div className="flex items-center gap-4">
                <span className="theme-fixed relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#3b1600] text-2xl font-semibold text-white">
                  <PortraitBackdrop lines={false} />
                  {member.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="absolute inset-0 size-full origin-top scale-[1.6] object-cover object-top" src={member.photo} />
                  ) : (
                    <span className="relative">{member.name.charAt(0)}</span>
                  )}
                </span>
                <div>
                  <SheetTitle className="text-2xl font-semibold text-white">{member.name}</SheetTitle>
                  <SheetDescription className="text-neutral-400">{member.role}</SheetDescription>
                  {stats && (stats.podiums > 0 || stats.titles > 0) && (
                    <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {stats.podiums > 0 && (
                        <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-medium text-brand">
                          {stats.podiums} {stats.podiums === 1 ? "pódio" : "pódios"}
                        </span>
                      )}
                      {stats.titles > 0 && (
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-medium text-neutral-300 ring-1 ring-white/10">
                          {stats.titles} {stats.titles === 1 ? "título" : "títulos"}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* conteúdo rolável (data-lenis-prevent: o Lenis não intercepta o wheel aqui) */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)]" data-lenis-prevent="">
              {/* 1px a mais que a área: sempre rolável, então o overscroll-contain segura o gesto mesmo em perfis curtos */}
              <div className="min-h-[calc(100%+1px)]">
              {member.profile.quote && (
                <figure className="relative px-6 pt-8 pb-6">
                  <Quote aria-hidden className="mb-3 size-6 text-brand" />
                  <blockquote className="font-serif text-2xl leading-snug text-white italic sm:text-3xl">
                    “{member.profile.quote}”
                  </blockquote>
                  <figcaption className="mt-3 text-sm text-neutral-500">{member.name}</figcaption>
                </figure>
              )}

              {isEmptyProfile(member) && (
                <p className="px-6 pt-8 text-sm text-neutral-500">Perfil completo em breve.</p>
              )}

              <div className="space-y-4 px-6 text-[15px] leading-relaxed text-neutral-300">
                {member.profile.longBio.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <ProfileList icon={Trophy} items={member.profile.titles} title="Principais Conquistas" />
              <ProfileList icon={Medal} items={member.profile.awards} title="Prêmios Individuais" />

              <div className="h-8" />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function isEmptyProfile({ profile }: TeamMember) {
  return !profile.quote && !profile.longBio.length && !profile.titles.length && !profile.awards.length;
}

function ProfileList({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: readonly { title: string; year: string }[];
  icon: typeof Trophy;
}) {
  if (!items.length) return null;
  return (
    <section className="mt-8 px-6">
      <h3 className="mb-3 text-xs font-medium tracking-[0.25em] text-neutral-500 uppercase">{title}</h3>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/5">
        {items.map((it, i) => (
          <li className="flex items-center gap-3 px-4 py-3" key={i}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-sm text-neutral-200">{it.title}</span>
            <span className="font-mono text-xs text-neutral-500">{it.year}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
