import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/actions/auth";
import { PERFIL } from "@/lib/constantes";
import { itensMenu } from "@/lib/menu";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Menu" };

/** Menu completo para o celular (a barra inferior só tem os atalhos principais). */
export default async function MenuPage() {
  const eu = await exigirUsuario();
  const itens = itensMenu(eu.perfil).filter((i) => !i.soMobile);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="cartao">
        <div className="text-lg font-semibold">{eu.nome}</div>
        <div className="text-sm text-stone-500">
          <span className="font-mono">{eu.login}</span> · {PERFIL[eu.perfil]}
        </div>
      </div>
      <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {itens.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex items-center gap-3 px-4 py-3.5 text-base hover:bg-stone-50 active:bg-stone-100">
              <span className="w-6 text-center text-xl" aria-hidden>
                {i.icone}
              </span>
              <span className="flex-1">{i.label}</span>
              <span className="text-stone-400">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <form action={sair}>
        <button className="btn-secundario w-full py-3 text-rose-700">Sair</button>
      </form>
    </div>
  );
}
