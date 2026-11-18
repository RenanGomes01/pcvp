import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

/**
 * Origens liberadas para o dev server (HMR, /_next/*) quando o site é aberto
 * pelo celular na rede local. Só vale em `next dev`.
 *
 * `allowedDevOrigins` só aceita strings (não aceita regex). Cada `*` vale
 * por um trecho inteiro do hostname, então `192.168.*.*` cobre qualquer IP
 * dessa faixa. Combinamos:
 *  1. as faixas de IP privado (RFC 1918): funcionam em qualquer Wi-Fi, mesmo
 *     se você trocar de rede com o servidor rodando;
 *  2. os IPv4 detectados na máquina ao subir o servidor, para redes fora
 *     dessas faixas (ex.: CGNAT 100.64.x.x, VPN).
 */
const privateRanges = [
  "192.168.*.*",
  "10.*.*.*",
  // 172.16.0.0 – 172.31.255.255 (inclui o hotspot do iPhone, 172.20.10.x)
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  // nomes mDNS / Bonjour (ex.: meu-notebook.local)
  "*.local",
];

const localIPv4s = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net?.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...new Set(["127.0.0.1", ...privateRanges, ...localIPv4s])],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
