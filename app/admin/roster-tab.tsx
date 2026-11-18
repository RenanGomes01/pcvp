"use client";

/**
 * Aba "Elenco" do /admin: atletas da órbita 3D da Home e dos painéis de perfil.
 * Lista com miniatura, categoria, olhinho de visibilidade, ordem, editar e excluir;
 * formulário lateral com dados do card, números e o perfil completo.
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
  itemsToLines,
  linesToItems,
  MoveButtons,
  movedIds,
  Panel,
  paragraphsToList,
  sheetFormCls,
  textareaCls,
  VisibilityButton,
  VisibleCheckbox,
  type TabProps,
} from "@/app/admin/ui";
import type { Athlete } from "@/lib/bento";
import { cn } from "@/lib/utils";
import { Medal, Pencil, Plus, Trophy } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

/** Rascunho do formulário: listas longas editadas como texto (uma linha por item). */
type Draft = {
  name: string;
  nickname: string;
  role: string;
  category: string;
  image: string;
  bio: string;
  tags: string;
  podiums: string;
  titles: string;
  quote: string;
  longBio: string;
  titleLines: string;
  awardLines: string;
  active: boolean;
};

const CATEGORY_SUGGESTIONS = ["Alto Rendimento", "Base / Sub-19", "Base / Sub-17", "Base / Sub-15", "Base", "Escolinha"];
const rolePrefix = (category: string) => `Atleta · ${category}`;

const EMPTY: Draft = {
  name: "",
  nickname: "",
  role: rolePrefix("Alto Rendimento"),
  category: "Alto Rendimento",
  image: "",
  bio: "",
  tags: "",
  podiums: "0",
  titles: "0",
  quote: "",
  longBio: "",
  titleLines: "",
  awardLines: "",
  active: true,
};

const toDraft = (a: Athlete): Draft => ({
  name: a.name,
  nickname: a.nickname,
  role: a.role,
  category: a.category,
  image: a.image,
  bio: a.bio,
  tags: a.tags.join(", "),
  podiums: String(a.stats.podiums),
  titles: String(a.stats.titles),
  quote: a.profile.quote,
  longBio: a.profile.longBio.join("\n\n"),
  titleLines: itemsToLines(a.profile.titles),
  awardLines: itemsToLines(a.profile.awards),
  active: a.active,
});

const fromDraft = (d: Draft) => ({
  name: d.name,
  nickname: d.nickname,
  role: d.role,
  category: d.category,
  image: d.image,
  bio: d.bio,
  tags: d.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
  stats: { podiums: d.podiums || "0", titles: d.titles || "0" },
  profile: { quote: d.quote, longBio: paragraphsToList(d.longBio), titles: linesToItems(d.titleLines), awards: linesToItems(d.awardLines) },
  active: d.active,
});

/* -------------------------------------------------------------------------- */
/*                                  formulário                                */
/* -------------------------------------------------------------------------- */

