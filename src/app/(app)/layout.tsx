import { cookies } from "next/headers";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { sair } from "@/app/actions/auth";
import { BarraInferior, BuscaTopo, MenuLateral } from "@/components/Navegacao";
import { SincronizadorOffline } from "@/components/SincronizadorOffline";
import { Rodape } from "@/components/Rodape";
import { Sininho } from "@/components/Sininho";
import { PERFIL, PERFIL_PRODUCAO } from "@/lib/constantes";
import { db } from "@/lib/db";
import { COOKIE_MODULO, iniciais, menusDoUsuario, moduloSalvo } from "@/lib/menu";
import { podeProducao, temModulo } from "@/lib/permissoes";
import { exigirUsuario, inicioDe } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const eu = await exigirUsuario();
  const menus = menusDoUsuario(eu);
  const salvo = moduloSalvo((await cookies()).get(COOKIE_MODULO)?.value);
  const lancar = podeProducao(eu, "lancar");
  const perfilLabel = [
    temModulo(eu, "manutencao") ? PERFIL[eu.perfil] : null,
    eu.perfilProducao && eu.perfil !== "ADMIN" && eu.perfil !== "GERENTE" ? `Produção: ${PERFIL_PRODUCAO[eu.perfilProducao]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const naoLidas = await db.notificacao.count({ where: { usuarioId: eu.id, lida: false } });

  return (
    <div className="min-h-dvh">
      <MenuLateral menus={menus} salvo={salvo} podeLancarProducao={lancar} usuario={{ nome: eu.nome, perfilLabel }} sair={sair} />

      <div className="lg:pl-64 print:pl-0">
        <header className="nao-imprimir sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href={inicioDe(eu)} className="flex items-center gap-2.5 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca.svg" alt="" className="h-7 w-auto" />
              <span className="font-serif text-lg font-bold italic tracking-wide text-[#177009]">ARTEPINUS</span>
            </Link>

            <BuscaTopo menus={menus} salvo={salvo} />

            <div className="ml-auto flex items-center gap-1">
              <BuscaTopo menus={menus} salvo={salvo} celular />
              <Link href="/ajuda" aria-label="Manual do usuário" title="Manual do usuário" className="hidden h-10 w-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100 sm:grid">
                <CircleHelp className="h-5 w-5" />
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

      <BarraInferior menus={menus} salvo={salvo} podeLancarProducao={lancar} />
    </div>
  );
}
