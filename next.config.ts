import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "exceljs"],
  // O logo é lido do disco pela exportação em Excel.
  outputFileTracingIncludes: { "/relatorios/excel": ["./public/logo.png"] },
};

export default nextConfig;
