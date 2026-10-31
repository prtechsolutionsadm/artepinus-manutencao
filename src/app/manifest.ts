import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Artepinus · Produção",
    short_name: "Artepinus",
    description: "Produção da Artepinus: boletins da serraria, estufas, pacotes com QR Code e indicadores",
    lang: "pt-BR",
    start_url: "/sistema",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ler QR do pacote", url: "/producao/escanear" },
      { name: "Novo boletim", url: "/producao/boletins/novo" },
    ],
  };
}
