/**
 * Modelo de dados do conteúdo editável da Home: Bento Grid (Próximos jogos,
 * Pódios do time, Conquistas), Elenco (órbita 3D + perfis) e Comissão Técnica.
 *
 * Este módulo é puro (sem fs/servidor): tipos, seed, cálculos derivados e
 * validação. É importado pela camada de persistência (`lib/bento-store.ts`),
 * pela rota `/api/bento` e pelo painel `/admin`.
 */

import { siteConfig, type Coach, type TeamMember } from "@/config/site";

/* -------------------------------------------------------------------------- */
/*                                    tipos                                   */
/* -------------------------------------------------------------------------- */

export const BADGES = ["Estadual", "Nacional", "Internacional", "Seleção"] as const;
export type Badge = (typeof BADGES)[number];

export type Match = {
  id: string;
  /** Ex.: "07 DEZ". */
  date: string;
  /** Ex.: "Circuito Estadual · Etapa 5". */
  title: string;
  /** Ex.: "Praia Central". */
  location: string;
  tag?: string;
  order: number;
};

export type PodiumYear = {
  /** "2022", "2027"… (4 dígitos; é a chave do registro). */
  year: string;
  estadual: number;
  nacionalInter: number;
};

export type Achievement = {
  id: string;
  athleteName: string;
  /** Caminho em /public (ex.: "/atletas/davi.png") ou URL https. */
  avatar: string;
  text: string;
  badge: Badge;
  /** Ex.: "2026" (pode ficar vazio). */
  year: string;
  order: number;
  active: boolean;
  /** Campos do construtor padrão (quando o texto foi montado por ele). Permite acumular (+1x) sem reescrever à mão. */
  builder?: AchievementBuilder;
};

export type ProfileItem = { title: string; year: string };

/** Atleta do elenco (órbita 3D da Home + painel de perfil). */
export type Athlete = {
  id: string;
  /** Nome oficial (órbita, lista e painel). */
  name: string;
  /** Apelido (ex.: "Lippe"). Guardado à parte; não é exibido junto do nome. */
  nickname: string;
  /** Legenda da órbita (ex.: "Atleta · Alto Rendimento"). */
  role: string;
  /** Foto PNG sem fundo em /public (ex.: "/atletas/lippe.png") ou URL https. Vazio = degradê laranja. */
  image: string;
  /** Ex.: "Alto Rendimento", "Base / Sub-19". */
  category: string;
  /** Resumo curto. */
  bio: string;
  tags: string[];
  stats: { podiums: number; titles: number };
  /** Perfil detalhado do painel lateral. */
  profile: { quote: string; longBio: string[]; titles: ProfileItem[]; awards: ProfileItem[] };
  active: boolean;
  order: number;
};

export type CoachSection = { title: string; items: string[] };

/** Treinador da seção "Nosso time" (card + painel "Ler mais"). */
export type CoachRecord = {
  id: string;
  /** Nome curto do card. */
  name: string;
  /** Nome completo do painel. */
  fullName: string;
  role: string;
  credentials: string[];
  shortBio: string;
  /** Retrato em /public (ex.: "/atletas/paulo.png") ou URL https. Vazio = monograma. */
  image: string;
  /** Currículo detalhado por tópicos. */
  sections: CoachSection[];
  instagramLabel: string;
  /** Link do perfil (opcional; vazio = nome em texto). */
  instagramUrl: string;
  active: boolean;
  order: number;
};

/** Documento persistido (data/bento.json ou, no futuro, uma tabela). */
export type BentoData = {
  version: 1;
  matches: Match[];
  podiumYears: PodiumYear[];
  achievements: Achievement[];
  athletes: Athlete[];
  coachesList: CoachRecord[];
};

export type PodiumYearView = PodiumYear & { geral: number };

export type ChartTab = {
  id: "geral" | "estadual" | "nacional";
  label: string;
  total: string;
  unit: string;
  columns: { label: string; value: number }[];
};

