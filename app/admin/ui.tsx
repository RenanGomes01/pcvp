"use client";

/** Primitivos visuais e tipos compartilhados do painel /admin. */

import { BADGE_STYLES, LOGO_IMG_CLS } from "@/components/site/achievement-card";
import { isLogoAvatar, type BentoData } from "@/lib/bento";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowDown, ArrowUp, Check, Eye, ImageOff, LoaderCircle, Lock, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export type Run = (success: string, method: "POST" | "PUT" | "DELETE", payload?: Record<string, unknown>, query?: string) => Promise<boolean>;
export type TabProps = { data: BentoData; run: Run };

/* -------------------------------------------------------------------------- */
/*                                  primitivos                                */
/* -------------------------------------------------------------------------- */

export const inputCls =
  "w-full rounded-xl bg-white/[0.04] px-3 py-2.5 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-brand";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-neutral-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function Btn({
  children,
  variant = "ghost",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" | "icon" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-brand px-4 py-2.5 text-on-brand hover:bg-brand/90",
        variant === "ghost" && "bg-white/5 px-3.5 py-2 text-white ring-1 ring-white/10 hover:bg-white/10",
        variant === "danger" && "bg-red-500/15 px-3.5 py-2 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25",
        variant === "icon" && "size-9 text-neutral-400 hover:bg-white/10 hover:text-white",
        className
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

/** Botão de excluir em dois cliques (sem diálogo do navegador). */
export function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return armed ? (
    <Btn aria-label={`Confirmar exclusão de ${label}`} className="px-2.5 py-1.5 text-xs" onClick={onConfirm} variant="danger">
      <Trash2 className="size-3.5" /> Confirmar
    </Btn>
  ) : (
    <Btn aria-label={`Excluir ${label}`} onClick={() => setArmed(true)} title="Excluir" variant="icon">
      <Trash2 className="size-4" />
    </Btn>
  );
}

export function MoveButtons({ index, length, onMove, label }: { index: number; length: number; onMove: (dir: -1 | 1) => void; label: string }) {
  return (
    <div className="flex flex-col">
      <Btn aria-label={`Mover ${label} para cima`} className="size-6" disabled={index === 0} onClick={() => onMove(-1)} variant="icon">
        <ArrowUp className="size-3.5" />
      </Btn>
      <Btn aria-label={`Mover ${label} para baixo`} className="size-6" disabled={index === length - 1} onClick={() => onMove(1)} variant="icon">
        <ArrowDown className="size-3.5" />
      </Btn>
    </div>
  );
}

export function Avatar({ src, className }: { src: string; className?: string }) {
  const logo = isLogoAvatar(src);
  return (
    <span
      className={cn(
        "relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-brand/30",
        logo ? "theme-fixed bg-brand" : "bg-gradient-to-br from-brand/30 to-brand-soft/20",
        className
      )}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className={logo ? LOGO_IMG_CLS : "size-full origin-[50%_14%] scale-[2.3] object-cover object-[50%_0%]"} src={src} />
      )}
    </span>
  );
}

export function BadgePill({ badge }: { badge: string }) {
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", BADGE_STYLES[badge] ?? "bg-white/10 text-neutral-300")}>{badge}</span>;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl bg-neutral-900 p-4 ring-1 ring-white/10 sm:p-6", className)}>{children}</div>;
}

/** Nova ordem de ids após mover o item `index` uma posição para `dir`. */
export function movedIds<T extends { id: string }>(list: T[], index: number, dir: -1 | 1) {
  const ids = list.map((x) => x.id);
  const j = index + dir;
  [ids[index], ids[j]] = [ids[j], ids[index]];
  return ids;
}


/* -------------------------------------------------------------------------- */
/*                     peças das abas Elenco e Comissão                       */
/* -------------------------------------------------------------------------- */

export const textareaCls = cn(inputCls, "min-h-24 resize-y leading-relaxed");

/** Olhinho de visibilidade: 👁️ visível no site · 🔒 oculto (guardado só no painel). */
export function VisibilityButton({ active, label, onToggle }: { active: boolean; label: string; onToggle: () => void }) {
  return (
    <Btn
      aria-label={active ? `Ocultar ${label} do site` : `Mostrar ${label} no site`}
      aria-pressed={active}
      className={cn(!active && "text-amber-400 hover:text-amber-300")}
      onClick={onToggle}
      title={active ? "Visível no site (clique para ocultar)" : "Oculto do site (clique para mostrar)"}
      variant="icon"
    >
      {active ? <Eye className="size-4" /> : <Lock className="size-4" />}
    </Btn>
  );
}

export const IMAGE_DIR = "/atletas/";

