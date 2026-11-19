"use client";

/**
 * Aba "Conquistas" do /admin: lista do feed + formulário lateral com
 *  - construtor padrão (chips) que monta o texto no padrão do site;
 *  - detector de conquistas do mesmo atleta (acumular +1x em vez de duplicar);
 *  - regras dos checkboxes (visível no feed; +1 no gráfico só para pódios).
 */

import { Avatar, BadgePill, Btn, DeleteButton, Field, inputCls, MoveButtons, movedIds, Panel, type TabProps } from "@/app/admin/ui";
import { BADGE_STYLES } from "@/components/site/achievement-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  accumulateBuilder,
  ACHIEVEMENT_KINDS,
  athleteOptions,
  BADGES,
  badgeForBuilder,
  buildAchievementText,
  CATEGORIES,
  countsAsPodium,
  emptyBuilder,
  guessBuilder,
  isLogoAvatar,
  isValidPeriod,
  normalizePeriod,
  periodEndYear,
  podiumFieldFor,
  TEAM_CATEGORIES,
  TEAM_TOURNAMENTS,
  TOURNAMENTS,
  type Achievement,
  type AchievementBuilder,
  type Badge,
  type Category,
  type TextGender,
} from "@/lib/bento";
import { cn } from "@/lib/utils";
import { Check, Eye, EyeOff, Info, Layers, LoaderCircle, Pencil, Plus, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

type AchievementDraft = Omit<Achievement, "id" | "order">;

const emptyAchievement = (): AchievementDraft => {
  const builder = emptyBuilder();
  return {
    athleteName: "",
    avatar: "",
    text: buildAchievementText(builder),
    badge: badgeForBuilder(builder),
    year: String(new Date().getFullYear()),
    active: true, // nova conquista já aparece no feed
    builder,
  };
};

type Editing = { mode: "new" } | { mode: "edit"; target: Achievement } | { mode: "merge"; target: Achievement; draft: AchievementDraft };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

/** Mesmo atleta: mesma foto (do elenco) ou mesmo nome exibido. */
const sameAthlete = (a: Pick<Achievement, "athleteName" | "avatar">, d: Pick<Achievement, "athleteName" | "avatar">) =>
  (!!d.avatar && a.avatar === d.avatar) || (!!d.athleteName.trim() && norm(a.athleteName) === norm(d.athleteName));

/* -------------------------------------------------------------------------- */
/*                                    chips                                   */
/* -------------------------------------------------------------------------- */

function Chip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
        selected ? "bg-brand text-on-brand ring-brand" : "bg-white/[0.03] text-neutral-300 ring-white/10 hover:text-white hover:ring-white/25",
        className
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const COUNTS = [1, 2, 3, 4, 5] as const;
const GENDERS: { id: TextGender; label: string }[] = [
  { id: "m", label: "Masculino" },
  { id: "f", label: "Feminino" },
  { id: "n", label: "Neutro (a)" },
];

/* -------------------------------------------------------------------------- */
/*                              construtor padrão                             */
/* -------------------------------------------------------------------------- */

function BuilderPanel({ b, team, onChange }: { b: AchievementBuilder; team: boolean; onChange: (patch: Partial<AchievementBuilder>) => void }) {
  const [periodRaw, setPeriodRaw] = useState(b.period);
  const periodOk = isValidPeriod(periodRaw);
  const toggleCat = (c: Category) => onChange({ categories: b.categories.includes(c) ? b.categories.filter((x) => x !== c) : [...b.categories, c] });
  // chips de ranking/institucionais: só para o Time / CT (ou se já estiverem marcados)
  const isTeamT = (id: string) => (TEAM_TOURNAMENTS as readonly string[]).includes(id);
  const tournaments = team
    ? [...TOURNAMENTS.filter((t) => isTeamT(t.id)), ...TOURNAMENTS.filter((t) => !isTeamT(t.id))]
    : TOURNAMENTS.filter((t) => !isTeamT(t.id) || b.tournament === t.id);
  const categories = CATEGORIES.filter((c) => team || !TEAM_CATEGORIES.includes(c) || b.categories.includes(c));

  return (
    <div className="flex flex-col gap-3.5">
      <ChipRow label="Tipo de conquista">
        {ACHIEVEMENT_KINDS.map((k) => (
          <Chip key={k} onClick={() => onChange({ kind: k })} selected={b.kind === k}>
            {k}
          </Chip>
        ))}
      </ChipRow>

      <ChipRow label="Frequência / acúmulo">
        {COUNTS.map((n) => (
          <Chip key={n} onClick={() => onChange({ count: n === 5 ? Math.max(5, b.count) : n })} selected={n === 5 ? b.count >= 5 : b.count === n}>
            {n === 5 ? "5x+" : `${n}x`}
          </Chip>
        ))}
        {b.count >= 5 && (
          <input
            aria-label="Quantidade de vezes"
            className={cn(inputCls, "w-20 py-1 text-xs")}
            inputMode="numeric"
            max={99}
            min={5}
            onChange={(e) => onChange({ count: Math.max(5, Math.min(99, Number(e.target.value.replace(/\D/g, "")) || 5)) })}
            type="number"
            value={b.count}
          />
        )}
      </ChipRow>

      <ChipRow label="Torneio / entidade">
        {tournaments.map((t) => (
          <Chip key={t.id} onClick={() => onChange({ tournament: b.tournament === t.id ? "" : t.id })} selected={b.tournament === t.id}>
            {t.label}
          </Chip>
        ))}
      </ChipRow>

      <ChipRow label="Categoria (uma ou mais)">
        {categories.map((c) => (
          <Chip key={c} onClick={() => toggleCat(c)} selected={b.categories.includes(c)}>
            {c}
          </Chip>
        ))}
      </ChipRow>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field hint={periodOk ? "Um ano (2026) ou intervalo (2025–2026)." : undefined} label="Período / ano exibido">
          <input
            aria-invalid={!periodOk}
            className={cn(inputCls, !periodOk && "ring-red-500/60")}
            maxLength={11}
            onBlur={() => {
              const p = normalizePeriod(periodRaw);
              setPeriodRaw(p);
              if (isValidPeriod(p)) onChange({ period: p });
            }}
            onChange={(e) => {
              setPeriodRaw(e.target.value);
              if (isValidPeriod(e.target.value)) onChange({ period: normalizePeriod(e.target.value) });
            }}
            placeholder="2026 ou 2025–2026"
            value={periodRaw}
          />
          {!periodOk && (
            <span className="text-xs text-red-400" role="alert">
              Use um ano (2026) ou um intervalo (2025–2026).
            </span>
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-neutral-400">Gênero do texto</span>
          <div className="flex gap-1.5">
            {GENDERS.map((x) => (
              <Chip className="px-2.5" key={x.id} onClick={() => onChange({ gender: x.id })} selected={b.gender === x.id}>
                {x.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  formulário                                */
/* -------------------------------------------------------------------------- */

type FormProps = {
  editing: Editing;
  initial: AchievementDraft;
  /** Todas as conquistas (para o detector de atleta repetido). */
  all: Achievement[];
  /** Atletas do elenco (aba Elenco) para o seletor rápido. */
  options: ReturnType<typeof athleteOptions>;
  onSubmit: (draft: AchievementDraft, addToPodium: boolean) => Promise<void>;
  onCancel: () => void;
  onEditExisting: (a: Achievement) => void;
  onAccumulate: (a: Achievement, incoming: { builder?: AchievementBuilder; year: string }) => void;
};

function AchievementForm({ editing, initial, all, options, onSubmit, onCancel, onEditExisting, onAccumulate }: FormProps) {
  const isNew = editing.mode === "new";
  const isMerge = editing.mode === "merge";
  const [d, setD] = useState(initial);
  const [useBuilder, setUseBuilder] = useState(Boolean(initial.builder));
  const [b, setB] = useState<AchievementBuilder>(initial.builder ?? emptyBuilder());
  // texto editado à mão: o construtor para de sobrescrever até "Regenerar"
  const [manualText, setManualText] = useState(Boolean(initial.builder) && initial.text !== buildAchievementText(initial.builder!));
  const [addToPodium, setAddToPodium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AchievementDraft>(k: K, v: AchievementDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const kind = useBuilder ? b.kind : undefined;
  const podiumAllowed = countsAsPodium(d.badge, kind);
  const field = podiumFieldFor(d.badge) === "estadual" ? "Estadual" : "Nacional & Inter.";
  // valor do <select> = índice da pessoa (nome + foto batem); "" = personalizado
  const pickedIndex = options.findIndex((a) => a.avatar === d.avatar && a.name === d.athleteName);
  const picked = pickedIndex < 0 ? "" : String(pickedIndex);
  const coachOptions = options.filter((o) => o.group === "coach");
  // origem Time / CT (PCVP): pela opção escolhida ou pela logo como avatar (o nome é editável)
  const isTeam = options[pickedIndex]?.group === "team" || isLogoAvatar(d.avatar);

  /** Aplica uma mudança no construtor e propaga texto, badge e ano. */
  const applyBuilder = (next: AchievementBuilder, keepManual = manualText) => {
    setB(next);
    setD((x) => ({
      ...x,
      badge: badgeForBuilder(next),
      year: periodEndYear(next.period) || x.year,
      text: keepManual ? x.text : buildAchievementText(next),
    }));
    if (!countsAsPodium(badgeForBuilder(next), next.kind)) setAddToPodium(false);
  };

  const updateBuilder = (patch: Partial<AchievementBuilder>) => {
    const next = { ...b, ...patch };
    // Seleção ⇄ Convocação andam juntas
    if (patch.kind === "Convocação Seleção") next.tournament = "selecao";
    else if (patch.kind && b.tournament === "selecao") next.tournament = "";
    if (patch.tournament === "selecao") next.kind = "Convocação Seleção";
    else if (patch.tournament !== undefined && b.kind === "Convocação Seleção") next.kind = "Campeão";
    applyBuilder(next);
  };

  const enableBuilder = () => {
    const guessed = guessBuilder(d);
    setUseBuilder(true);
    setManualText(false);
    applyBuilder(guessed, false);
  };

  // conquistas já cadastradas deste atleta (só ao criar); as parecidas primeiro
  const sameAthleteList = useMemo(() => {
    if (!isNew) return [];
    const mine = all.filter((a) => sameAthlete(a, d));
    const similar = (a: Achievement) => a.badge === d.badge || (useBuilder && !!b.tournament && (a.builder ?? guessBuilder(a)).tournament === b.tournament);
    return mine.map((a) => ({ a, similar: similar(a) })).sort((x, y) => Number(y.similar) - Number(x.similar));
  }, [all, d, b.tournament, isNew, useBuilder]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (useBuilder && !isValidPeriod(b.period)) return setError("Período inválido.");
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ ...d, builder: useBuilder ? { ...b, period: normalizePeriod(b.period) } : undefined }, (isNew || isMerge) && podiumAllowed && addToPodium);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pb-6" data-lenis-prevent="" onSubmit={submit}>
      {isMerge && (
        <div className="rounded-2xl bg-brand/10 p-3 text-sm ring-1 ring-brand/30">
          <p className="flex items-center gap-1.5 font-semibold text-white">
            <Layers className="size-4 text-brand" /> Acumulando na conquista existente
          </p>
          <p className="mt-1 text-xs text-neutral-300">
            Contagem, categorias e período já foram somados. Revise e salve: o card continua um só no feed.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Texto anterior: <span className="text-neutral-200">“{editing.target.text}”</span>
          </p>
          {!editing.target.builder && (
            <p className="mt-1 text-xs text-amber-400">Esta conquista era texto livre: a estrutura foi deduzida do texto. Confira os chips abaixo.</p>
          )}
        </div>
      )}

      {/* atleta ou treinador */}
      <Field hint="Preenche nome e foto automaticamente (Time / CT e comissão técnica no topo)." label="Origem: time, treinador ou atleta">
        <select
          className={inputCls}
          onChange={(e) => {
            const a = e.target.value === "" ? undefined : options[Number(e.target.value)];
            if (!a) return;
            setD((x) => ({ ...x, athleteName: a.name, avatar: a.avatar }));
            if (a.group === "team") {
              // marcos do time não somam no gráfico por padrão
              setAddToPodium(false);
              // construtor ainda intocado numa conquista nova: já começa no ranking ABRTVP
              const pristine = buildAchievementText(b) === buildAchievementText(emptyBuilder()) && !b.period;
              if (isNew && useBuilder && pristine) updateBuilder({ kind: "Título Geral / Ranking", tournament: "abrtvp", categories: ["Geral"], gender: "m" });
            }
          }}
          value={picked}
        >
          <option value="">Personalizado…</option>
          {(["team", "coach", "athlete"] as const).map((group) => (
            <optgroup key={group} label={{ team: "Time / CT (PCVP)", coach: "Comissão técnica", athlete: "Elenco" }[group]}>
              {options.map((a, i) =>
                a.group === group ? (
                  <option key={`${group}-${i}`} value={i}>
                    {a.name === a.fullName ? a.name : `${a.name} — ${a.fullName}`}
                  </option>
                ) : null
              )}
            </optgroup>
          ))}
        </select>
      </Field>
      {coachOptions.some((o) => o.avatar === d.avatar && o.name === d.athleteName) && (
        <p className="-mt-2 flex items-start gap-1.5 text-xs text-neutral-400">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" />
          Conquista de treinador: o construtor escreve no modelo de atleta (“Convocado(a)…”). Para convocações de comissão técnica, use “Texto livre”.
        </p>
      )}
      <div className="flex items-end gap-3">
        <Avatar className="size-14" src={d.avatar} />
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Nome exibido">
            <input className={inputCls} maxLength={60} onChange={(e) => set("athleteName", e.target.value)} required value={d.athleteName} />
          </Field>
          <Field label="Foto (avatar)">
            <input className={inputCls} maxLength={500} onChange={(e) => set("avatar", e.target.value)} placeholder="/atletas/…" required value={d.avatar} />
          </Field>
        </div>
      </div>

      {/* detector: mesmo atleta */}
      {sameAthleteList.length > 0 && (
        <section aria-label="Conquistas já cadastradas deste atleta" className="rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-500/30">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Info className="size-4 text-amber-400" /> {d.athleteName || "Este atleta"} já tem {sameAthleteList.length}{" "}
            {sameAthleteList.length === 1 ? "conquista" : "conquistas"} no feed
          </p>
          <p className="mt-0.5 mb-2.5 text-xs text-neutral-400">Se for o mesmo torneio, some no card existente em vez de criar outro.</p>
          <ul className="space-y-2">
            {sameAthleteList.map(({ a, similar }) => (
              <li className="rounded-xl bg-neutral-950/40 p-2.5 ring-1 ring-white/10" key={a.id}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <BadgePill badge={a.badge} />
                  {similar && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Parecida</span>}
                  {!a.active && <span className="text-[10px] text-neutral-500 uppercase">oculta</span>}
                </div>
                <p className="mt-1 text-xs text-neutral-200">{a.text}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Btn
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => onAccumulate(a, { builder: useBuilder ? b : undefined, year: d.year })}
                    variant="primary"
                  >
                    <Plus className="size-3.5" /> Somar +1x / Atualizar esta conquista
                  </Btn>
                  <Btn className="px-2.5 py-1.5 text-xs" onClick={() => onEditExisting(a)}>
                    <Pencil className="size-3.5" /> Editar existente
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* construtor */}
      <section className="rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Wand2 className="size-4 text-brand" /> Construtor padrão
          </p>
          {useBuilder ? (
            <Btn className="px-2.5 py-1 text-xs" onClick={() => setUseBuilder(false)}>
              Texto livre
            </Btn>
          ) : (
            <Btn className="px-2.5 py-1 text-xs" onClick={enableBuilder}>
              <Sparkles className="size-3.5" /> Usar construtor
            </Btn>
          )}
        </div>
        {useBuilder ? (
          <BuilderPanel b={b} onChange={updateBuilder} team={isTeam} />
        ) : (
          <p className="text-xs text-neutral-400">
            Modo texto livre. “Usar construtor” deduz os campos a partir do texto atual para padronizá-lo.
          </p>
        )}
      </section>

      {/* texto final */}
      <Field label="Texto exibido no card">
        <textarea
          className={cn(inputCls, "min-h-16 resize-y")}
          maxLength={200}
          onChange={(e) => {
            set("text", e.target.value);
            if (useBuilder) setManualText(true);
          }}
          required
          value={d.text}
        />
      </Field>
      {useBuilder && manualText && (
        <p className="-mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          Texto ajustado à mão (o construtor não sobrescreve).
          <button
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
            onClick={() => {
              setManualText(false);
              set("text", buildAchievementText(b));
            }}
            type="button"
          >
            <RefreshCw className="size-3" /> Regenerar do construtor
          </button>
        </p>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium tracking-wide text-neutral-400">
          Badge {useBuilder && <span className="text-neutral-500">(definida pelo construtor; pode ajustar)</span>}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BADGES.map((x) => (
            <button
              aria-pressed={d.badge === x}
              className={cn(
                "rounded-xl px-2 py-2 text-xs font-semibold ring-1 transition-colors",
                d.badge === x ? cn(BADGE_STYLES[x], "ring-brand") : "bg-white/[0.03] text-neutral-400 ring-white/10 hover:text-white"
              )}
              key={x}
              onClick={() => {
                set("badge", x as Badge);
                if (!countsAsPodium(x as Badge, kind)) setAddToPodium(false);
              }}
              type="button"
            >
              {x}
            </button>
          ))}
        </div>
      </fieldset>

      <Field hint="Usado no +1 do gráfico. O construtor preenche com o último ano do período." label="Ano do resultado">
        <input
          className={cn(inputCls, "w-28")}
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))}
          pattern="\d{4}"
          placeholder="2026"
          required={addToPodium}
          value={d.year}
        />
      </Field>

      <label className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3 text-sm text-neutral-200 ring-1 ring-white/10">
        <input checked={d.active} className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" onChange={(e) => set("active", e.target.checked)} type="checkbox" />
        <span>
          Visível no site
          <span className="mt-0.5 block text-xs text-neutral-400">
            Exibir no feed animado da Home (desmarque para guardar apenas no histórico sem mostrar na tela inicial).
          </span>
        </span>
      </label>

      {(isNew || isMerge) && (
        <label
          className={cn(
            "flex items-start gap-3 rounded-2xl p-3 text-sm ring-1",
            podiumAllowed ? "bg-brand/10 text-neutral-200 ring-brand/30" : "bg-white/[0.02] text-neutral-500 ring-white/10"
          )}
        >
          <input
            checked={podiumAllowed && addToPodium}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)] disabled:opacity-40"
            disabled={!podiumAllowed}
            onChange={(e) => setAddToPodium(e.target.checked)}
            type="checkbox"
          />
          <span>
            Somar +1 automaticamente no gráfico de Pódios do ano correspondente
            {podiumAllowed && isTeam ? (
              <span className="mt-0.5 block text-xs text-neutral-400">
                Conquista do Time / CT: rankings e marcos institucionais não entram como pódio avulso no gráfico de areia. Marque só se este resultado
                for mesmo um pódio novo do time (vai somar em <strong className="text-brand">{field}</strong> de {d.year || "—"}).
              </span>
            ) : podiumAllowed ? (
              <span className="mt-0.5 block text-xs text-neutral-400">
                Vai somar em <strong className="text-brand">{field}</strong> de {d.year || "—"} (cria o ano se ainda não existir).
                {isMerge && " Marque se este acúmulo é um pódio novo."}
              </span>
            ) : (
              <span className="mt-0.5 block text-xs text-neutral-400">
                Convocações para a Seleção entram no feed de Conquistas, mas não contam como pódio (1º, 2º ou 3º lugar) no gráfico de areia.
              </span>
            )}
          </span>
        </label>
      )}

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
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{" "}
          {isNew ? "Criar conquista" : isMerge ? "Salvar acumulado" : "Salvar"}
        </Btn>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                     aba                                    */
/* -------------------------------------------------------------------------- */

const TITLES: Record<Editing["mode"], string> = { new: "Nova conquista", edit: "Editar conquista", merge: "Acumular conquista" };

export default function AchievementsTab({ data, run }: TabProps) {
  const list = useMemo(() => [...data.achievements].sort((a, b) => a.order - b.order), [data.achievements]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const options = useMemo(() => athleteOptions(data.athletes, data.coachesList), [data.athletes, data.coachesList]);

  const accumulate = (a: Achievement, incoming: { builder?: AchievementBuilder; year: string }) => {
    const base = a.builder ?? guessBuilder(a);
    const acc = accumulateBuilder(base, { categories: incoming.builder?.categories, period: incoming.builder?.period, year: incoming.year });
    setEditing({
      mode: "merge",
      target: a,
      draft: { ...a, builder: acc, text: buildAchievementText(acc), badge: badgeForBuilder(acc), year: periodEndYear(acc.period) || a.year },
    });
  };

  const initial: AchievementDraft | null =
    editing === null ? null : editing.mode === "new" ? emptyAchievement() : editing.mode === "merge" ? editing.draft : editing.target;

  return (
    <Panel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Feed de troféus</h2>
          <p className="text-sm text-neutral-400">
            {list.filter((a) => a.active).length} visíveis de {list.length}. A ordem abaixo é a ordem do feed na Home.
          </p>
        </div>
        <Btn onClick={() => setEditing({ mode: "new" })} variant="primary">
          <Plus className="size-4" /> Nova conquista
        </Btn>
      </div>

      <ul className="space-y-2">
        {list.map((a, i) => (
          <li className={cn("flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-white/5", !a.active && "opacity-50")} key={a.id}>
            <MoveButtons index={i} label={a.athleteName} length={list.length} onMove={(dir) => run("Ordem atualizada", "PUT", { entity: "achievements", order: movedIds(list, i, dir) })} />
            <Avatar src={a.avatar} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{a.athleteName}</p>
                <BadgePill badge={a.badge} />
                {!a.active && <span className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">oculta</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-neutral-400">
                {a.text}
                {a.year && !a.text.includes(a.year) && <span className="text-neutral-500"> · {a.year}</span>}
              </p>
            </div>
            <Btn
              aria-label={a.active ? `Ocultar ${a.athleteName}` : `Mostrar ${a.athleteName}`}
              onClick={() => run(a.active ? "Conquista ocultada" : "Conquista visível", "PUT", { entity: "achievements", id: a.id, item: { ...a, active: !a.active } })}
              title={a.active ? "Ocultar do site" : "Mostrar no site"}
              variant="icon"
            >
              {a.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Btn>
            <Btn aria-label={`Editar ${a.athleteName}`} onClick={() => setEditing({ mode: "edit", target: a })} title="Editar" variant="icon">
              <Pencil className="size-4" />
            </Btn>
            <DeleteButton label={a.athleteName} onConfirm={() => run("Conquista excluída", "DELETE", undefined, `entity=achievements&id=${encodeURIComponent(a.id)}`)} />
          </li>
        ))}
        {!list.length && <li className="rounded-2xl p-6 text-center text-sm text-neutral-500 ring-1 ring-white/5">Nenhuma conquista cadastrada.</li>}
      </ul>

      <Sheet onOpenChange={(open) => !open && setEditing(null)} open={editing !== null}>
        <SheetContent className="gap-0 border-white/10 bg-neutral-950 p-0 text-neutral-200 data-[side=right]:w-full data-[side=right]:sm:max-w-xl" side="right">
          <SheetHeader className="p-6 pr-14">
            <SheetTitle className="text-xl font-semibold text-white">{editing ? TITLES[editing.mode] : ""}</SheetTitle>
            <SheetDescription className="text-neutral-400">Aparece no feed “Conquistas” da Home.</SheetDescription>
          </SheetHeader>
          {editing && initial && (
            <AchievementForm
              all={data.achievements}
              options={options}
              editing={editing}
              initial={initial}
              key={editing.mode === "new" ? "new" : `${editing.mode}-${editing.target.id}`}
              onAccumulate={accumulate}
              onCancel={() => setEditing(null)}
              onEditExisting={(a) => setEditing({ mode: "edit", target: a })}
              onSubmit={async (draft, addToPodium) => {
                const pod = addToPodium ? ` e +1 em ${draft.year}` : "";
                const ok =
                  editing.mode === "new"
                    ? await run(`Conquista criada${pod}`, "POST", { entity: "achievements", item: draft, addToPodium })
                    : await run(editing.mode === "merge" ? `Conquista acumulada${pod}` : "Conquista salva", "PUT", {
                        entity: "achievements",
                        id: editing.target.id,
                        item: draft,
                        addToPodium,
                      });
                if (ok) setEditing(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </Panel>
  );
}
