/**
 * Persistência do conteúdo editável da Home (somente servidor).
 *
 * - `BentoRepository` é a interface de armazenamento, escolhida em `getRepository()`:
 *   · Supabase (tabela `pcvp_bento_state`, registro único `id = 'main'`) quando
 *     `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão definidas — via fetch na
 *     API REST (PostgREST), sem SDK;
 *   · senão, arquivo local `data/bento.json` (desenvolvimento).
 *   Nos dois casos o seed de `config/site.ts` só é gravado se ainda não houver dados.
 * - `getBentoView()` é a leitura usada pela Home: cacheada com a tag "bento",
 *   então a página continua pré-renderizada. Toda escrita (`mutateBento`)
 *   expira a tag e a próxima visita já recebe os dados novos.
 * - Concorrência: além da fila local, o Supabase usa trava otimista
 *   (`updated_at`): se outro servidor gravou entre a leitura e a escrita, a
 *   escrita falha com `ConflictError` em vez de sobrescrever a edição alheia.
 */

import { buildSeed, parseBentoData, toView, type BentoData, type BentoView } from "@/lib/bento";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const BENTO_TAG = "bento";

/** Documento + versão (para a trava otimista; `null` quando o armazenamento não versiona). */
export type BentoSnapshot = { data: BentoData; version: string | null };

export interface BentoRepository {
  /** Nome para logs e para o painel ("supabase" | "arquivo"). */
  readonly kind: string;
  /** Lê o documento; cria a partir do seed SOMENTE se ainda não existir. */
  read(): Promise<BentoSnapshot>;
  /** Grava. Com `expected`, falha com `ConflictError` se a versão mudou desde a leitura. */
  write(data: BentoData, expected?: string | null): Promise<void>;
}

/** Outro processo salvou entre a leitura e a escrita. */
export class ConflictError extends Error {}

/** Falha ao falar com o armazenamento remoto (chave, URL, tabela ou rede). A mensagem não traz segredos. */
export class StorageError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}

/* -------------------------------------------------------------------------- */
/*                           implementação em arquivo                         */
/* -------------------------------------------------------------------------- */

const DATA_FILE = path.join(process.cwd(), "data", "bento.json");

class FileBentoRepository implements BentoRepository {
  readonly kind = "arquivo";
  constructor(private readonly file: string) {}

  async read(): Promise<BentoSnapshot> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // primeiro uso: cria o arquivo a partir do seed (se o disco permitir)
      const seed = buildSeed();
      await this.write(seed).catch((e) => console.warn("[bento] não foi possível criar data/bento.json:", e));
      return { data: seed, version: null };
    }
    return { data: parseBentoData(JSON.parse(raw)), version: null };
  }

  async write(data: BentoData): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    // escrita atômica: grava num temporário e renomeia (nunca deixa JSON pela metade)
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(tmp, this.file);
  }
}

/* -------------------------------------------------------------------------- */
/*                       implementação Supabase (PostgREST)                   */
/* -------------------------------------------------------------------------- */

const SUPABASE_TABLE = "pcvp_bento_state";
const ROW_ID = "main";
const TIMEOUT_MS = 10_000;

type Row = { data: unknown; updated_at: string };

class SupabaseBentoRepository implements BentoRepository {
  readonly kind = "supabase";
  private readonly endpoint: string;
  private readonly host: string;

  /** `origin` já validado por `parseSupabaseConfig` (ex.: https://xxxx.supabase.co). */
  constructor(
    origin: string,
    private readonly key: string
  ) {
    this.endpoint = `${origin}/rest/v1/${SUPABASE_TABLE}`;
    this.host = new URL(origin).host;
  }

