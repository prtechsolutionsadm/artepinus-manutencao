import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BotaoSair } from "@/components/BotaoSair";
import { sair } from "@/app/actions/auth";
import { ICONES } from "@/components/icones";
import { PERFIL } from "@/lib/constantes";
import { gruposMenu, iniciais } from "@/lib/menu";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Menu" };

/** Menu completo no celular (a barra inferior só tem os atalhos principais). */
export default async function MenuPage() {
  const eu = await exigirUsuario();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-marca-100 text-lg font-semibold text-marca-700">{iniciais(eu.nome)}</span>
        <div>
          <div className="text-lg font-semibold leading-tight">{eu.nome}</div>
          <div className="text-sm text-stone-500">
            <span className="font-mono">{eu.login}</span> · {PERFIL[eu.perfil]}
          </div>
        </div>
      </div>
      {gruposMenu(eu.perfil).map((g) => (
        <section key={g.titulo}>
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{g.titulo}</h2>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {g.itens.map((i) => {
              const Icone = ICONES[i.icone];
              return (
                <li key={i.href}>
                  <Link href={i.href} className="flex items-center gap-3 px-4 py-3.5 active:bg-stone-50">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-stone-600">
                      <Icone className="h-[18px] w-[18px]" />
                    </span>
                    <span className="flex-1 font-medium">{i.label}</span>
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <BotaoSair sair={sair} variante="botao" />
    </div>
  );
}
