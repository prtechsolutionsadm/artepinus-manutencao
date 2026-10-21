import Link from "next/link";
import { Search } from "lucide-react";
import { sair } from "@/app/actions/auth";
import { BarraInferior, MenuLateral } from "@/components/Navegacao";
import { SincronizadorOffline } from "@/components/SincronizadorOffline";
import { Rodape } from "@/components/Rodape";
import { Sininho } from "@/components/Sininho";
import { PERFIL } from "@/lib/constantes";
import { db } from "@/lib/db";
import { gruposMenu, iniciais } from "@/lib/menu";
import { exigirUsuario } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const eu = await exigirUsuario();
  const grupos = gruposMenu(eu.perfil);
  const naoLidas = await db.notificacao.count({ where: { usuarioId: eu.id, lida: false } });

  return (
    <div className="min-h-dvh">
      <MenuLateral grupos={grupos} usuario={{ nome: eu.nome, perfilLabel: PERFIL[eu.perfil] }} sair={sair} />

      <div className="lg:pl-64 print:pl-0">
        <header className="nao-imprimir sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca.svg" alt="" className="h-7 w-auto" />
              <span className="font-serif text-lg font-bold italic tracking-wide text-[#177009]">ARTEPINUS</span>
            </Link>

            <form action="/requisicoes" className="relative hidden max-w-md flex-1 sm:block lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                name="q"
                type="search"
                placeholder="Buscar requisição, nº ou equipamento…"
                className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none transition focus:border-marca-500 focus:bg-white focus:ring-2 focus:ring-marca-500/20"
              />
            </form>

            <div className="ml-auto flex items-center gap-1">
              <Link href="/requisicoes" aria-label="Buscar" className="grid h-10 w-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100 sm:hidden">
                <Search className="h-5 w-5" />
              </Link>
              <Sininho naoLidasInicial={naoLidas} />
              <Link
                href="/perfil"
                aria-label="Meu perfil"
                className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-marca-100 text-sm font-semibold text-marca-700 lg:hidden"
              >
                {iniciais(eu.nome)}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <SincronizadorOffline />
          {children}
          <Rodape className="nao-imprimir mt-12 border-t border-stone-200/70 pt-6" />
        </main>
      </div>

      <BarraInferior grupos={grupos} />
    </div>
  );
}
