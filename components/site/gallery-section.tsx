import ShuffledGallery from "@/components/site/shuffled-gallery";
import type { PassageItem } from "@/components/ui/passage-gallery";
import { siteConfig } from "@/config/site";
import { Hand, Mouse } from "lucide-react";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Só fotos; o resto (ex.: `LEIA-ME.md`) é ignorado. */
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

const titleCase = (word: string) => siteConfig.gallery.names[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Legenda a partir do nome do arquivo:
 * "brendow-paulo.png" → "Brendow e Paulo"; "brendow-yuri-barrao.png" →
 * "Brendow, Yuri e Barrão"; "victor2.png" → "Victor"; nomes em `gallery.labels` usam a legenda fixa.
 */
function caption(file: string) {
  const base = file.replace(IMAGE_EXT, "");
  const fixed = siteConfig.gallery.labels[base];
  if (fixed) return fixed;
  // número no fim só diferencia fotos da mesma pessoa: "kayox2" → "Kayox"
  const words = base
    .split(/[-_\s]+/)
    .map((word) => word.replace(/\d+$/, ""))
    .filter(Boolean)
    .map(titleCase);
  if (words.length <= 1) return words[0] ?? base;
  return `${words.slice(0, -1).join(", ")} e ${words.at(-1)}`;
}

/**
 * Lê `public/gallery` no servidor (no build) e gera os itens do túnel.
 * Para adicionar ou remover fotos, basta mexer nos arquivos dessa pasta.
 */
function getGalleryItems(): PassageItem[] {
  const dir = path.join(process.cwd(), "public", "gallery");
  try {
    // a mesma foto salva com dois nomes entra uma vez só (compara o conteúdo)
    const seen = new Set<string>();
    return fs
      .readdirSync(dir)
      .filter((file) => IMAGE_EXT.test(file))
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .filter((file) => {
        const hash = createHash("sha1").update(fs.readFileSync(path.join(dir, file))).digest("hex");
        if (seen.has(hash)) return false;
        seen.add(hash);
        return true;
      })
      .map((file) => {
        const label = caption(file);
        return {
          src: `/gallery/${encodeURIComponent(file)}`,
          alt: /\bPCVP\b/.test(label) ? label : `${label} - PCVP`,
          title: label,
        };
      });
  } catch {
    return [];
  }
}

/** Server Component: seção da galeria 3D (túnel de fotos). */
export default function GallerySection() {
  const items = getGalleryItems();
  const { gallery } = siteConfig;

  return (
    <section
      aria-labelledby="galeria-titulo"
      className="relative mx-1.5 my-16 overflow-hidden rounded-[1.75rem] bg-shell ring-1 ring-white/5 sm:mx-2 sm:my-24 sm:rounded-[2.5rem]"
      id="galeria"
    >
      {/* faixa de instrução: discreta, fora do canvas, sempre legível */}
      <p
        className="flex items-center justify-center gap-2 border-b border-white/5 px-5 py-3 text-center text-xs text-white/50 sm:text-sm"
        id="galeria-ajuda"
      >
        <Mouse aria-hidden className="hidden size-4 shrink-0 sm:block" strokeWidth={1.75} />
        <Hand aria-hidden className="size-4 shrink-0 sm:hidden" strokeWidth={1.75} />
        <span className="hidden sm:inline">{gallery.helper}</span>
        <span className="sm:hidden">{gallery.helperTouch}</span>
      </p>

      {/*
        Altura reduzida = "rota de fuga": a página acima e abaixo do túnel
        continua visível, então sempre há área fora da galeria para rolar.
        Mobile: 78svh (mín. 520px) deixa o túnel alongado na vertical, e
        ainda sobra borda da página acima/abaixo; de qualquer forma, o
        arraste vertical no túnel rola a página (touch-pan-y).
      */}
      <ShuffledGallery
        ariaLabel={gallery.ariaLabel}
        backgroundColor="#0a0a0a"
        className="theme-fixed h-[78svh] min-h-[520px] w-full sm:h-[70vh] sm:min-h-[500px] lg:max-h-[760px]"
        colors={["#ff6600", "#ffb703"]}
        items={items}
      >
        <div className="flex flex-col items-center px-6 text-center">
          <span className="mb-4 text-xs font-medium tracking-[0.3em] text-white/60 uppercase">{gallery.eyebrow}</span>
          <h2
            className="text-[clamp(2.2rem,7vw,5rem)] leading-none font-medium tracking-tight text-white [text-shadow:0_4px_40px_rgb(0_0_0/0.8)]"
            id="galeria-titulo"
          >
            {gallery.title} <span className="font-serif font-normal text-brand italic">{gallery.accent}</span>
          </h2>
        </div>
      </ShuffledGallery>
    </section>
  );
}
