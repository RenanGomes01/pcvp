"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Tema claro/escuro (next-themes) usando a classe `.dark` no <html>.
 * - Sempre abre no CLARO: `defaultTheme="light"` e `enableSystem={false}`,
 *   então a preferência escura do sistema é ignorada na primeira visita.
 * - Só muda para o escuro quando a pessoa usa o botão flutuante (sol/lua);
 *   essa escolha manual fica salva no localStorage.
 */
export default function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
      themes={["light", "dark"]}
      {...props}
    />
  );
}
