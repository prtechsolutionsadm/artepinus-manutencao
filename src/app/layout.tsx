import type { Metadata, Viewport } from "next";
import { RegistrarSW } from "@/components/RegistrarSW";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Manutenção Artepinus", template: "%s · Manutenção Artepinus" },
  description: "Requisições e histórico de manutenção da Artepinus",
  applicationName: "Manutenção Artepinus",
  authors: [{ name: "PR Tech Solutions" }],
  creator: "PR Tech Solutions",
  publisher: "Artepinus Indústria e Comércio de Madeiras LTDA",
  appleWebApp: { capable: true, title: "Manutenção", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
