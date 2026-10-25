"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Resultado } from "@/app/actions/producao";

/**
 * Botão que chama uma Server Action com um argumento fixo. Opcionalmente pede
 * confirmação e, no sucesso, navega para `depois` (aceita `{id}`) ou recarrega.
 */
export function BotaoAcao({
  acao,
  arg,
  confirmar,
  depois,
  className = "btn-secundario",
  children,
}: {
  acao: (arg: string) => Promise<Resultado>;
  arg: string;
  confirmar?: string;
  depois?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      className={className}
      onClick={() => {
        if (confirmar && !window.confirm(confirmar)) return;
        iniciar(async () => {
          const r = await acao(arg);
          if (r.erro) return window.alert(r.erro);
          if (depois) router.push(depois.replace("{id}", String(r.id ?? "")));
          router.refresh();
        });
      }}
    >
      {pendente ? "Aguarde…" : children}
    </button>
  );
}
