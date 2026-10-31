import { cookies } from "next/headers";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { sair } from "@/app/actions/auth";
import { BotaoSair } from "@/components/BotaoSair";
import { BarraInferior, BuscaTopo, MenuLateral, SecaoAtual } from "@/components/Navegacao";
import { SincronizadorOffline } from "@/components/SincronizadorOffline";
import { Rodape } from "@/components/Rodape";
import { Sininho } from "@/components/Sininho";
import { PERFIL, PERFIL_PRODUCAO } from "@/lib/constantes";
import { db } from "@/lib/db";
import { COOKIE_MODULO, iniciais, menusDoUsuario, moduloSalvo } from "@/lib/menu";
import { temModulo } from "@/lib/permissoes";
import { exigirUsuario, inicioDe } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const eu = await exigirUsuario();
  const menus = menusDoUsuario(eu);
  const salvo = moduloSalvo((await cookies()).get(COOKIE_MODULO)?.value);
  const perfilLabel = [
    temModulo(eu, "manutencao") ? PERFIL[eu.perfil] : null,
    eu.perfilProducao && eu.perfil !== "ADMIN" && eu.perfil !== "GERENTE" ? `Produção: ${PERFIL_PRODUCAO[eu.perfilProducao]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // Sem nenhum módulo ativo (ex.: só tinha acesso à manutenção, que está desligada)
  if (Object.keys(menus).length === 0) {
    return (
      <div className="min-h-dvh">
        <header className="border-b border-stone-200 bg-white pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca.svg" alt="" className="h-7 w-auto" />
              <span className="font-serif text-lg font-bold italic tracking-wide text-[#177009]">ARTEPINUS</span>
            </Link>
            <div className="ml-auto">
              <BotaoSair sair={sair} variante="botao" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
          <p role="status" className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Seu usuário ainda não tem acesso ao sistema de produção. Fale com o gerente para liberar o seu perfil.
          </p>
          {children}
          <Rodape className="mt-12 border-t border-stone-200/70 pt-6" />
        </main>
      </div>
    );
  }
  const naoLidas = await db.notificacao.count({ where: { usuarioId: eu.id, lida: false } });

  return (
    <div className="min-h-dvh">
      <MenuLateral menus={menus} salvo={salvo} usuario={{ nome: eu.nome, perfilLabel }} sair={sair} />

      <div className="lg:pl-64 print:pl-0">
        <header className="nao-imprimir sticky top-0 z-20 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8 2xl:max-w-[1440px]">
            <Link href={inicioDe(eu)} className="flex items-center gap-2.5 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca.svg" alt="" className="h-7 w-auto" />
              <span className="font-serif text-lg font-bold italic tracking-wide text-[#177009]">ARTEPINUS</span>
            </Link>

            <SecaoAtual menus={menus} salvo={salvo} />
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

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-7 lg:pt-7 2xl:max-w-[1440px]">
          <SincronizadorOffline />
          {children}
          {/* No computador os créditos ficam no menu lateral */}
          <Rodape className="nao-imprimir mt-12 border-t border-stone-200/70 pt-6 lg:hidden" />
        </main>
      </div>

      <BarraInferior menus={menus} salvo={salvo} />
    </div>
  );
}
