import type { Metadata, Viewport } from "next";
import { RegistrarSW } from "@/components/RegistrarSW";
import { EMPRESA } from "@/lib/empresa";
import "./globals.css";

/** Endereço público do site (links absolutos do preview de compartilhamento). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? EMPRESA.site;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Artepinus Madeiras", template: "%s · Artepinus Madeiras" },
  description: "Artepinus: madeira serrada de pinus e sistema de produção",
  applicationName: "Artepinus Madeiras",
  authors: [{ name: "PR Tech Solutions" }],
  creator: "PR Tech Solutions",
  publisher: "Artepinus Indústria e Comércio de Madeiras LTDA",
  appleWebApp: { capable: true, title: "Artepinus", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
      { url: "/icons/pinheiro-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
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