/** Formato público (GET /api/bento e Home): ordenado, só conquistas ativas e com os totais calculados. */
export type BentoView = {
  matches: Match[];
  podiumYears: PodiumYearView[];
  achievements: Achievement[];
  podiumTotals: { geral: number; estadual: number; nacionalInter: number };
  chartTabs: ChartTab[];
  /** Só atletas ativos, na ordem do painel. */
  athletes: Athlete[];
  /** Só treinadores ativos, na ordem do painel. */
  coachesList: CoachRecord[];
};

/* -------------------------------------------------------------------------- */
/*                                    seed                                    */
/* -------------------------------------------------------------------------- */

/**
 * Divisão Estadual × Nacional & Inter. por ano. O config original só tinha o
 * Geral por ano (14/24/38/46/22) e os totais por categoria (95 / 49); esta
 * divisão proporcional fecha exatamente nesses números. Revise no /admin.
 */
const SEED_PODIUM_SPLIT: Record<string, { estadual: number; nacionalInter: number }> = {
  "2022": { estadual: 9, nacionalInter: 5 },
  "2023": { estadual: 16, nacionalInter: 8 },
  "2024": { estadual: 25, nacionalInter: 13 },
  "2025": { estadual: 30, nacionalInter: 16 },
  "2026": { estadual: 15, nacionalInter: 7 },
};

/** Estado inicial, montado a partir de `config/site.ts`. */
export function buildSeed(): BentoData {
  const { bento } = siteConfig;
  const geral = bento.stats.tabs.find((t) => t.id === "geral");
  return {
    version: 1,
    matches: bento.matches.items.map((m, i) => ({
      id: `m${i + 1}`,
      date: m.date,
      title: m.event,
      location: m.place,
      order: i,
    })),
    podiumYears: (geral?.columns ?? []).map((c) => {
      const split = SEED_PODIUM_SPLIT[c.label];
      return split ? { year: c.label, ...split } : { year: c.label, estadual: c.value, nacionalInter: 0 };
    }),
    achievements: bento.achievements.feed.map((a, i) => ({
      id: `a${i + 1}`,
      athleteName: a.athlete,
      avatar: a.photo,
      text: a.title,
      badge: a.badge as Badge,
      year: a.year,
      order: i,
      active: true,
    })),
    athletes: seedAthletes(),
    coachesList: seedCoaches(),
  };
}

/** Categoria a partir da legenda: "Atleta · Base / Sub-19" → "Base / Sub-19". */
const categoryFromRole = (role: string) => role.split("·").slice(1).join("·").trim() || role.trim();

/** Estimativa inicial dos números do perfil (revise no /admin): pódios = campeão/vice/3º; títulos = conquistas de campeão. */
function seedStats(titles: readonly ProfileItem[]) {
  const podiums = titles.filter((t) => /campe|vice|3º/i.test(t.title)).length;
  const won = titles.filter((t) => /campe/i.test(t.title) && !/vice/i.test(t.title)).length;
  return { podiums, titles: won };
}

export function seedAthletes(): Athlete[] {
  return (siteConfig.team.members as readonly TeamMember[]).map((m, i) => ({
    id: `at${i + 1}`,
    name: m.name,
    nickname: m.nickname ?? "",
    role: m.role,
    image: m.photo ?? "",
    category: categoryFromRole(m.role),
    bio: m.bio,
    tags: [...m.tags],
    stats: seedStats(m.profile.titles),
    profile: {
      quote: m.profile.quote,
      longBio: [...m.profile.longBio],
      titles: m.profile.titles.map((t) => ({ ...t })),
      awards: m.profile.awards.map((t) => ({ ...t })),
    },
    active: true,
    order: i,
  }));
}

