"use client";

/**
 * /admin — painel do conteúdo editável da Home: Bento Grid (Conquistas, Pódios
 * do time e Próximos jogos), Elenco (órbita 3D) e Comissão Técnica.
 *
 * Login por senha: a senha fica no sessionStorage (some ao fechar a aba) e vai
 * em cada chamada no header `x-admin-key`; quem valida é a rota /api/bento.
 */

import AchievementsTab from "@/app/admin/achievements-tab";
import CoachesTab from "@/app/admin/coaches-tab";
import RosterTab from "@/app/admin/roster-tab";
import { Btn, DeleteButton, Field, inputCls, MoveButtons, movedIds, Panel, type Run, type TabProps } from "@/app/admin/ui";
import { toView, type BentoData, type Match, type PodiumYear } from "@/lib/bento";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Swords,
  Trophy,
  Users,
  Whistle,
  X,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const KEY_STORAGE = "pcvp-admin-key";
const API = "/api/bento";

/* -------------------------------------------------------------------------- */
/*                                 api / sessão                               */
/* -------------------------------------------------------------------------- */

function readKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}
function writeKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    /* sessionStorage indisponível: a sessão vale só enquanto a página estiver aberta */
  }
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function api(key: string, method: "GET" | "POST" | "PUT" | "DELETE", payload?: Record<string, unknown>, query?: string): Promise<BentoData> {
  const res = await fetch(query ? `${API}?${query}` : API, {
    method,
    headers: { "x-admin-key": key, ...(payload ? { "content-type": "application/json" } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error ?? `Erro ${res.status}`);
  return json.raw as BentoData;
}

/* -------------------------------------------------------------------------- */
/*                                    login                                   */
/* -------------------------------------------------------------------------- */

function Login({ onLogin }: { onLogin: (key: string, data: BentoData) => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      onLogin(password, await api(password, "GET"));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Senha incorreta." : (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-950 px-4">
      <form className="w-full max-w-sm rounded-3xl bg-neutral-900 p-7 ring-1 ring-white/10" onSubmit={submit}>
        <span className="mb-6 grid size-11 place-items-center rounded-2xl bg-brand text-on-brand">
          <Trophy className="size-5" />
        </span>
        <p className="mb-1 text-xs font-medium tracking-[0.3em] text-brand uppercase">Painel</p>
        <h1 className="text-2xl font-semibold text-white">Área administrativa</h1>
        <p className="mt-1 mb-6 text-sm text-neutral-400">Gerencie conquistas, pódios, jogos, elenco e comissão técnica do site.</p>
        <Field label="Senha">
          <div className="relative">
            <input
              autoComplete="current-password"
              autoFocus
              className={cn(inputCls, "pr-10")}
              onChange={(e) => setPassword(e.target.value)}
              required
              type={show ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-neutral-400 hover:text-white"
              onClick={() => setShow((s) => !s)}
              type="button"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <Btn className="mt-6 w-full" disabled={loading || !password} type="submit" variant="primary">
          {loading && <LoaderCircle className="size-4 animate-spin" />} Entrar
        </Btn>
      </form>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                              aba 2: pódios                                 */
/* -------------------------------------------------------------------------- */

function PodiumsTab({ data, run }: TabProps) {
  const saved = useMemo(() => [...data.podiumYears].sort((a, b) => a.year.localeCompare(b.year)), [data.podiumYears]);
  // edições locais por ano (só os campos alterados); o Geral e os totais já refletem o rascunho
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<"estadual" | "nacionalInter", string>>>>({});
  const [newYear, setNewYear] = useState("");

  const rows = saved.map((y) => {
    const dr = drafts[y.year] ?? {};
    const num = (v: string | undefined, fallback: number) => (v === undefined ? fallback : Math.max(0, Math.min(9999, Math.trunc(Number(v) || 0))));
    const estadual = num(dr.estadual, y.estadual);
    const nacionalInter = num(dr.nacionalInter, y.nacionalInter);
    return { saved: y, estadual, nacionalInter, dirty: estadual !== y.estadual || nacionalInter !== y.nacionalInter, draft: dr };
  });
  const totals = rows.reduce((t, r) => ({ estadual: t.estadual + r.estadual, nacionalInter: t.nacionalInter + r.nacionalInter }), { estadual: 0, nacionalInter: 0 });
  const dirtyRows = rows.filter((r) => r.dirty);
  const suggestedYear = String(Math.max(new Date().getFullYear(), ...saved.map((y) => Number(y.year) + 1)));

  const setField = (year: string, field: "estadual" | "nacionalInter", value: string) =>
    setDrafts((d) => ({ ...d, [year]: { ...d[year], [field]: value.replace(/\D/g, "").slice(0, 4) } }));

  const saveAll = async () => {
    for (const r of dirtyRows) {
      const item: PodiumYear = { year: r.saved.year, estadual: r.estadual, nacionalInter: r.nacionalInter };
      if (!(await run(`Pódios de ${r.saved.year} salvos`, "PUT", { entity: "podiumYears", year: r.saved.year, item }))) return;
    }
    setDrafts({});
  };

  const addYear = async (e: FormEvent) => {
    e.preventDefault();
    const year = newYear || suggestedYear;
    if (await run(`Ano ${year} adicionado`, "POST", { entity: "podiumYears", item: { year, estadual: 0, nacionalInter: 0 } })) setNewYear("");
  };

  const stat = (label: string, value: number, accent?: boolean) => (
    <div className={cn("rounded-2xl p-4 ring-1", accent ? "bg-brand text-on-brand ring-brand" : "bg-white/[0.03] ring-white/10")}>
      <p className={cn("text-xs font-medium", accent ? "text-on-brand/80" : "text-neutral-400")}>{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", !accent && "text-white")}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stat("Total acumulado (Geral)", totals.estadual + totals.nacionalInter, true)}
        {stat("Estadual", totals.estadual)}
        {stat("Nacional & Inter.", totals.nacionalInter)}
      </div>

      <Panel>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Pódios por temporada</h2>
            <p className="text-sm text-neutral-400">O Geral de cada ano e o total são sempre a soma Estadual + Nacional & Inter.</p>
          </div>
          <div className="flex gap-2">
            {dirtyRows.length > 0 && (
              <Btn onClick={() => setDrafts({})}>
                <X className="size-4" /> Descartar
              </Btn>
            )}
            <Btn disabled={!dirtyRows.length} onClick={saveAll} variant="primary">
              <Check className="size-4" /> Salvar alterações{dirtyRows.length > 0 && ` (${dirtyRows.length})`}
            </Btn>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="w-24 pb-2 font-medium">Ano</th>
                <th className="pb-2 font-medium">Estadual</th>
                <th className="pb-2 font-medium">Nacional & Inter.</th>
                <th className="pb-2 text-right font-medium">Geral</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr className="border-t border-white/5" key={r.saved.year}>
                  <th className="py-2.5 pr-3 text-left font-mono text-base font-semibold text-white" scope="row">
                    {r.saved.year}
                    {r.dirty && <span className="ml-2 inline-block size-1.5 rounded-full bg-brand align-middle" title="Alteração não salva" />}
                  </th>
                  {(["estadual", "nacionalInter"] as const).map((f) => (
                    <td className="py-2.5 pr-3" key={f}>
                      <input
                        aria-label={`${f === "estadual" ? "Estadual" : "Nacional & Inter."} ${r.saved.year}`}
                        className={cn(inputCls, "w-28 tabular-nums")}
                        inputMode="numeric"
                        onChange={(e) => setField(r.saved.year, f, e.target.value)}
                        value={r.draft[f] ?? String(r.saved[f])}
                      />
                    </td>
                  ))}
                  <td className="py-2.5 pr-3 text-right text-lg font-semibold text-brand tabular-nums">{r.estadual + r.nacionalInter}</td>
                  <td className="py-2.5 text-right">
                    <DeleteButton label={`o ano ${r.saved.year}`} onConfirm={() => run(`Ano ${r.saved.year} excluído`, "DELETE", undefined, `entity=podiumYears&id=${r.saved.year}`)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="mt-5 flex flex-wrap items-end gap-2 border-t border-white/5 pt-5" onSubmit={addYear}>
          <Field label="Novo ano">
            <input
              className={cn(inputCls, "w-28 font-mono")}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setNewYear(e.target.value.replace(/\D/g, ""))}
              pattern="\d{4}"
              placeholder={suggestedYear}
              value={newYear}
            />
          </Field>
          <Btn type="submit">
            <Plus className="size-4" /> Adicionar ano
          </Btn>
        </form>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            aba 3: próximos jogos                           */
/* -------------------------------------------------------------------------- */

type MatchDraft = Omit<Match, "id" | "order">;
const emptyMatch = (): MatchDraft => ({ date: "", title: "", location: "", tag: "" });

function MatchForm({ initial, onSubmit, onCancel, submitLabel }: { initial: MatchDraft; onSubmit: (d: MatchDraft) => Promise<boolean>; onCancel?: () => void; submitLabel: string }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof MatchDraft, v: string) => setD((x) => ({ ...x, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(d);
    setSaving(false);
    if (ok && !onCancel) setD(emptyMatch());
  };
  return (
    <form className="grid gap-3 sm:grid-cols-[7rem_1fr_1fr_8rem_auto] sm:items-end" onSubmit={submit}>
      <Field label="Data">
        <input className={cn(inputCls, "uppercase")} maxLength={20} onChange={(e) => set("date", e.target.value)} placeholder="07 DEZ" required value={d.date} />
      </Field>
      <Field label="Campeonato">
        <input className={inputCls} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="Circuito Estadual · Etapa 5" required value={d.title} />
      </Field>
      <Field label="Local">
        <input className={inputCls} maxLength={120} onChange={(e) => set("location", e.target.value)} placeholder="Praia Central" required value={d.location} />
      </Field>
      <Field label="Tag (opcional)">
        <input className={inputCls} maxLength={40} onChange={(e) => set("tag", e.target.value)} placeholder="Sub-19" value={d.tag ?? ""} />
      </Field>
      <div className="flex gap-2">
        {onCancel && (
          <Btn aria-label="Cancelar edição" onClick={onCancel} variant="icon">
            <X className="size-4" />
          </Btn>
        )}
        <Btn className="flex-1 sm:flex-none" disabled={saving} type="submit" variant="primary">
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : onCancel ? <Check className="size-4" /> : <Plus className="size-4" />} {submitLabel}
        </Btn>
      </div>
    </form>
  );
}

function MatchesTab({ data, run }: TabProps) {
  const list = useMemo(() => [...data.matches].sort((a, b) => a.order - b.order), [data.matches]);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Panel>
        <h2 className="mb-4 text-lg font-semibold text-white">Novo jogo</h2>
        <MatchForm initial={emptyMatch()} onSubmit={(item) => run("Jogo adicionado", "POST", { entity: "matches", item })} submitLabel="Adicionar" />
      </Panel>
      <Panel>
        <h2 className="mb-1 text-lg font-semibold text-white">Calendário</h2>
        <p className="mb-4 text-sm text-neutral-400">A ordem abaixo é a ordem exibida na Home.</p>
        <ul className="space-y-2">
          {list.map((m, i) =>
            editing === m.id ? (
              <li className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-brand/40" key={m.id}>
                <MatchForm
                  initial={{ date: m.date, title: m.title, location: m.location, tag: m.tag ?? "" }}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (item) => {
                    const ok = await run("Jogo salvo", "PUT", { entity: "matches", id: m.id, item });
                    if (ok) setEditing(null);
                    return ok;
                  }}
                  submitLabel="Salvar"
                />
              </li>
            ) : (
              <li className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-white/5" key={m.id}>
                <MoveButtons index={i} label={m.title} length={list.length} onMove={(dir) => run("Ordem atualizada", "PUT", { entity: "matches", order: movedIds(list, i, dir) })} />
                <span className="w-16 shrink-0 text-center text-xs font-semibold text-brand">{m.date}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{m.title}</span>
                    {m.tag && <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">{m.tag}</span>}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-neutral-400">
                    <MapPin className="size-3" /> {m.location}
                  </span>
                </span>
                <Btn aria-label={`Editar ${m.title}`} onClick={() => setEditing(m.id)} title="Editar" variant="icon">
                  <Pencil className="size-4" />
                </Btn>
                <DeleteButton label={m.title} onConfirm={() => run("Jogo excluído", "DELETE", undefined, `entity=matches&id=${encodeURIComponent(m.id)}`)} />
              </li>
            )
          )}
          {!list.length && <li className="rounded-2xl p-6 text-center text-sm text-neutral-500 ring-1 ring-white/5">Nenhum jogo no calendário.</li>}
        </ul>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    painel                                  */
/* -------------------------------------------------------------------------- */


const TABS = [
  { id: "achievements", label: "Conquistas", icon: Trophy },
  { id: "podiums", label: "Pódios do time", icon: Swords },
  { id: "matches", label: "Próximos jogos", icon: CalendarDays },
  { id: "roster", label: "Elenco", icon: Users },
  { id: "coaches", label: "Comissão Técnica", icon: Whistle },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const [key, setKey] = useState<string | null>(null);
  const [data, setData] = useState<BentoData | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<TabId>("achievements");
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const logout = useCallback(() => {
    writeKey(null);
    setKey(null);
    setData(null);
  }, []);

  // retoma a sessão salva nesta aba
  useEffect(() => {
    const saved = readKey();
    (saved ? api(saved, "GET") : Promise.resolve(null))
      .then((d) => {
        if (!saved || !d) return;
        setKey(saved);
        setData(d);
      })
      .catch(() => writeKey(null))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.kind === "ok" ? 2500 : 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const run: Run = useCallback(
    async (success, method, payload, query) => {
      if (!key) return false;
      setBusy(true);
      try {
        setData(await api(key, method, payload, query));
        setToast({ kind: "ok", text: success });
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        setToast({ kind: "error", text: (err as Error).message });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [key, logout]
  );

  if (booting) {
    return (
      <main className="grid min-h-dvh place-items-center bg-neutral-950">
        <LoaderCircle aria-label="Carregando" className="size-6 animate-spin text-brand" />
      </main>
    );
  }

  if (!key || !data) {
    return (
      <Login
        onLogin={(k, d) => {
          writeKey(k);
          setKey(k);
          setData(d);
        }}
      />
    );
  }

  const view = toView(data);
  const counts: Record<TabId, number> = {
    achievements: data.achievements.length,
    podiums: view.podiumTotals.geral,
    matches: data.matches.length,
    roster: data.athletes.length,
    coaches: data.coachesList.length,
  };

  return (
    <div className="min-h-dvh bg-neutral-950">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="mr-auto flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-on-brand">
              <Trophy className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">Painel PCVP</p>
              <p className="text-xs text-neutral-500">Conteúdo da Home</p>
            </div>
            {busy && <LoaderCircle aria-label="Salvando" className="size-4 animate-spin text-brand" />}
          </div>
          <a className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white" href={tab === "coaches" ? "/#comissao" : "/#time"} rel="noopener noreferrer" target="_blank">
            Ver no site <ExternalLink className="size-3.5" />
          </a>
          {confirmReset ? (
            <span className="inline-flex items-center gap-1.5">
              <Btn
                onClick={async () => {
                  setConfirmReset(false);
                  await run("Dados restaurados para o padrão inicial", "POST", { action: "reset" });
                }}
                variant="danger"
              >
                Confirmar restauração
              </Btn>
              <Btn aria-label="Cancelar restauração" onClick={() => setConfirmReset(false)} variant="icon">
                <X className="size-4" />
              </Btn>
            </span>
          ) : (
            <Btn onClick={() => setConfirmReset(true)} title="Volta tudo (incluindo elenco e comissão) aos dados originais de config/site.ts">
              <RotateCcw className="size-4" /> <span className="hidden sm:inline">Restaurar padrão inicial</span>
            </Btn>
          )}
          <Btn aria-label="Sair" onClick={logout} title="Sair" variant="icon">
            <LogOut className="size-4" />
          </Btn>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div aria-label="Seções do painel" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/10 sm:w-fit" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const selected = tab === t.id;
            return (
              <button
                aria-controls={`painel-${t.id}`}
                aria-selected={selected}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
                  selected ? "bg-brand text-on-brand" : "text-neutral-400 hover:text-white"
                )}
                id={`aba-${t.id}`}
                key={t.id}
                onClick={() => setTab(t.id)}
                role="tab"
                type="button"
              >
                <Icon className="size-4" /> {t.label}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", selected ? "bg-on-brand/15" : "bg-white/10")}>{counts[t.id]}</span>
              </button>
            );
          })}
        </div>

        <section aria-labelledby={`aba-${tab}`} id={`painel-${tab}`} role="tabpanel">
          {tab === "achievements" && <AchievementsTab data={data} run={run} />}
          {tab === "podiums" && <PodiumsTab data={data} run={run} />}
          {tab === "matches" && <MatchesTab data={data} run={run} />}
          {tab === "roster" && <RosterTab data={data} run={run} />}
          {tab === "coaches" && <CoachesTab data={data} run={run} />}
        </section>
      </main>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {toast && (
          <p
            className={cn(
              "pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ring-1",
              toast.kind === "ok" ? "bg-neutral-900 text-white ring-white/10" : "bg-red-500/15 text-red-300 ring-red-500/30 backdrop-blur-md"
            )}
            role={toast.kind === "error" ? "alert" : undefined}
          >
            {toast.kind === "ok" && <Check className="mr-1.5 inline size-4 text-brand" />}
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}