function AthleteForm({
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

  // legenda acompanha a categoria enquanto seguir o padrão "Atleta · <categoria>"
  const setCategory = (category: string) =>
    setD((x) => ({ ...x, category, role: !x.role.trim() || x.role === rolePrefix(x.category) ? rolePrefix(category) : x.role }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim() || !d.role.trim()) return setError("Preencha o nome e a legenda.");
    setError(null);
    setSaving(true);
    const ok = await onSubmit(d);
    setSaving(false);
    if (!ok) setError("Não foi possível salvar. Veja a mensagem no rodapé da tela.");
  };

  return (
    <form className={sheetFormCls} data-lenis-prevent="" onSubmit={submit}>
      <ImagePathField onChange={(v) => set("image", v)} round suggestions={suggestions} value={d.image} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field hint="Nome oficial (órbita, lista e perfil)." label="Nome">
          <input autoFocus={isNew} className={inputCls} maxLength={80} onChange={(e) => set("name", e.target.value)} required value={d.name} />
        </Field>
        <Field hint="Guardado à parte; não aparece junto do nome." label="Apelido">
          <input className={inputCls} maxLength={40} onChange={(e) => set("nickname", e.target.value)} placeholder="Ex.: Lippe" value={d.nickname} />
        </Field>
        <Field label="Categoria">
          <input className={inputCls} list="admin-athlete-categories" maxLength={60} onChange={(e) => setCategory(e.target.value)} value={d.category} />
          <datalist id="admin-athlete-categories">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field hint="Aparece embaixo do nome na órbita." label="Legenda (cargo)">
          <input className={inputCls} maxLength={80} onChange={(e) => set("role", e.target.value)} required value={d.role} />
        </Field>
      </div>

      <Field label="Resumo curto">
        <textarea className={textareaCls} maxLength={600} onChange={(e) => set("bio", e.target.value)} value={d.bio} />
      </Field>
      <Field hint="Separe por vírgula." label="Tags">
        <input className={inputCls} onChange={(e) => set("tags", e.target.value)} placeholder="Alto Rendimento, Cuiabá-MT" value={d.tags} />
      </Field>

      <FormGroup title="Números">
        <div className="grid grid-cols-2 gap-3">
          <Field hint="Campeão, vice e 3º lugar." label="Pódios">
            <input className={inputCls} inputMode="numeric" max={9999} min={0} onChange={(e) => set("podiums", e.target.value)} type="number" value={d.podiums} />
          </Field>
          <Field hint="Só os de campeão." label="Títulos">
            <input className={inputCls} inputMode="numeric" max={9999} min={0} onChange={(e) => set("titles", e.target.value)} type="number" value={d.titles} />
          </Field>
        </div>
        <p className="text-xs text-neutral-500">Aparecem como selos no topo do perfil. Deixe 0 para esconder.</p>
      </FormGroup>

      <FormGroup title="Perfil (painel lateral)">
        <Field label="Citação">
          <textarea className={cn(textareaCls, "min-h-20")} maxLength={600} onChange={(e) => set("quote", e.target.value)} value={d.quote} />
        </Field>
        <Field hint="Separe os parágrafos com uma linha em branco." label="Biografia">
          <textarea className={cn(textareaCls, "min-h-40")} onChange={(e) => set("longBio", e.target.value)} value={d.longBio} />
        </Field>
        <Field hint="Uma por linha. Ano opcional depois da barra: Campeã Estadual Sub-17 | 2023" label="Principais conquistas">
          <textarea className={cn(textareaCls, "min-h-32 font-mono text-xs")} onChange={(e) => set("titleLines", e.target.value)} value={d.titleLines} />
        </Field>
        <Field hint="Mesmo formato: MVP · Etapa Cuiabá | 2025" label="Prêmios individuais">
          <textarea className={cn(textareaCls, "min-h-20 font-mono text-xs")} onChange={(e) => set("awardLines", e.target.value)} value={d.awardLines} />
        </Field>
      </FormGroup>

      <VisibleCheckbox
        checked={d.active}
        hint="Exibir na órbita 3D do elenco na Home (desmarque para guardar o perfil sem mostrar no site)."
        onChange={(v) => set("active", v)}
      />

      <FormFooter error={error} onCancel={onCancel} saving={saving} submitLabel={isNew ? "Cadastrar atleta" : "Salvar"} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                     aba                                    */
/* -------------------------------------------------------------------------- */

export default function RosterTab({ data, run }: TabProps) {
  const list = useMemo(() => [...data.athletes].sort((a, b) => a.order - b.order), [data.athletes]);
  const suggestions = useMemo(() => imageSuggestions(data), [data]);
  const [editing, setEditing] = useState<{ target: Athlete | null } | null>(null);

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Elenco</h2>
          <p className="text-sm text-neutral-400">
            {list.filter((a) => a.active).length} visíveis de {list.length}. A ordem abaixo é a ordem dos cards na órbita 3D.
          </p>
        </div>
        <Btn onClick={() => setEditing({ target: null })} variant="primary">
          <Plus className="size-4" /> Novo atleta
        </Btn>
      </div>

      <ul className="grid gap-2 md:grid-cols-2">
        {list.map((a, i) => (
          <li className={cn("flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-white/5", !a.active && "opacity-50")} key={a.id}>
            <MoveButtons index={i} label={a.name} length={list.length} onMove={(dir) => run("Ordem atualizada", "PUT", { entity: "athletes", order: movedIds(list, i, dir) })} />
            <Avatar src={a.image} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="truncate text-sm font-semibold text-white">{a.name}</p>
                {a.nickname && <span className="text-xs text-neutral-500">“{a.nickname}”</span>}
                {!a.active && <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">oculto</span>}
              </div>
              <p className="truncate text-xs text-neutral-400">{a.category || a.role}</p>
              <p className="mt-0.5 flex gap-3 text-[11px] text-neutral-500 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Medal aria-hidden className="size-3" /> {a.stats.podiums} pódios
                </span>
                <span className="inline-flex items-center gap-1">
                  <Trophy aria-hidden className="size-3" /> {a.stats.titles} títulos
                </span>
              </p>
            </div>
            <VisibilityButton
              active={a.active}
              label={a.name}
              onToggle={() => run(a.active ? `${a.name} oculto do site` : `${a.name} visível no site`, "PUT", { entity: "athletes", id: a.id, active: !a.active })}
            />
            <Btn aria-label={`Editar ${a.name}`} onClick={() => setEditing({ target: a })} title="Editar" variant="icon">
              <Pencil className="size-4" />
            </Btn>
            <DeleteButton label={a.name} onConfirm={() => run("Atleta excluído", "DELETE", undefined, `entity=athletes&id=${encodeURIComponent(a.id)}`)} />
          </li>
        ))}
        {!list.length && <li className="rounded-2xl p-6 text-center text-sm text-neutral-500 ring-1 ring-white/5 md:col-span-2">Nenhum atleta cadastrado.</li>}
      </ul>

      <EditSheet
        description="Aparece na órbita 3D do elenco e no painel de perfil da Home."
        onClose={() => setEditing(null)}
        open={editing !== null}
        title={editing?.target ? `Editar ${editing.target.name}` : "Novo atleta"}
      >
        {editing && (
          <AthleteForm
            initial={editing.target ? toDraft(editing.target) : EMPTY}
            isNew={!editing.target}
            key={editing.target?.id ?? "new"}
            onCancel={() => setEditing(null)}
            onSubmit={async (d) => {
              const item = fromDraft(d);
              const ok = editing.target
                ? await run("Atleta salvo", "PUT", { entity: "athletes", id: editing.target.id, item })
                : await run("Atleta cadastrado", "POST", { entity: "athletes", item });
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
