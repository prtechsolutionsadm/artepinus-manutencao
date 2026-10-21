import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "exceljs", "sharp"],
  // O logo é lido do disco pela exportação em Excel.
  outputFileTracingIncludes: { "/relatorios/excel": ["./public/logo.png"] },
  experimental: {
    // Fotos já chegam comprimidas pelo navegador (~300 KB cada); a Vercel aceita até 4,5 MB por requisição.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
