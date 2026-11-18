"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Tema claro/escuro (next-themes) usando a classe `.dark` no <html>.
 * - `defaultTheme="system"`: segue a preferência do sistema; sem preferência
 *   escura configurada, o navegador informa "light" e o site abre no claro.
 * - A escolha manual (botão flutuante) fica salva no localStorage.
 */
export default function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      {...props}
    />
  );
}