export function seedCoaches(): CoachRecord[] {
  return (siteConfig.coaches.items as readonly Coach[]).map((c, i) => ({
    id: `co${i + 1}`,
    name: c.name,
    fullName: c.fullName,
    role: c.role,
    credentials: [...c.credentials],
    shortBio: c.shortBio,
    image: c.image ?? "",
    sections: c.sections.map((s) => ({ title: s.title, items: [...s.items] })),
    instagramLabel: c.instagramLabel,
    instagramUrl: c.instagramUrl ?? "",
    active: true,
    order: i,
  }));
}

/* -------------------------------------------------------------------------- */
/*                              cálculos derivados                            */
/* -------------------------------------------------------------------------- */

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/** Geral de cada ano e totais SEMPRE derivados da soma (nunca armazenados). */
export function toView(data: BentoData): BentoView {
  const podiumYears = [...data.podiumYears]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((y) => ({ ...y, geral: y.estadual + y.nacionalInter }));
  const estadual = podiumYears.reduce((s, y) => s + y.estadual, 0);
  const nacionalInter = podiumYears.reduce((s, y) => s + y.nacionalInter, 0);
  const geral = estadual + nacionalInter;
  const unit = siteConfig.bento.stats.tabs[0]?.unit ?? "Pódios";

  return {
    matches: [...data.matches].sort(byOrder),
    podiumYears,
    achievements: data.achievements.filter((a) => a.active).sort(byOrder),
    podiumTotals: { geral, estadual, nacionalInter },
    chartTabs: [
      { id: "geral", label: "Geral", total: String(geral), unit, columns: podiumYears.map((y) => ({ label: y.year, value: y.geral })) },
      { id: "estadual", label: "Estadual", total: String(estadual), unit, columns: podiumYears.map((y) => ({ label: y.year, value: y.estadual })) },
      {
        id: "nacional",
        label: "Nacional & Inter.",
        total: String(nacionalInter),
        unit,
        columns: podiumYears.map((y) => ({ label: y.year, value: y.nacionalInter })),
      },
    ],
    athletes: data.athletes.filter((a) => a.active).sort(byOrder),
    coachesList: data.coachesList.filter((c) => c.active).sort(byOrder),
  };
}

/** Atleta no formato dos componentes da Home (órbita e painel de perfil). */
export const athleteToMember = (a: Athlete): TeamMember => ({
  name: a.name,
  ...(a.nickname ? { nickname: a.nickname } : {}),
  role: a.role,
  bio: a.bio,
  tags: a.tags,
  ...(a.image ? { photo: a.image } : {}),
  profile: a.profile,
});

/** Em qual coluna do gráfico uma conquista soma: Estadual → estadual; o resto → nacionalInter. */
export const podiumFieldFor = (badge: Badge): "estadual" | "nacionalInter" => (badge === "Estadual" ? "estadual" : "nacionalInter");

export type PersonOption = { group: "coach" | "athlete"; name: string; fullName: string; avatar: string };

/**
 * Pessoas do seletor rápido de conquistas do admin: primeiro a comissão técnica
 * (nome do card, ex.: "Paulo Coelho"), depois o elenco (primeiro nome). Inclui
 * ocultos do site; só fica de fora quem não tem foto.
 */
export const athleteOptions = (athletes: Athlete[], coaches: CoachRecord[] = []): PersonOption[] => [
  ...[...coaches]
    .sort(byOrder)
    .filter((c) => c.image)
    .map((c) => ({ group: "coach" as const, name: c.name, fullName: c.fullName, avatar: c.image })),
  ...[...athletes]
    .sort(byOrder)
    .filter((a) => a.image)
    .map((a) => ({ group: "athlete" as const, name: a.name.split(/\s+/)[0], fullName: a.name, avatar: a.image })),
];

/* -------------------------------------------------------------------------- */
/*                                  validação                                 */
/* -------------------------------------------------------------------------- */

export class ValidationError extends Error {}

