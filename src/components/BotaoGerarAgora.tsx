"use client";

import { useState, useTransition } from "react";
import { Loader2, Zap } from "lucide-react";
import { gerarAgora } from "@/app/actions/planejamento";

export function BotaoGerarAgora({ planoId }: { planoId: string }) {
  const [pendente, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pendente}
        className="btn-secundario px-3 py-1.5 text-xs"
        onClick={() =>
          startTransition(async () => {
            const r = await gerarAgora(planoId);
            setMsg(r.length ? `Gerada ${r.join(", ")}` : "Nada para gerar");
          })
        }
      >
        {pendente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Gerar agora
      </button>
      {msg && <span className="text-xs text-stone-500">{msg}</span>}
    </span>
  );
}
