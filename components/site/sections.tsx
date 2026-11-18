"use client";

import AthleteSheet from "@/components/site/athlete-sheet";
import AnimatedList from "@/components/ui/animated-list";
import BlurHighlight from "@/components/ui/blur-highlight";
import InteractiveSchedule from "@/components/ui/interactive-schedule";
import ParticleChart from "@/components/ui/particle-chart";
import ParticleText from "@/components/ui/particle-text";
import Pipeline from "@/components/ui/pipeline";
import { siteConfig, type TeamMember } from "@/config/site";
import { cn, externalLinkProps } from "@/lib/utils";
import { CalendarDays, Dumbbell, Flame, MapPin, Swords, Trophy } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";

// WebGL só no cliente; o placeholder reserva a mesma altura (sem pulo de layout)
const SpinShutter = dynamic(() => import("@/components/ui/spin-shutter"), {
  ssr: false,
  loading: () => <div aria-hidden className="h-[492px] sm:h-[612px]" />,
});

/** Itens da órbita do elenco: só a foto vai para o 3D; nome e posição viram a legenda. */
const ROSTER_ITEMS = (siteConfig.team.members as readonly TeamMember[]).map((m) => ({ title: m.name, subtitle: m.role, src: m.photo }));

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

/** Entra com fade + slide quando aparece na tela. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs font-medium tracking-[0.3em] text-brand uppercase">{children}</p>;
}

/* -------------------------------------------------------------------------- */
/*                   manifesto com desfoque de destaque                       */
/* -------------------------------------------------------------------------- */

