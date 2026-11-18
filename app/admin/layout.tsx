import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel administrativo",
  // o painel não deve aparecer em buscadores
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
