"use client";

/**
 * Aba "Comissão Técnica" do /admin: treinadores da seção "Nosso time" da Home.
 * Lista com retrato, cargo, olhinho de visibilidade, ordem, editar e excluir;
 * formulário lateral com o card e o currículo do painel "Ler mais" (blocos com tópicos).
 */

import {
  Avatar,
  Btn,
  DeleteButton,
  EditSheet,
  Field,
  FormFooter,
  FormGroup,
  imageSuggestions,
  ImagePathField,
  inputCls,
  linesToList,
  MoveButtons,
  movedIds,
  Panel,
  sheetFormCls,
  textareaCls,
  VisibilityButton,
  VisibleCheckbox,
  type TabProps,
} from "@/app/admin/ui";
import type { CoachRecord } from "@/lib/bento";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

type SectionDraft = { key: number; title: string; items: string };
type Draft = {
  name: string;
  fullName: string;
  role: string;
  image: string;
  credentials: string;
  shortBio: string;
  sections: SectionDraft[];
  instagramLabel: string;
  instagramUrl: string;
  active: boolean;
};

let nextKey = 1;
const section = (title = "", items = ""): SectionDraft => ({ key: nextKey++, title, items });

const emptyDraft = (): Draft => ({
  name: "",
  fullName: "",
  role: "",
  image: "",
  credentials: "",
  shortBio: "",
  sections: [section("Formação e Credenciais Profissionais")],
  instagramLabel: "",
  instagramUrl: "",
  active: true,
});

const toDraft = (c: CoachRecord): Draft => ({
  name: c.name,
  fullName: c.fullName,
  role: c.role,
  image: c.image,
  credentials: c.credentials.join("\n"),
  shortBio: c.shortBio,
  sections: c.sections.map((s) => section(s.title, s.items.join("\n"))),
  instagramLabel: c.instagramLabel,
  instagramUrl: c.instagramUrl,
  active: c.active,
});

const fromDraft = (d: Draft) => ({
  name: d.name,
  fullName: d.fullName || d.name,
  role: d.role,
  image: d.image,
  credentials: linesToList(d.credentials),
  shortBio: d.shortBio,
  sections: d.sections.map((s) => ({ title: s.title, items: linesToList(s.items) })),
  instagramLabel: d.instagramLabel,
  instagramUrl: d.instagramUrl,
  active: d.active,
});

/* -------------------------------------------------------------------------- */
/*                                  formulário                                */
/* -------------------------------------------------------------------------- */