export function Statement() {
  const { statement } = siteConfig;
  // hover (ou foco) em qualquer ponto da seção deixa o parágrafo inteiro nítido
  const [active, setActive] = useState(false);
  return (
    <section
      className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 pt-40 pb-28 sm:pt-56 sm:pb-40"
      onBlur={() => setActive(false)}
      onFocus={() => setActive(true)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <BlurHighlight
        active={active}
        className="mx-auto max-w-5xl text-3xl leading-tight font-medium text-white sm:text-5xl"
        highlights={statement.highlights}
        text={statement.text}
      />
      {/* jornada do atleta: da base aos dois destinos competitivos */}
      <Reveal className="mt-16 sm:mt-24">
        <Pipeline
          label={statement.pipeline.label}
          outcomes={statement.pipeline.outcomes}
          steps={statement.pipeline.steps}
        />
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 bento grid                                 */
/* -------------------------------------------------------------------------- */

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 transition-transform duration-500 hover:-translate-y-1 sm:p-7",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon, title, description, dark }: { icon: ReactNode; title: string; description: string; dark?: boolean }) {
  return (
    <div>
      <div
        className={cn(
          "mb-4 grid size-10 place-items-center rounded-xl",
          dark ? "bg-neutral-950/10 text-neutral-950" : "bg-white/5 text-brand"
        )}
      >
        {icon}
      </div>
      <h3 className={cn("text-2xl font-semibold", dark ? "text-neutral-950" : "text-white")}>{title}</h3>
      <p className={cn("mt-1 text-sm", dark ? "text-neutral-800" : "text-neutral-400")}>{description}</p>
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  Internacional: "bg-brand text-on-brand",
  Seleção: "bg-brand-soft text-on-brand",
  Nacional: "bg-brand/15 text-brand",
  Estadual: "bg-brand-soft/15 text-brand-soft",
};

/** Cartão compacto do feed de conquistas (foto redonda, atleta, resultado e categoria). */
function AchievementCard({ athlete, photo, title, year, badge }: { athlete: string; photo: string; title: string; year: string; badge: string }) {
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
          {year && <span className="text-neutral-500"> · {year}</span>}
        </p>
      </div>
    </div>
  );
}

export function Bento() {
  const { bento, team } = siteConfig;
  const [selected, setSelected] = useState<string | null>(null);
  const member = team.members.find((m) => m.name === selected) ?? null;
  return (
    <section className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-28" id="time">
      <Reveal className="mb-12 max-w-2xl">
        <Eyebrow>{bento.eyebrow}</Eyebrow>
        <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{bento.title}</h2>
      </Reveal>

      <div className="grid auto-rows-[minmax(260px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Próximos jogos — card em largura total */}
        <Reveal className="md:col-span-2 lg:col-span-12">
          <Card className="bg-neutral-900">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <CardTitle
                description={bento.matches.description}
                icon={<CalendarDays className="size-5" />}
                title={bento.matches.title}
              />
              <ul className="space-y-2">
                {bento.matches.items.map((m) => (
                  <li className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/5" key={m.event}>
                    <span className="w-14 shrink-0 text-center text-xs leading-tight font-semibold text-brand">
                      {m.date}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{m.event}</span>
                      <span className="flex items-center gap-1 text-xs text-neutral-400">
                        <MapPin className="size-3" /> {m.place}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Reveal>

        {/* Estatísticas */}
        <Reveal className="lg:col-span-7" delay={0.08}>
          <Card className="flex flex-col bg-neutral-900">
            {/* areia despejada em tubos de vidro; abas no canto superior direito */}
            <ParticleChart
              className="flex-1"
              header={
                <CardTitle
                  description={bento.stats.description}
                  icon={<Swords className="size-5" />}
                  title={bento.stats.title}
                />
              }
              tabs={bento.stats.tabs}
            />
          </Card>
        </Reveal>

        {/* Conquistas */}
        <Reveal className="lg:col-span-5" delay={0.16}>
          <Card className="flex flex-col bg-gradient-to-br from-neutral-900 to-neutral-950">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/5 text-brand">
                  <Trophy className="size-5" />
                </span>
                <h3 className="text-2xl font-semibold text-white">{bento.achievements.title}</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75 motion-reduce:hidden" />
                  <span className="relative size-1.5 rounded-full bg-brand" />
                </span>
                {bento.achievements.live}
              </span>
            </div>
            {/* feed vivo: cartões entram no topo e empurram os anteriores */}
            <div className="relative mt-5 h-[400px] flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
              <AnimatedList
                items={bento.achievements.feed}
                label="Conquistas recentes do elenco"
                renderItem={(a) => <AchievementCard {...a} />}
              />
            </div>
          </Card>
        </Reveal>

        {/* Elenco — perfis dos atletas */}
        <div className="md:col-span-2 lg:col-span-12">
          <Reveal className="mt-8 mb-5 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>{team.eyebrow}</Eyebrow>
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{team.title}</h3>
            </div>
            <p className="hidden text-sm text-neutral-500 sm:block">{team.hint}</p>
          </Reveal>
          {/* órbita 3D: clique num card abre o perfil completo no painel lateral */}
          <Reveal delay={0.08}>
            <SpinShutter
              aperture={1.2}
              ariaLabel={team.orbitLabel}
              canvasClassName="h-[420px] sm:h-[540px]"
              distance={2.7}
              intro
              isPaused={member !== null}
              items={ROSTER_ITEMS}
              // cada atleta aparece uma única vez (sem completar o anel com repetições)
              minCards={0}
              onSelect={(i) => setSelected(team.members[i].name)}
              radius={0.08}
              roll={-24}
              speed={0.05}
              tilt={16}
            />
          </Reveal>
        </div>
      </div>

      <AthleteSheet member={member} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                              grade de horários                             */
/* -------------------------------------------------------------------------- */

export function ScheduleSection() {
  const { schedule } = siteConfig;
  return (
    <section className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 pb-20 sm:pb-28" id="horarios">
      <Reveal className="mb-10 max-w-2xl">
        <Eyebrow>{schedule.eyebrow}</Eyebrow>
        <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{schedule.title}</h2>
        <p className="mt-4 text-neutral-400">{schedule.description}</p>
      </Reveal>
      <Reveal delay={0.08}>
        <InteractiveSchedule
          categories={schedule.categories}
          days={schedule.days}
          sessions={schedule.sessions}
          shifts={schedule.shifts}
        />
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                  seção interativa: efeito de partículas                    */
/* -------------------------------------------------------------------------- */

/** A logo em partículas é 100% laranja da marca, nos dois temas. */
const PARTICLE_COLORS = ["#ff6600"];

export function ParticleShowcase() {
  const { particles } = siteConfig;
  // telas estreitas: logo menor → grade mais densa para manter a definição
  const [gap, setGap] = useState(6);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setGap(mq.matches ? 3 : 6);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section
      aria-label={particles.text}
      className="relative mx-1.5 my-16 overflow-hidden rounded-[1.75rem] bg-black sm:mx-2 sm:my-24 sm:rounded-[2.5rem]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 pt-10 text-center sm:pt-14">
        <Eyebrow>{particles.eyebrow}</Eyebrow>
        <p className="text-sm text-neutral-500">{particles.hint}</p>
      </div>
      {/* mobile: 70svh deixa área livre para rolar; tocar FORA das letras rola a página */}
      <ParticleText
        className="h-[70svh] min-h-[460px] bg-transparent sm:h-[88svh] sm:min-h-[520px]"
        colors={PARTICLE_COLORS}
        gap={gap}
        imageCutoff={particles.imageCutoff}
        src={particles.image}
        text={particles.text}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                     como treinamos — timeline com progresso                */
/* -------------------------------------------------------------------------- */

const STEP_ICONS = [Flame, Dumbbell, Swords, Trophy];

export function Steps() {
  const { steps } = siteConfig;
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 0.7", "end 0.6"] });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="bg-neutral-900/40 py-20 sm:py-28" id="treinos">
      <div className="mx-auto grid w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 gap-12 md:grid-cols-2">
        <Reveal className="md:sticky md:top-32 md:self-start">
          <Eyebrow>{steps.eyebrow}</Eyebrow>
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">{steps.title}</h2>
          <p className="mt-4 max-w-md text-neutral-400">{steps.description}</p>
        </Reveal>

        <ol className="relative space-y-16 pl-14" ref={listRef}>
          {/* trilho + preenchimento conforme o scroll */}
          <span aria-hidden className="absolute top-2 bottom-2 left-5 w-px bg-white/10" />
          <motion.span aria-hidden className="absolute top-2 left-5 w-px bg-brand" style={{ height: fill }} />
          {steps.items.map((s, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <li className="relative" key={s.title}>
                <span className="absolute top-0 -left-14 grid size-10 place-items-center rounded-full bg-brand text-on-brand">
                  <Icon className="size-4" />
                </span>
                <Reveal>
                  <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-neutral-400">{s.description}</p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   footer                                   */
/* -------------------------------------------------------------------------- */

export function Footer() {
  const { footer } = siteConfig;
  return (
    <footer className="overflow-hidden border-t border-white/5 pt-16 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto grid w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <a className="flex items-center gap-2 text-lg font-semibold text-white" href="#inicio">
            <span aria-hidden className="size-6 rounded-full bg-brand" />
            {siteConfig.name}
          </a>
          <p className="mt-3 max-w-xs text-sm text-neutral-400">{siteConfig.description}</p>
        </div>
        {footer.columns.map((col) => (
          <nav aria-label={col.title} key={col.title}>
            <h3 className="mb-3 text-xs font-medium tracking-[0.25em] text-neutral-500 uppercase">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a className="text-sm text-neutral-300 transition-colors hover:text-white" href={l.href} {...externalLinkProps(l.href)}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 flex-col gap-2 text-xs text-neutral-500 sm:flex-row sm:justify-between">
        <p>
          © {footer.year} {footer.copyright}
        </p>
        <a className="hover:text-white" href="#inicio">
          Voltar ao topo ↑
        </a>
      </div>

      {/* wordmark gigante saindo pela base */}
      <p
        aria-hidden
        className="mt-6 -mb-[0.22em] text-center text-[28vw] leading-none font-black tracking-tighter text-white/[0.04] select-none"
      >
        {siteConfig.name}
      </p>
    </footer>
  );
}
