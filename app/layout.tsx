import SmoothScroll from "@/components/site/smooth-scroll";
import ThemeProvider from "@/components/site/theme-provider";
import ThemeToggle from "@/components/site/theme-toggle";
import { ICON_VERSION } from "@/config/icons";
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
  applicationName: siteConfig.fullName,
  // ícones gerados a partir da logo oficial; `?v=` invalida os antigos em cache (Safari/iOS)
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_VERSION}`, sizes: "48x48" },
      { url: `/favicon-32x32.png?v=${ICON_VERSION}`, sizes: "32x32", type: "image/png" },
      { url: `/favicon-16x16.png?v=${ICON_VERSION}`, sizes: "16x16", type: "image/png" },
      { url: `/icon-192x192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `/favicon.ico?v=${ICON_VERSION}`,
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    // conteúdo por baixo da barra de status (combina com viewportFit: "cover")
    statusBarStyle: "black-translucent",
  },
  // o Next só emite `mobile-web-app-capable`; iPhones com iOS antigo ainda leem esta
  other: { "apple-mobile-web-app-capable": "yes" },
  openGraph: {
    title: siteConfig.fullName,
    description: siteConfig.description,
    locale: "pt_BR",
    type: "website",
    siteName: siteConfig.fullName,
    images: [{ url: `/og-image.png?v=${ICON_VERSION}`, width: 1200, height: 630, alt: siteConfig.fullName }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.fullName,
    description: siteConfig.description,
    images: [`/og-image.png?v=${ICON_VERSION}`],
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