function CoachForm({
  initial,
  isNew,
  suggestions,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  isNew: boolean;
  suggestions: string[];
  onSubmit: (d: Draft) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setSection = (key: number, patch: Partial<SectionDraft>) =>
    setD((x) => ({ ...x, sections: x.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  const moveSection = (i: number, dir: -1 | 1) =>
    setD((x) => {
      const sections = [...x.sections];
      [sections[i], sections[i + dir]] = [sections[i + dir], sections[i]];
      return { ...x, sections };
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim() || !d.role.trim()) return setError("Preencha o nome e o cargo.");
    setError(null);
    setSaving(true);
    const ok = await onSubmit(d);
    setSaving(false);
    if (!ok) setError("Não foi possível salvar. Veja a mensagem no rodapé da tela.");
  };

  return (
    <form className={sheetFormCls} data-lenis-prevent="" onSubmit={submit}>
      <ImagePathField onChange={(v) => set("image", v)} suggestions={suggestions} value={d.image} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field hint="Exibido no card." label="Nome">
          <input autoFocus={isNew} className={inputCls} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Paulo Coelho" required value={d.name} />
        </Field>
        <Field hint="Título do painel “Ler mais”." label="Nome completo">
          <input className={inputCls} maxLength={120} onChange={(e) => set("fullName", e.target.value)} placeholder={d.name || "Igual ao nome"} value={d.fullName} />
        </Field>
      </div>
      <Field label="Cargo">
        <input className={inputCls} maxLength={80} onChange={(e) => set("role", e.target.value)} placeholder="Ex.: Head Coach & Fundador" required value={d.role} />
      </Field>
      <Field hint="Uma por linha (viram os selos do card)." label="Credenciais">
        <textarea className={cn(textareaCls, "min-h-24")} onChange={(e) => set("credentials", e.target.value)} placeholder={"CREF 0000-G/MT\nTécnico Nível III CBV"} value={d.credentials} />
      </Field>
      <Field label="Bio do card">
        <textarea className={cn(textareaCls, "min-h-32")} maxLength={900} onChange={(e) => set("shortBio", e.target.value)} value={d.shortBio} />
      </Field>

      <FormGroup title="Currículo (painel “Ler mais”)">
        {d.sections.map((s, i) => (
          <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/10" key={s.key}>
            <div className="mb-2 flex items-center gap-1">
              <MoveButtons index={i} label={s.title || `bloco ${i + 1}`} length={d.sections.length} onMove={(dir) => moveSection(i, dir)} />
              <input
                aria-label={`Título do bloco ${i + 1}`}
                className={cn(inputCls, "flex-1 font-medium")}
                maxLength={120}
                onChange={(e) => setSection(s.key, { title: e.target.value })}
                placeholder="Título do bloco"
                value={s.title}
              />
              <Btn
                aria-label={`Remover bloco ${s.title || i + 1}`}
                onClick={() => setD((x) => ({ ...x, sections: x.sections.filter((y) => y.key !== s.key) }))}
                title="Remover bloco"
                variant="icon"
              >
                <Trash2 className="size-4" />
              </Btn>
            </div>
            <textarea
              aria-label={`Tópicos do bloco ${i + 1} (um por linha)`}
              className={cn(textareaCls, "min-h-28")}
              onChange={(e) => setSection(s.key, { items: e.target.value })}
              placeholder="Um tópico por linha"
              value={s.items}
            />
          </div>
        ))}
        <Btn className="self-start" onClick={() => setD((x) => ({ ...x, sections: [...x.sections, section()] }))}>
          <Plus className="size-4" /> Adicionar bloco
        </Btn>
      </FormGroup>

      <FormGroup title="Instagram">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome exibido">
            <input className={inputCls} maxLength={80} onChange={(e) => set("instagramLabel", e.target.value)} placeholder="Paulo Coelho - Técnico" value={d.instagramLabel} />
          </Field>
          <Field hint="Opcional. Sem link, o nome aparece como texto." label="Link">
            <input className={inputCls} inputMode="url" maxLength={300} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" value={d.instagramUrl} />
          </Field>
        </div>
      </FormGroup>

      <VisibleCheckbox
        checked={d.active}
        hint="Exibir na seção “Nosso time” da Home (desmarque para guardar o currículo sem mostrar no site)."
        onChange={(v) => set("active", v)}
      />

      <FormFooter error={error} onCancel={onCancel} saving={saving} submitLabel={isNew ? "Cadastrar treinador" : "Salvar"} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                     aba                                    */
/* -------------------------------------------------------------------------- */

export default function CoachesTab({ data, run }: TabProps) {
  const list = useMemo(() => [...data.coachesList].sort((a, b) => a.order - b.order), [data.coachesList]);
  const suggestions = useMemo(() => imageSuggestions(data), [data]);
  const [editing, setEditing] = useState<{ target: CoachRecord | null } | null>(null);
  const initial = useMemo(() => (editing ? (editing.target ? toDraft(editing.target) : emptyDraft()) : null), [editing]);

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Comissão técnica</h2>
          <p className="text-sm text-neutral-400">
            {list.filter((c) => c.active).length} visíveis de {list.length}. A ordem abaixo é a ordem dos cards em “Nosso time”.
          </p>
        </div>
        <Btn onClick={() => setEditing({ target: null })} variant="primary">
          <Plus className="size-4" /> Novo treinador
        </Btn>
      </div>

      <ul className="space-y-2">
        {list.map((c, i) => (
          <li className={cn("flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-white/5", !c.active && "opacity-50")} key={c.id}>
            <MoveButtons index={i} label={c.name} length={list.length} onMove={(dir) => run("Ordem atualizada", "PUT", { entity: "coachesList", order: movedIds(list, i, dir) })} />
            <Avatar className="size-12" src={c.image} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">{c.role}</span>
                {!c.active && <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">oculto</span>}
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400">{c.credentials.join(" · ")}</p>
              <p className="text-[11px] text-neutral-500">
                {c.sections.length} {c.sections.length === 1 ? "bloco" : "blocos"} de currículo · {c.sections.reduce((n, s) => n + s.items.length, 0)} tópicos
              </p>
            </div>
            <VisibilityButton
              active={c.active}
              label={c.name}
              onToggle={() => run(c.active ? `${c.name} oculto do site` : `${c.name} visível no site`, "PUT", { entity: "coachesList", id: c.id, active: !c.active })}
            />
            <Btn aria-label={`Editar ${c.name}`} onClick={() => setEditing({ target: c })} title="Editar" variant="icon">
              <Pencil className="size-4" />
            </Btn>
            <DeleteButton label={c.name} onConfirm={() => run("Treinador excluído", "DELETE", undefined, `entity=coachesList&id=${encodeURIComponent(c.id)}`)} />
          </li>
        ))}
        {!list.length && <li className="rounded-2xl p-6 text-center text-sm text-neutral-500 ring-1 ring-white/5">Nenhum treinador cadastrado (a seção some da Home).</li>}
      </ul>

      <EditSheet
        description="Aparece na seção “Nosso time” da Home e no painel “Ler mais”."
        onClose={() => setEditing(null)}
        open={editing !== null}
        title={editing?.target ? `Editar ${editing.target.name}` : "Novo treinador"}
      >
        {editing && initial && (
          <CoachForm
            initial={initial}
            isNew={!editing.target}
            key={editing.target?.id ?? "new"}
            onCancel={() => setEditing(null)}
            onSubmit={async (d) => {
              const item = fromDraft(d);
              const ok = editing.target
                ? await run("Treinador salvo", "PUT", { entity: "coachesList", id: editing.target.id, item })
                : await run("Treinador cadastrado", "POST", { entity: "coachesList", item });
              if (ok) setEditing(null);
              return ok;
            }}
            suggestions={suggestions}
          />
        )}
      </EditSheet>
    </Panel>
  );
}
