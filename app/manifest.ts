import { siteConfig } from "@/config/site";
import { ICON_VERSION } from "@/config/icons";
import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA (servido em /manifest.webmanifest e ligado no <head> pelo Next).
 * Ícones gerados a partir da logo oficial (public/logo-black.png): símbolo branco
 * sobre o laranja da marca. `?v=` força o navegador a trocar ícones já em cache.
 */
export default function manifest(): MetadataRoute.Manifest {
  const v = `?v=${ICON_VERSION}`;
  return {
    id: "/",
    name: siteConfig.fullName,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#ff6600",
    icons: [
      { src: `/icon-192x192.png${v}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512x512.png${v}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icon-maskable-192x192.png${v}`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/icon-maskable-512x512.png${v}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
