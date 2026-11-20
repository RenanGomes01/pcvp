"use client";

import { CtaButton } from "@/components/site/navbar";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Clock, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * Planos: 2 cards de alto contraste. Um plano sem `price` mostra `priceLabel`
 * (ex.: "Agende uma aula experimental") no mesmo espaço, sem sufixo; texto longo
 * quebra em até duas linhas. CTAs externos (WhatsApp) abrem em nova aba. No hover, uma borda
 * cônica gira em volta do card (glow) e um halo acende atrás.
 */
export default function PricingSection() {
  const { pricing } = siteConfig;

  return (
    <section className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 xl:px-16 pb-20 sm:pb-28" id="planos">
      <motion.div
        className="mb-12 max-w-2xl"
        initial={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: "-80px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <span className="mb-4 inline-block text-xs font-medium tracking-[0.3em] text-brand uppercase">
          {pricing.eyebrow}
        </span>
        <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{pricing.title}</h2>
        <p className="mt-4 text-neutral-400">{pricing.description}</p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        {pricing.plans.map((plan, i) => {
          const featured = Boolean(plan.featured);
          return (
            <motion.article
              className="group relative rounded-[2rem] p-px"
              initial={{ opacity: 0, y: 32 }}
              key={plan.name}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-60px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              {/* borda estática */}
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-[2rem]",
                  featured ? "bg-gradient-to-b from-brand/60 to-white/10" : "bg-white/10"
                )}
              />
              {/* borda animada (glow) — aparece no hover */}
              <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,var(--color-brand)_320deg,var(--color-brand-soft)_350deg,transparent_360deg)] motion-reduce:animate-none" />
              </div>
              {/* halo */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand/0 blur-3xl transition-colors duration-700 group-hover:bg-brand/15"
              />

              <div
                className={cn(
                  "relative flex h-full flex-col rounded-[calc(2rem-1px)] p-7 sm:p-9",
                  featured ? "bg-neutral-950" : "bg-neutral-900"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white sm:text-2xl">{plan.name}</h3>
                    <p className="mt-1 text-sm text-neutral-400 md:min-h-10">{plan.description}</p>
                  </div>
                  {plan.highlight && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand">
                      <Sparkles className="size-3" /> {plan.highlight}
                    </span>
                  )}
                </div>

                {/* preço (ou texto em destaque) + nota: altura fixa para alinhar os dois cards */}
                <div className="mt-8">
                  {plan.price !== undefined ? (
                    <p className="flex h-[3.75rem] items-baseline gap-1">
                      <span className="text-6xl leading-none font-semibold tracking-tight text-white">{brl.format(plan.price)}</span>
                      {plan.period && <span className="text-neutral-400">{plan.period}</span>}
                    </p>
                  ) : (
                    <p className="flex min-h-[3.75rem] items-end font-serif text-4xl leading-[1.05] tracking-tight text-balance text-white italic sm:text-[2.75rem]">
                      {plan.priceLabel}
                    </p>
                  )}
                  <p className="mt-3 min-h-5 text-sm text-neutral-400 md:min-h-10 xl:min-h-5">{plan.priceNote}</p>
                </div>

                <div className="my-8 h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent" />

                <p className="mb-4 text-xs font-medium tracking-[0.2em] text-neutral-500 uppercase">Horários</p>
                <ul className="flex-1 space-y-2.5">
                  {plan.slots.map((s) => (
                    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm" key={s.time}>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs whitespace-nowrap",
                          featured ? "bg-brand/10 text-brand" : "bg-white/5 text-neutral-200"
                        )}
                      >
                        <Clock aria-hidden className="size-3" /> {s.time}
                      </span>
                      <span className="text-neutral-300">{s.group}</span>
                    </li>
                  ))}
                </ul>

                <CtaButton
                  className="mt-9 w-full"
                  href={plan.cta.href}
                  label={plan.cta.label}
                  variant={featured ? "light" : "dark"}
                />
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
