/**
 * /api/bento — conteúdo editável da Home (Bento Grid, Elenco e Comissão Técnica).
 *
 *  GET              público: { matches, podiumYears, achievements, podiumTotals, chartTabs,
 *                   athletes, coachesList } (só itens ativos).
 *                   Com `x-admin-key` válido, inclui também `raw` (documento completo,
 *                   com conquistas inativas). Chave inválida → 401.
 *  POST   (admin)   { action: "reset" }                                   restaura o seed
 *                   { entity: "matches", item }                            cria jogo
 *                   { entity: "achievements", item, addToPodium? }         cria conquista no topo (+1 no gráfico)
 *                   { entity: "podiumYears", item }                        cria ano
 *                   { entity: "athletes" | "coachesList", item }           cria atleta / treinador (fim da lista)
 *  PUT    (admin)   { entity: <lista>, id, item }                          edita
 *                   { entity: <lista com active>, id, active: boolean }    só alterna a visibilidade (olhinho)
 *                   { entity: "achievements", id, item, addToPodium }      acumula (+1x) e soma no gráfico
 *                   { entity: "podiumYears", year, item }                  edita ano
 *                   { entity: <lista>, order: [ids] }                      reordena
 *  DELETE (admin)   ?entity=<entity>&id=<id ou ano>
 *
 *  <lista> = matches | achievements | athletes | coachesList
 *  <lista com active> = achievements | athletes | coachesList
 *
 * Toda escrita responde { raw, view } e expira o cache da Home (tag "bento").
 */

import {
  buildSeed,
  countsAsPodium,
  parseAchievement,
  parseAthlete,
  parseCoach,
  parseMatch,
  parsePodiumYear,
  parseYear,
  podiumFieldFor,
  toView,
  ValidationError,
  type Badge,
  type BentoData,
} from "@/lib/bento";
import { mutateBento, readBento } from "@/lib/bento-store";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/* -------------------------------------------------------------------------- */
/*                                autenticação                                */
/* -------------------------------------------------------------------------- */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pcvp2026";
const digest = (s: string) => createHash("sha256").update(s).digest();

/** Compara em tempo constante (hash dos dois lados → mesmo tamanho). */
function isAdmin(request: Request) {
  const key = request.headers.get("x-admin-key");
  return key !== null && timingSafeEqual(digest(key), digest(ADMIN_PASSWORD));
}

function requireAdmin(request: Request) {
  if (!isAdmin(request)) throw new HttpError(401, "Senha administrativa inválida.");
}

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

type Entity = "matches" | "achievements" | "podiumYears" | "athletes" | "coachesList";
const ENTITIES: Entity[] = ["matches", "achievements", "podiumYears", "athletes", "coachesList"];

/** Entidades em lista ordenável com `id` (todas menos os anos). */
type ListEntity = Exclude<Entity, "podiumYears">;
type ListItem = { id: string; order: number; active?: boolean };
const PARSERS: Record<ListEntity, (v: unknown) => object> = {
  matches: parseMatch,
  achievements: parseAchievement,
  athletes: parseAthlete,
  coachesList: parseCoach,
};
const LABELS: Record<ListEntity, string> = { matches: "Jogo", achievements: "Conquista", athletes: "Atleta", coachesList: "Treinador" };
const listOf = (d: BentoData, entity: ListEntity) => d[entity] as ListItem[];

function entityOf(v: unknown): Entity {
  if (!ENTITIES.includes(v as Entity)) throw new ValidationError(`entity: use ${ENTITIES.join(", ")}`);
  return v as Entity;
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const json = await request.json();
    if (json && typeof json === "object" && !Array.isArray(json)) return json as Record<string, unknown>;
  } catch {
    /* cai no erro abaixo */
  }
  throw new ValidationError("Corpo JSON inválido.");
}

const nextOrder = (list: { order: number }[]) => list.reduce((m, x) => Math.max(m, x.order), -1) + 1;
const firstOrder = (list: { order: number }[]) => list.reduce((m, x) => Math.min(m, x.order), 1) - 1;

function findIndex<T>(list: T[], pred: (x: T) => boolean, what: string) {
  const i = list.findIndex(pred);
  if (i < 0) throw new HttpError(404, `${what} não encontrado.`);
  return i;
}

/** Soma +1 no ano (cria o ano zerado se ainda não existir). */
function bumpPodium(data: BentoData, year: string, field: "estadual" | "nacionalInter") {
  let row = data.podiumYears.find((y) => y.year === year);
  if (!row) {
    row = { year, estadual: 0, nacionalInter: 0 };
    data.podiumYears.push(row);
  }
  row[field] = Math.min(9999, row[field] + 1);
}

/** Valida o pedido de +1 no gráfico: precisa de ano e não vale para convocações. */
function podiumBump(item: { badge: Badge; year: string; builder?: { kind: string } }, flag: unknown) {
  if (flag !== true) return false;
  if (!countsAsPodium(item.badge, item.builder?.kind as never)) {
    throw new ValidationError("Convocações para a Seleção não contam como pódio no gráfico.");
  }
  if (!item.year) throw new ValidationError("year: obrigatório para somar no gráfico de pódios");
  return true;
}

