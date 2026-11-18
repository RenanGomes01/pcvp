import { cn } from "@/lib/utils";

/** Cores das badges de conquista (Home e /admin). */
export const BADGE_STYLES: Record<string, string> = {
  Internacional: "bg-brand text-on-brand",
  Seleção: "bg-brand-soft text-on-brand",
  Nacional: "bg-brand/15 text-brand",
  Estadual: "bg-brand-soft/15 text-brand-soft",
};

/** Cartão compacto do feed de conquistas (foto redonda, atleta, resultado e categoria). */
export default function AchievementCard({ athlete, photo, title, year, badge }: { athlete: string; photo: string; title: string; year: string; badge: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/10">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand/30 to-brand-soft/20 ring-1 ring-brand/30">
        {/* PNG de corpo inteiro: amplia e ancora no rosto */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="size-full origin-[50%_14%] scale-[2.3] object-cover object-[50%_0%]"
          height={44}
          loading="lazy"
          src={photo}
          width={44}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">{athlete}</p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", BADGE_STYLES[badge] ?? "bg-white/10 text-neutral-300")}>
            {badge}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug whitespace-normal text-neutral-400">
          {title}
          {year && !title.includes(year) && <span className="text-neutral-500"> · {year}</span>}
        </p>
      </div>
    </div>
  );
}