function str(v: unknown, field: string, { max = 160, required = true } = {}): string {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new ValidationError(`${field}: deve ser texto`);
  const s = v.trim();
  if (required && !s) throw new ValidationError(`${field}: obrigatório`);
  if (s.length > max) throw new ValidationError(`${field}: máximo de ${max} caracteres`);
  return s;
}

function count(v: unknown, field: string): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 9999) throw new ValidationError(`${field}: inteiro entre 0 e 9999`);
  return n;
}

export function parseYear(v: unknown, field = "year", required = true): string {
  const s = str(v, field, { max: 4, required });
  if (s && !/^\d{4}$/.test(s)) throw new ValidationError(`${field}: ano com 4 dígitos (ex.: 2026)`);
  return s;
}

function avatar(v: unknown, field = "avatar", required = true): string {
  const s = str(v, field, { max: 500, required });
  // só caminhos do próprio site ou URLs https (nada de javascript:, data:, etc.)
  if (s && !/^\/(?!\/)[\w\-./%]+$/.test(s) && !/^https:\/\/[^\s"'<>]+$/.test(s)) {
    throw new ValidationError(`${field}: use um caminho do site (ex.: /atletas/davi.png) ou uma URL https`);
  }
  return s;
}

function httpsUrl(v: unknown, field: string): string {
  const s = str(v, field, { max: 300, required: false });
  if (s && !/^https:\/\/[^\s"'<>]+$/.test(s)) throw new ValidationError(`${field}: use uma URL https`);
  return s;
}

function list(v: unknown, field: string, maxItems: number): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new ValidationError(`${field}: lista esperada`);
  if (v.length > maxItems) throw new ValidationError(`${field}: máximo de ${maxItems} itens`);
  return v;
}

/** Lista de textos: corta espaços e descarta itens vazios. */
const strList = (v: unknown, field: string, maxItems: number, max: number) =>
  list(v, field, maxItems)
    .map((x, i) => str(x, `${field}[${i}]`, { max, required: false }))
    .filter(Boolean);

const obj = (v: unknown, field: string) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ValidationError(`${field}: objeto esperado`);
  return v as Record<string, unknown>;
};

export function parseMatch(v: unknown): Omit<Match, "id" | "order"> {
  const o = obj(v, "item");
  const tag = str(o.tag, "tag", { max: 40, required: false });
  return {
    date: str(o.date, "date", { max: 20 }),
    title: str(o.title, "title", { max: 120 }),
    location: str(o.location, "location", { max: 120 }),
    ...(tag ? { tag } : {}),
  };
}

export function parsePodiumYear(v: unknown): PodiumYear {
  const o = obj(v, "item");
  return { year: parseYear(o.year), estadual: count(o.estadual, "estadual"), nacionalInter: count(o.nacionalInter, "nacionalInter") };
}

function parseBuilder(v: unknown): AchievementBuilder | undefined {
  if (v === undefined || v === null) return undefined;
  const o = obj(v, "builder");
  if (!ACHIEVEMENT_KINDS.includes(o.kind as AchievementKind)) throw new ValidationError("builder.kind: tipo inválido");
  if (o.tournament !== "" && !TOURNAMENTS.some((t) => t.id === o.tournament)) throw new ValidationError("builder.tournament: torneio inválido");
  if (!Array.isArray(o.categories) || o.categories.some((c) => !CATEGORIES.includes(c as Category))) {
    throw new ValidationError("builder.categories: categoria inválida");
  }
  if (!TEXT_GENDERS.includes(o.gender as TextGender)) throw new ValidationError("builder.gender: inválido");
  const count = Number(o.count);
  if (!Number.isInteger(count) || count < 1 || count > 99) throw new ValidationError("builder.count: entre 1 e 99");
  const period = normalizePeriod(str(o.period, "builder.period", { max: 9, required: false }));
  if (period && !PERIOD_RE.test(period)) throw new ValidationError("builder.period: use 2026 ou 2025–2026");
  return {
    kind: o.kind as AchievementKind,
    count,
    tournament: o.tournament as TournamentId | "",
    categories: sortCategories([...new Set(o.categories as Category[])]),
    period,
    gender: o.gender as TextGender,
  };
}

export function parseAchievement(v: unknown): Omit<Achievement, "id" | "order"> {
  const o = obj(v, "item");
  if (!BADGES.includes(o.badge as Badge)) throw new ValidationError(`badge: use ${BADGES.join(", ")}`);
  const builder = parseBuilder(o.builder);
  return {
    athleteName: str(o.athleteName, "athleteName", { max: 60 }),
    avatar: avatar(o.avatar),
    text: str(o.text, "text", { max: 200 }),
    badge: o.badge as Badge,
    year: parseYear(o.year, "year", false),
    active: o.active === undefined ? true : Boolean(o.active),
    ...(builder ? { builder } : {}),
  };
}

const profileItems = (v: unknown, field: string) =>
  list(v, field, 40)
    .map((x, i) => {
      const o = obj(x, `${field}[${i}]`);
      return { title: str(o.title, `${field}[${i}].title`, { max: 160, required: false }), year: str(o.year, `${field}[${i}].year`, { max: 40, required: false }) };
    })
    .filter((x) => x.title);

export function parseAthlete(v: unknown): Omit<Athlete, "id" | "order"> {
  const o = obj(v, "item");
  const profile = o.profile === undefined ? {} : obj(o.profile, "profile");
  const stats = o.stats === undefined ? {} : obj(o.stats, "stats");
  return {
    name: str(o.name, "name", { max: 80 }),
    nickname: str(o.nickname, "nickname", { max: 40, required: false }),
    role: str(o.role, "role", { max: 80 }),
    image: avatar(o.image, "image", false),
    category: str(o.category, "category", { max: 60, required: false }),
    bio: str(o.bio, "bio", { max: 600, required: false }),
    tags: strList(o.tags, "tags", 12, 40),
    stats: { podiums: count(stats.podiums ?? 0, "stats.podiums"), titles: count(stats.titles ?? 0, "stats.titles") },
    profile: {
      quote: str(profile.quote, "profile.quote", { max: 600, required: false }),
      longBio: strList(profile.longBio, "profile.longBio", 12, 2000),
      titles: profileItems(profile.titles, "profile.titles"),
      awards: profileItems(profile.awards, "profile.awards"),
    },
    active: o.active === undefined ? true : Boolean(o.active),
  };
}

export function parseCoach(v: unknown): Omit<CoachRecord, "id" | "order"> {
  const o = obj(v, "item");
  return {
    name: str(o.name, "name", { max: 80 }),
    fullName: str(o.fullName, "fullName", { max: 120, required: false }) || str(o.name, "name", { max: 80 }),
    role: str(o.role, "role", { max: 80 }),
    credentials: strList(o.credentials, "credentials", 12, 60),
    shortBio: str(o.shortBio, "shortBio", { max: 900, required: false }),
    image: avatar(o.image, "image", false),
    sections: list(o.sections, "sections", 12)
      .map((x, i) => {
        const s = obj(x, `sections[${i}]`);
        return { title: str(s.title, `sections[${i}].title`, { max: 120, required: false }), items: strList(s.items, `sections[${i}].items`, 20, 600) };
      })
      .filter((s) => s.title || s.items.length),
    instagramLabel: str(o.instagramLabel, "instagramLabel", { max: 80, required: false }),
    instagramUrl: httpsUrl(o.instagramUrl, "instagramUrl"),
    active: o.active === undefined ? true : Boolean(o.active),
  };
}

/** Valida um documento inteiro (usado ao ler o JSON do disco). */
export function parseBentoData(v: unknown): BentoData {
  const o = obj(v, "bento");
  const arr = (x: unknown, f: string) => {
    if (!Array.isArray(x)) throw new ValidationError(`${f}: lista esperada`);
    return x;
  };
  const id = (x: unknown) => str(x, "id", { max: 64 });
  const order = (x: unknown, i: number) => (typeof x === "number" && Number.isFinite(x) ? x : i);
  return {
    version: 1,
    matches: arr(o.matches, "matches").map((m, i) => ({ ...parseMatch(m), id: id((m as Match).id), order: order((m as Match).order, i) })),
    podiumYears: arr(o.podiumYears, "podiumYears").map(parsePodiumYear),
    achievements: arr(o.achievements, "achievements").map((a, i) => ({
      ...parseAchievement(a),
      id: id((a as Achievement).id),
      order: order((a as Achievement).order, i),
    })),
    // arquivos anteriores ao elenco/comissão editáveis: completa com o seed
    athletes:
      o.athletes === undefined
        ? seedAthletes()
        : arr(o.athletes, "athletes").map((a, i) => ({ ...parseAthlete(a), id: id((a as Athlete).id), order: order((a as Athlete).order, i) })),
    coachesList:
      o.coachesList === undefined
        ? seedCoaches()
        : arr(o.coachesList, "coachesList").map((c, i) => ({ ...parseCoach(c), id: id((c as CoachRecord).id), order: order((c as CoachRecord).order, i) })),
  };
}

/* -------------------------------------------------------------------------- */
/*                     construtor padrão de títulos                           */
/* -------------------------------------------------------------------------- */

export const ACHIEVEMENT_KINDS = ["Campeão", "Vice-Campeão", "3º Lugar", "Convocação Seleção", "Título Geral / Ranking"] as const;
export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

export const CATEGORIES = ["Sub-15", "Sub-17", "Sub-19", "Sub-21", "Base", "Adulto", "Universitário"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Gênero gramatical do texto gerado (m: Campeão · f: Campeã · n: Campeão(ã)). */
export const TEXT_GENDERS = ["m", "f", "n"] as const;
export type TextGender = (typeof TEXT_GENDERS)[number];

type Gendered = Record<TextGender, string>;
const g = (m: string, f: string, n: string): Gendered => ({ m, f, n });
const same = (x: string): Gendered => ({ m: x, f: x, n: x });

/** Torneios/entidades: rótulo do chip, badge e como entram na frase ("Estadual Adulto CMTVP"). */
export const TOURNAMENTS = [
  { id: "selecao", label: "Seleção Brasileira", badge: "Seleção", prefix: same("Seleção Brasileira"), suffix: "" },
  { id: "cbvp", label: "Circuito Brasileiro (CBVP)", badge: "Nacional", prefix: g("Brasileiro", "Brasileira", "Brasileiro(a)"), suffix: "CBVP" },
  {
    id: "cbi",
    label: "Brasileiro Interclubes (CBI)",
    badge: "Nacional",
    prefix: g("Brasileiro Interclubes", "Brasileira Interclubes", "Brasileiro(a) Interclubes"),
    suffix: "CBI",
  },
  { id: "cmtvp", label: "Circuito Estadual (CMTVP)", badge: "Estadual", prefix: same("Estadual"), suffix: "CMTVP" },
  { id: "sulamericano", label: "Sul-Americano", badge: "Internacional", prefix: g("Sul-Americano", "Sul-Americana", "Sul-Americano(a)"), suffix: "" },
  { id: "mundial", label: "Mundial", badge: "Internacional", prefix: same("Mundial"), suffix: "" },
  { id: "fisu", label: "Pan-Americano FISU", badge: "Internacional", prefix: g("Pan-Americano", "Pan-Americana", "Pan-Americano(a)"), suffix: "FISU" },
  {
    id: "cbdu",
    label: "Brasileiro Universitário (CBDU)",
    badge: "Nacional",
    prefix: g("Brasileiro Universitário", "Brasileira Universitária", "Brasileiro(a) Universitário(a)"),
    suffix: "CBDU",
  },
] as const satisfies readonly { id: string; label: string; badge: Badge; prefix: Gendered; suffix: string }[];
export type TournamentId = (typeof TOURNAMENTS)[number]["id"];

export type AchievementBuilder = {
  kind: AchievementKind;
  /** Quantas vezes (1 = simples, 2 = Bi / 2x…). */
  count: number;
  tournament: TournamentId | "";
  categories: Category[];
  /** "2026" ou "2025–2026" (pode ficar vazio). */
  period: string;
  gender: TextGender;
};

export const emptyBuilder = (): AchievementBuilder => ({ kind: "Campeão", count: 1, tournament: "", categories: [], period: "", gender: "n" });

const PERIOD_RE = /^\d{4}(–\d{4})?$/;
/** "2025-2026" / "2025 – 2026" → "2025–2026"; mesmo ano dos dois lados vira um só. */
export function normalizePeriod(p: string) {
  const s = p.trim().replace(/\s*[-–—]\s*/g, "–");
  const m = /^(\d{4})–(\d{4})$/.exec(s);
  if (m && m[1] === m[2]) return m[1];
  return s;
}
export const isValidPeriod = (p: string) => !p || PERIOD_RE.test(normalizePeriod(p));
/** Último ano do período (usado no campo `year` e no +1 do gráfico). */
export const periodEndYear = (p: string) => normalizePeriod(p).match(/\d{4}/g)?.at(-1) ?? "";

export const sortCategories = (cats: readonly Category[]) => CATEGORIES.filter((c) => cats.includes(c));

/** "Sub-19 e Sub-21" / "Sub-17, Sub-19 e Sub-21". */
function joinPt(items: readonly string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

const MULTI = ["", "", "Bi", "Tri", "Tetra", "Penta"];
const CHAMPION = g("Campeão", "Campeã", "Campeão(ã)");

/** "Campeão" · "Bicampeã" · "3x Vice-Campeão(ã)" · "2x Convocado(a)"… */
export function kindPhrase(kind: AchievementKind, count: number, gender: TextGender) {
  const times = (x: string) => (count > 1 ? `${count}x ${x}` : x);
  switch (kind) {
    case "Campeão":
    case "Título Geral / Ranking": {
      const base = CHAMPION[gender];
      const word = count >= 2 && count <= 5 ? `${MULTI[count]}${base.toLowerCase()}` : times(base);
      return kind === "Campeão" ? word : `${word} Geral`;
    }
    case "Vice-Campeão":
      return times(`Vice-${CHAMPION[gender]}`);
    case "3º Lugar":
      return times("3º Lugar");
    case "Convocação Seleção":
      return times(g("Convocado", "Convocada", "Convocado(a)")[gender]);
  }
}

/** Frase final no padrão do site. */
export function buildAchievementText(b: AchievementBuilder) {
  const head = kindPhrase(b.kind, b.count, b.gender);
  const cats = joinPt(sortCategories(b.categories));
  const period = normalizePeriod(b.period);
  const t = TOURNAMENTS.find((x) => x.id === b.tournament);
  if (t?.id === "selecao") {
    // "3x Convocado(a) Seleção Brasileira (Sub-19 e Sub-21 · 2026–2027)"
    const extra = [cats, period].filter(Boolean).join(" · ");
    return [head, t.prefix[b.gender]].join(" ") + (extra ? ` (${extra})` : "");
  }
  // "Tricampeão Estadual Adulto CMTVP (2023–2025)"
  const body = [head, t?.prefix[b.gender], cats, t?.suffix].filter(Boolean).join(" ");
  return period ? `${body} (${period})` : body;
}

/** Badge correspondente ao construtor. */
export function badgeForBuilder(b: AchievementBuilder): Badge {
  if (b.kind === "Convocação Seleção") return "Seleção";
  return TOURNAMENTS.find((t) => t.id === b.tournament)?.badge ?? "Nacional";
}

/** Convocação não é pódio (1º, 2º ou 3º): não soma no gráfico de areia. */
export const countsAsPodium = (badge: Badge, kind?: AchievementKind) => badge !== "Seleção" && kind !== "Convocação Seleção";

/**
 * Acumula uma conquista existente: +1x, junta categorias e estende o período
 * com os anos novos (ex.: Sub-19 · 2026 + Sub-21 · 2027 → "2x … (Sub-19 e Sub-21 · 2026–2027)").
 */
export function accumulateBuilder(existing: AchievementBuilder, incoming?: Partial<AchievementBuilder> & { year?: string }): AchievementBuilder {
  const years = [existing.period, incoming?.period, incoming?.period ? "" : incoming?.year]
    .flatMap((p) => (p ? (normalizePeriod(p).match(/\d{4}/g) ?? []) : []))
    .map(Number);
  const period = years.length ? (Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`) : "";
  return {
    ...existing,
    count: Math.min(99, existing.count + 1),
    categories: sortCategories([...new Set([...existing.categories, ...(incoming?.categories ?? [])])]),
    period,
  };
}

/**
 * Melhor palpite da estrutura de um texto livre antigo (sem `builder`), para
 * poder acumular. É heurístico: o admin revisa o texto gerado antes de salvar.
 */
export function guessBuilder(a: Pick<Achievement, "text" | "badge" | "year">): AchievementBuilder {
  const t = a.text;
  const kind: AchievementKind =
    /convoca|seleção brasileira/i.test(t) || a.badge === "Seleção"
      ? "Convocação Seleção"
      : /vice/i.test(t)
        ? "Vice-Campeão"
        : /3º|terceir/i.test(t)
          ? "3º Lugar"
          : /geral|ranking/i.test(t)
            ? "Título Geral / Ranking"
            : "Campeão";
  const nx = /(\d+)\s*x\b/i.exec(t);
  const prefix = /\b(bi|tri|tetra|penta)campe/i.exec(t)?.[1]?.toLowerCase();
  const count = nx ? Number(nx[1]) : prefix ? { bi: 2, tri: 3, tetra: 4, penta: 5 }[prefix as "bi"] : 1;
  // \b do JS não reconhece "ã" como letra: usa lookahead Unicode
  const gender: TextGender = /(campeã|convocada)(?!\p{L})/iu.test(t) ? "f" : /(campeão|convocado)(?!\p{L})/iu.test(t) ? "m" : "n";
  // torneio = o PRIMEIRO citado no texto (títulos compostos: "Campeã FISU & Tetra Universitária")
  const patterns: [TournamentId, RegExp][] = [
    ["selecao", /seleção brasileira/i],
    ["cmtvp", /cmtvp|estadual/i],
    ["cbi", /\bcbi\b|interclubes/i],
    ["cbdu", /cbdu|universit/i],
    ["fisu", /fisu|pan-?americ/i],
    ["sulamericano", /sul-?americ/i],
    ["mundial", /mundial/i],
    ["cbvp", /cbvp|brasileir/i],
  ];
  const hits = patterns.map(([id, re]) => [id, t.search(re)] as const).filter(([, i]) => i >= 0);
  const firstHit = hits.length ? hits.reduce((a, b) => (b[1] < a[1] ? b : a))[0] : "";
  const tournament: TournamentId | "" = kind === "Convocação Seleção" ? "selecao" : firstHit;
  const categories = CATEGORIES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(t));
  const range = /(\d{4})\s*[–-]\s*(\d{4})/.exec(t);
  const single = /\b(20\d{2})\b/.exec(t);
  const period = range ? `${range[1]}–${range[2]}` : (single?.[1] ?? a.year ?? "");
  return { kind, count: Math.max(1, Math.min(99, count)), tournament, categories, period, gender };
}