function reorder<T extends { id: string; order: number }>(list: T[], ids: unknown) {
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) throw new ValidationError("order: lista de ids esperada");
  const pos = new Map((ids as string[]).map((id, i) => [id, i]));
  if (pos.size !== list.length || list.some((x) => !pos.has(x.id))) {
    throw new ValidationError("order: informe todos os ids da lista, sem repetir");
  }
  for (const x of list) x.order = pos.get(x.id)!;
}

async function respond(run: () => Promise<BentoData>) {
  try {
    const raw = await run();
    return Response.json({ raw, view: toView(raw) });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof ValidationError) return Response.json({ error: err.message }, { status: 400 });
  console.error("[api/bento]", err);
  const readonlyFs = (err as NodeJS.ErrnoException)?.code === "EROFS" || (err as NodeJS.ErrnoException)?.code === "EACCES";
  return Response.json(
    { error: readonlyFs ? "O servidor não permite gravar data/bento.json (disco somente leitura)." : "Erro interno ao salvar os dados." },
    { status: 500 }
  );
}

/* -------------------------------------------------------------------------- */
/*                                   handlers                                 */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const wantsAdmin = request.headers.has("x-admin-key");
    if (wantsAdmin) requireAdmin(request);
    const raw = await readBento();
    return Response.json({ ...toView(raw), ...(wantsAdmin ? { raw } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  return respond(async () => {
    requireAdmin(request);
    const b = await body(request);
    if (b.action === "reset") return mutateBento(() => buildSeed());

    const entity = entityOf(b.entity);
    if (entity === "matches") {
      const item = parseMatch(b.item);
      return mutateBento((d) => {
        d.matches.push({ ...item, id: randomUUID(), order: nextOrder(d.matches) });
        return d;
      });
    }
    if (entity === "achievements") {
      const item = parseAchievement(b.item);
      const addToPodium = podiumBump(item, b.addToPodium);
      return mutateBento((d) => {
        // conquista nova entra no topo do feed (troféu mais recente primeiro)
        d.achievements.push({ ...item, id: randomUUID(), order: firstOrder(d.achievements) });
        if (addToPodium) bumpPodium(d, item.year, podiumFieldFor(item.badge));
        return d;
      });
    }
    if (entity === "athletes" || entity === "coachesList") {
      const item = PARSERS[entity](b.item);
      return mutateBento((d) => {
        const list = listOf(d, entity);
        list.push({ ...item, id: randomUUID(), order: nextOrder(list) });
        return d;
      });
    }
    const item = parsePodiumYear(b.item);
    return mutateBento((d) => {
      if (d.podiumYears.some((y) => y.year === item.year)) throw new HttpError(409, `O ano ${item.year} já existe.`);
      d.podiumYears.push(item);
      return d;
    });
  });
}

export async function PUT(request: Request) {
  return respond(async () => {
    requireAdmin(request);
    const b = await body(request);
    const entity = entityOf(b.entity);

    if (b.order !== undefined) {
      if (entity === "podiumYears") throw new ValidationError("Os anos são ordenados automaticamente.");
      return mutateBento((d) => {
        reorder(listOf(d, entity), b.order);
        return d;
      });
    }

    if (entity === "podiumYears") {
      const year = parseYear(b.year);
      const item = parsePodiumYear(b.item);
      return mutateBento((d) => {
        const i = findIndex(d.podiumYears, (y) => y.year === year, `Ano ${year}`);
        if (item.year !== year && d.podiumYears.some((y) => y.year === item.year)) throw new HttpError(409, `O ano ${item.year} já existe.`);
        d.podiumYears[i] = item;
        return d;
      });
    }

    if (typeof b.id !== "string") throw new ValidationError("id: obrigatório");
    const id = b.id;

    // olhinho: só alterna a visibilidade, sem reenviar o registro inteiro
    if (b.item === undefined && typeof b.active === "boolean") {
      if (entity === "matches") throw new ValidationError("Jogos não têm visibilidade; exclua o jogo para tirá-lo do site.");
      const active = b.active;
      return mutateBento((d) => {
        const list = listOf(d, entity);
        list[findIndex(list, (x) => x.id === id, LABELS[entity])].active = active;
        return d;
      });
    }

    if (entity !== "achievements") {
      const item = PARSERS[entity](b.item);
      return mutateBento((d) => {
        const list = listOf(d, entity);
        const i = findIndex(list, (x) => x.id === id, LABELS[entity]);
        list[i] = { ...item, id, order: list[i].order };
        return d;
      });
    }
    const item = parseAchievement(b.item);
    // acumular (+1x) um resultado novo também pode somar no gráfico
    const addToPodium = podiumBump(item, b.addToPodium);
    return mutateBento((d) => {
      const i = findIndex(d.achievements, (a) => a.id === id, "Conquista");
      d.achievements[i] = { ...item, id, order: d.achievements[i].order };
      if (addToPodium) bumpPodium(d, item.year, podiumFieldFor(item.badge));
      return d;
    });
  });
}

export async function DELETE(request: Request) {
  return respond(async () => {
    requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const entity = entityOf(params.get("entity"));
    const id = params.get("id") ?? "";
    return mutateBento((d) => {
      if (entity === "podiumYears") d.podiumYears.splice(findIndex(d.podiumYears, (y) => y.year === id, `Ano ${id}`), 1);
      else {
        const list = listOf(d, entity);
        list.splice(findIndex(list, (x) => x.id === id, LABELS[entity]), 1);
      }
      return d;
    });
  });
}