/** "lippe.png" → "/atletas/lippe.png"; caminhos absolutos e URLs https ficam como estão. */
export function toImagePath(v: string) {
  const s = v.trim();
  if (!s) return "";
  if (s.startsWith("/") || /^https?:\/\//.test(s)) return s;
  return IMAGE_DIR + s;
}

/** Campo da foto: digita só o nome do arquivo em /public/atletas (com prévia e aviso se não existir). */
export function ImagePathField({ value, onChange, suggestions, round = false }: { value: string; onChange: (path: string) => void; suggestions: string[]; round?: boolean }) {
  const shown = value.startsWith(IMAGE_DIR) ? value.slice(IMAGE_DIR.length) : value;
  const [broken, setBroken] = useState<string | null>(null);
  const missing = Boolean(value) && broken === value;
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "relative grid size-16 shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-brand/30 to-brand-soft/20 ring-1 ring-brand/30",
          round ? "rounded-full" : "rounded-2xl"
        )}
      >
        {value && !missing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="size-full origin-top scale-[1.6] object-cover object-top" onError={() => setBroken(value)} src={value} />
        ) : (
          <ImageOff aria-hidden className="size-5 text-neutral-500" />
        )}
      </span>
      <div className="flex-1">
        <Field hint={missing ? undefined : "Nome do arquivo em public/atletas (ex.: lippe.png). Também aceita /caminho ou URL https."} label="Foto">
          <div className="flex rounded-xl ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-brand">
            {!/^(\/|https?:)/.test(shown) && <span className="grid place-items-center rounded-l-xl bg-white/[0.06] px-2.5 text-xs text-neutral-400">{IMAGE_DIR}</span>}
            <input
              className="w-full min-w-0 rounded-r-xl bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500"
              list="admin-image-files"
              onChange={(e) => onChange(toImagePath(e.target.value))}
              placeholder="lippe.png"
              value={shown}
            />
          </div>
        </Field>
        {missing && (
          <p className="mt-1.5 text-xs text-amber-400" role="status">
            Não encontrei {value}. Confira o nome do arquivo (o site mostra o degradê laranja no lugar).
          </p>
        )}
        <datalist id="admin-image-files">
          {suggestions.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

/** Nomes de arquivo já usados em /atletas (sugestões do campo de foto). */
export function imageSuggestions(data: BentoData) {
  const all = [...data.athletes.map((a) => a.image), ...data.coachesList.map((c) => c.image), ...data.achievements.map((a) => a.avatar)];
  return [...new Set(all.filter((p) => p.startsWith(IMAGE_DIR)).map((p) => p.slice(IMAGE_DIR.length)))].sort();
}

/** Painel lateral de edição (mesmo visual da aba Conquistas). */
export function EditSheet({ open, title, description, onClose, children }: { open: boolean; title: string; description: string; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet onOpenChange={(o) => !o && onClose()} open={open}>
      <SheetContent className="gap-0 border-white/10 bg-neutral-950 p-0 text-neutral-200 data-[side=right]:w-full data-[side=right]:sm:max-w-xl" side="right">
        <SheetHeader className="p-6 pr-14">
          <SheetTitle className="text-xl font-semibold text-white">{title}</SheetTitle>
          <SheetDescription className="text-neutral-400">{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Rodapé do formulário lateral: erro + Cancelar/Salvar (igual ao da aba Conquistas). */
export function FormFooter({ error, saving, onCancel, submitLabel }: { error: string | null; saving: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="mt-auto flex gap-2 pt-2">
        <Btn className="flex-1" onClick={onCancel}>
          Cancelar
        </Btn>
        <Btn className="flex-1" disabled={saving} type="submit" variant="primary">
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} {submitLabel}
        </Btn>
      </div>
    </>
  );
}

/** Classe do <form> dentro do EditSheet (rola sozinho, sem o Lenis interceptar). */
export const sheetFormCls = "flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pb-6";

/** Título de grupo dentro do formulário. */
export function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/5 pt-4">
      <h3 className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Checkbox "Visível no site" dos formulários. */
export function VisibleCheckbox({ checked, onChange, hint }: { checked: boolean; onChange: (v: boolean) => void; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/10">
      <input checked={checked} className="mt-0.5 size-4 accent-[var(--color-brand)]" onChange={(e) => onChange(e.target.checked)} type="checkbox" />
      <span>
        <span className="block text-sm font-medium text-white">Visível no site</span>
        <span className="block text-xs text-neutral-400">{hint}</span>
      </span>
    </label>
  );
}

/* conversões texto ⇄ listas (os formulários editam listas como texto, uma linha por item) */
export const linesToList = (t: string) =>
  t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
export const paragraphsToList = (t: string) =>
  t
    .split(/\n\s*\n/)
    .map((x) => x.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
/** "Campeã Estadual Sub-17 | 2023" (o ano depois da barra é opcional). */
export const linesToItems = (t: string) =>
  linesToList(t).map((line) => {
    const i = line.lastIndexOf("|");
    return i < 0 ? { title: line, year: "" } : { title: line.slice(0, i).trim(), year: line.slice(i + 1).trim() };
  });
export const itemsToLines = (items: { title: string; year: string }[]) => items.map((x) => (x.year ? `${x.title} | ${x.year}` : x.title)).join("\n");