  /** Chamada à API REST com a service role (só no servidor; nunca vai para o navegador). */
  private async request(query: string, init: RequestInit & { prefer?: string } = {}): Promise<Row[]> {
    const { prefer, ...rest } = init;
    const method = init.method ?? "GET";
    const res = await fetch(`${this.endpoint}?${query}`, {
      ...rest,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
      },
    }).catch((err: unknown) => {
      console.error(`[bento] Supabase ${method} ${SUPABASE_TABLE}: falha de conexão com ${this.host}:`, err);
      throw new StorageError(`Não foi possível conectar ao Supabase em ${this.host} (${networkReason(err)}). Confira SUPABASE_URL.`);
    });
    if (!res.ok) {
      // detalhe do PostgREST só no log do servidor (ajuda a diagnosticar; nunca inclui a chave)
      const detail = await res.text().catch(() => "");
      console.error(`[bento] Supabase ${method} ${SUPABASE_TABLE}: HTTP ${res.status} ${detail.slice(0, 300)}`);
      const hint =
        res.status === 401 || res.status === 403
          ? "chave recusada: confira SUPABASE_SERVICE_ROLE_KEY (use a service_role, não a anon)"
          : res.status === 404
            ? `tabela ${SUPABASE_TABLE} não encontrada: rode o SQL de criação no Supabase`
            : "veja o log do servidor";
      throw new StorageError(`Supabase respondeu HTTP ${res.status} (${hint}).`, res.status);
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as Row[]) : [];
  }

  private snapshot(row: Row): BentoSnapshot {
    return { data: parseBentoData(row.data), version: row.updated_at };
  }

  async read(): Promise<BentoSnapshot> {
    const select = `id=eq.${ROW_ID}&select=data,updated_at`;
    const [row] = await this.request(select);
    if (row) return this.snapshot(row);

    // tabela vazia: grava o seed UMA vez. ignore-duplicates = se outro servidor
    // criou o registro no meio tempo, não sobrescreve; relê o que ficou valendo.
    await this.request("on_conflict=id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({ id: ROW_ID, data: buildSeed() }),
    });
    const [created] = await this.request(select);
    if (!created) throw new StorageError(`Supabase: não foi possível criar o registro '${ROW_ID}' em ${SUPABASE_TABLE}.`);
    console.info(`[bento] registro '${ROW_ID}' criado no Supabase a partir de config/site.ts`);
    return this.snapshot(created);
  }

  async write(data: BentoData, expected?: string | null): Promise<void> {
    // só atualiza se updated_at ainda for o lido (trava otimista)
    const filter = `id=eq.${ROW_ID}` + (expected ? `&updated_at=eq.${encodeURIComponent(expected)}` : "");
    const rows = await this.request(`${filter}&select=updated_at`, {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
    if (!rows.length) {
      throw expected
        ? new ConflictError("Os dados foram alterados em outra aba ou servidor. Recarregue o painel e refaça a edição.")
        : new StorageError(`Supabase: registro '${ROW_ID}' não encontrado em ${SUPABASE_TABLE}.`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   escolha                                  */
/* -------------------------------------------------------------------------- */

/** Configuração do Supabase presente mas inválida: falha com a explicação, sem tocar em nada. */
class MisconfiguredRepository implements BentoRepository {
  readonly kind = "supabase";
  constructor(private readonly reason: string) {}
  read(): Promise<BentoSnapshot> {
    return Promise.reject(new StorageError(this.reason));
  }
  write(): Promise<void> {
    return Promise.reject(new StorageError(this.reason));
  }
}

/** Remove espaços, quebras de linha e aspas que costumam vir junto ao colar o valor no painel. */
const cleanEnv = (v: string | undefined) => (v ?? "").trim().replace(/^(['"`])([\s\S]*)\1$/, "$2").trim();

/** Mostra só o começo do valor (para o erro ajudar sem expor o conteúdo inteiro). */
const maskValue = (v: string) => `"${v.slice(0, 10)}${v.length > 10 ? "…" : ""}" (${v.length} caracteres)`;

const URL_FORMAT = "o formato esperado é https://<id-do-projeto>.supabase.co (Supabase → Project Settings → API)";

type SupabaseConfig = { ok: true; origin: string; key: string } | { ok: false; reason: string } | null;

/**
 * Lê e valida `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
 * `null` = nenhuma das duas definida (usa o arquivo local).
 */
export function parseSupabaseConfig(env: Partial<Record<string, string>> = process.env): SupabaseConfig {
  const rawUrl = cleanEnv(env.SUPABASE_URL);
  const key = cleanEnv(env.SUPABASE_SERVICE_ROLE_KEY).replace(/^Bearer\s+/i, "");
  if (!rawUrl && !key) return null;
  if (!rawUrl) return { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY está definida, mas SUPABASE_URL não." };
  if (!key) return { ok: false, reason: "SUPABASE_URL está definida, mas SUPABASE_SERVICE_ROLE_KEY não." };

  if (!/^https?:\/\//i.test(rawUrl)) {
    return { ok: false, reason: `SUPABASE_URL malformada: precisa começar com https:// — recebido ${maskValue(rawUrl)}; ${URL_FORMAT}.` };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: `SUPABASE_URL malformada (não é uma URL válida) — recebido ${maskValue(rawUrl)}; ${URL_FORMAT}.` };
  }
  if (/(^|\.)supabase\.com$/i.test(url.hostname)) {
    return { ok: false, reason: `SUPABASE_URL aponta para o painel (${url.hostname}), não para a API do projeto; ${URL_FORMAT}.` };
  }

  if (/\s/.test(key)) return { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY contém espaços ou quebras de linha no meio; cole a chave de novo." };
  if (/^sb_publishable_/i.test(key) || jwtRole(key) === "anon") {
    return { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY é a chave pública (anon/publishable); use a service_role (secret)." };
  }

  // só a origem: tolera barra final ou /rest/v1 colados junto
  return { ok: true, origin: url.origin, key };
}

/** `role` de uma chave JWT do Supabase (ou null se não for JWT). */
function jwtRole(key: string): string | null {
  const payload = key.split(".")[1];
  if (!payload || !key.startsWith("eyJ")) return null;
  try {
    return (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

/** Motivo legível de uma falha de fetch (DNS, recusa, timeout…). */
function networkReason(err: unknown): string {
  const e = err as Error & { cause?: { code?: string } };
  if (e?.name === "TimeoutError") return `sem resposta em ${TIMEOUT_MS / 1000}s`;
  switch (e?.cause?.code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "endereço não encontrado (DNS): confira o id do projeto na URL";
    case "ECONNREFUSED":
      return "conexão recusada";
    case "ECONNRESET":
      return "conexão interrompida";
    case "CERT_HAS_EXPIRED":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
      return "certificado TLS inválido";
    default:
      return e?.cause?.code ? `erro de rede ${e.cause.code}` : "erro de rede";
  }
}

let repo: BentoRepository | null = null;

/** Supabase quando as duas variáveis existem; senão o arquivo local (só desenvolvimento). */
export function getRepository(): BentoRepository {
  if (repo) return repo;
  const config = parseSupabaseConfig();
  if (!config) {
    repo = new FileBentoRepository(DATA_FILE);
  } else if (config.ok) {
    repo = new SupabaseBentoRepository(config.origin, config.key);
  } else {
    // configuração quebrada em produção: não cai no arquivo (as edições sumiriam); mostra o motivo
    console.error(`[bento] ${config.reason}`);
    repo = new MisconfiguredRepository(config.reason);
  }
  return repo;
}

/* -------------------------------------------------------------------------- */
/*                                   leitura                                  */
/* -------------------------------------------------------------------------- */

/** Documento completo (inclui conquistas inativas), sem cache — para o admin. */
export async function readBento(): Promise<BentoData> {
  return (await getRepository().read()).data;
}

/**
 * Dados formatados para a Home, cacheados com a tag "bento". Se o
 * armazenamento falhar (Supabase fora do ar, arquivo corrompido…), cai no seed
 * de `config/site.ts` só para EXIBIR — nada é gravado — e a página nunca quebra.
 */
export async function getBentoView(): Promise<BentoView> {
  "use cache";
  cacheTag(BENTO_TAG);
  try {
    const view = toView((await getRepository().read()).data);
    cacheLife("max");
    return view;
  } catch (err) {
    console.error("[bento] falha ao ler os dados; usando config/site.ts:", err);
    // falha não fica cacheada por muito tempo: corrigida a configuração, a Home se recupera sozinha
    cacheLife("minutes");
    return toView(buildSeed());
  }
}

/* -------------------------------------------------------------------------- */
/*                                   escrita                                  */
/* -------------------------------------------------------------------------- */

// fila: cada leitura-alteração-escrita espera a anterior (sem perder edições simultâneas)
let queue: Promise<unknown> = Promise.resolve();

/** Aplica `fn` ao documento atual, salva e expira o cache da Home. */
export function mutateBento(fn: (data: BentoData) => BentoData): Promise<BentoData> {
  const run = queue.then(async () => {
    const { data, version } = await getRepository().read();
    const next = fn(structuredClone(data));
    await getRepository().write(next, version);
    revalidateTag(BENTO_TAG, { expire: 0 });
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}
