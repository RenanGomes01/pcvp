/**
 * Persistência do Bento Grid (somente servidor).
 *
 * - `BentoRepository` é a interface de armazenamento. Hoje há uma
 *   implementação em arquivo (`data/bento.json`, criado a partir do seed de
 *   `config/site.ts` no primeiro uso). Para usar o Supabase em produção, basta
 *   criar outra implementação com `read`/`write` e devolvê-la em
 *   `getRepository()` (ex.: quando `process.env.SUPABASE_URL` existir).
 * - `getBentoView()` é a leitura usada pela Home: cacheada com a tag "bento",
 *   então a página continua pré-renderizada. Toda escrita (`mutateBento`)
 *   expira a tag e a próxima visita já recebe os dados novos.
 */

import { buildSeed, parseBentoData, toView, type BentoData, type BentoView } from "@/lib/bento";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const BENTO_TAG = "bento";

export interface BentoRepository {
  read(): Promise<BentoData>;
  write(data: BentoData): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                           implementação em arquivo                         */
/* -------------------------------------------------------------------------- */

const DATA_FILE = path.join(process.cwd(), "data", "bento.json");

class FileBentoRepository implements BentoRepository {
  constructor(private readonly file: string) {}

  async read(): Promise<BentoData> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // primeiro uso: cria o arquivo a partir do seed (se o disco permitir)
      const seed = buildSeed();
      await this.write(seed).catch((e) => console.warn("[bento] não foi possível criar data/bento.json:", e));
      return seed;
    }
    return parseBentoData(JSON.parse(raw));
  }

  async write(data: BentoData): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    // escrita atômica: grava num temporário e renomeia (nunca deixa JSON pela metade)
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(tmp, this.file);
  }
}

let repo: BentoRepository | null = null;

/** Ponto único de troca do armazenamento (arquivo hoje; Supabase depois). */
export function getRepository(): BentoRepository {
  repo ??= new FileBentoRepository(DATA_FILE);
  return repo;
}

/* -------------------------------------------------------------------------- */
/*                                   leitura                                  */
/* -------------------------------------------------------------------------- */

/** Documento completo (inclui conquistas inativas), sem cache — para o admin. */
export async function readBento(): Promise<BentoData> {
  return getRepository().read();
}

/**
 * Dados formatados para a Home, cacheados com a tag "bento". Se o
 * armazenamento falhar (arquivo corrompido, sem permissão…), cai no seed de
 * `config/site.ts` para a página nunca quebrar.
 */
export async function getBentoView(): Promise<BentoView> {
  "use cache";
  cacheTag(BENTO_TAG);
  cacheLife("max");
  try {
    return toView(await getRepository().read());
  } catch (err) {
    console.error("[bento] falha ao ler os dados; usando config/site.ts:", err);
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
    const next = fn(structuredClone(await getRepository().read()));
    await getRepository().write(next);
    revalidateTag(BENTO_TAG, { expire: 0 });
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}
