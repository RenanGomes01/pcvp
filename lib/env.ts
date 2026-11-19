/**
 * Leitura de variáveis de ambiente coladas em painéis (Vercel, .env): remove
 * espaços, quebras de linha e aspas em volta, que costumam vir junto e fazem
 * o valor real não bater (ex.: `"pcvp2026"` ou `pcvp2026\n`).
 */
export const cleanEnv = (v: string | undefined) => (v ?? "").trim().replace(/^(['"`])([\s\S]*)\1$/, "$2").trim();
