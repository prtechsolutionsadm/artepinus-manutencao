"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir({ rotulo = "Imprimir", icone = <Printer className="h-4 w-4" /> }: { rotulo?: string; icone?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secundario">
      {icone}
      {rotulo}
    </button>
  );
}
