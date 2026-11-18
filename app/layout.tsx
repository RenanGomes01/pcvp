import SmoothScroll from "@/components/site/smooth-scroll";
import ThemeProvider from "@/components/site/theme-provider";
import ThemeToggle from "@/components/site/theme-toggle";
import { siteConfig } from "@/config/site";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: siteConfig.fullName, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.fullName,
    description: siteConfig.description,
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // desenha por baixo da Ilha Dinâmica / barra de gestos (sem faixas pretas);
  // o recuo fica a cargo de env(safe-area-inset-*) em globals.css
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      // next-themes adiciona/remove a classe `dark` antes da hidratação
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full bg-bezel antialiased`}
    >
      <body className="flex min-h-dvh w-full flex-col">
        <ThemeProvider>
          <SmoothScroll>{children}</SmoothScroll>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
