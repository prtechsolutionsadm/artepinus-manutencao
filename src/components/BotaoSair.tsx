"use client";

import { LogOut } from "lucide-react";
import { listarFila, limparFila } from "@/lib/fila-offline";

/** Sair: avisa se há requisições não enviadas e apaga as páginas guardadas no aparelho. */
export function BotaoSair({ sair, variante = "icone" }: { sair: () => Promise<void>; variante?: "icone" | "botao" }) {
  const aoSair = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pendentes = (await listarFila()).length;
    if (pendentes && !confirm(`Há ${pendentes} requisição(ões) feitas sem internet que ainda não foram enviadas. Se sair agora, elas serão perdidas. Sair mesmo assim?`)) return;
    await limparFila();
    navigator.serviceWorker?.controller?.postMessage({ tipo: "limpar" });
    await sair();
  };
  return (
    <form onSubmit={aoSair}>
      {variante === "icone" ? (
        <button aria-label="Sair" title="Sair" className="grid h-9 w-9 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-rose-600">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <button className="btn-secundario w-full py-3 text-rose-700">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      )}
    </form>
  );
}
