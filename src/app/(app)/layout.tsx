import Link from "next/link";
import { sair } from "@/app/actions/auth";
import { NavDesktop, NavMobile } from "@/components/Navegacao";
import { itensMenu } from "@/lib/menu";
import { PERFIL } from "@/lib/constantes";
import { exigirUsuario } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const eu = await exigirUsuario();
  
  const itens = itensMenu(eu.perfil);

  return (
    <div className="min-h-dvh pb-16 lg:pb-0">
      <header className="nao-imprimir sticky top-0 z-20 bg-marca-700 pt-[env(safe-area-inset-top)] text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg ring-1 ring-white/30" />
            <span className="lg:hidden xl:inline">Manutenção Artepinus</span>
            <span className="hidden lg:inline xl:hidden">Artepinus</span>
          </Link>
          <NavDesktop itens={itens} />
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right leading-tight xl:block">
              <div className="font-semibold">{eu.nome}</div>
              <div className="text-xs text-marca-100">{PERFIL[eu.perfil]}</div>
            </div>
            <form action={sair} className="hidden lg:block">
              <button className="rounded-lg px-2 py-1 text-marca-100 hover:bg-white/10 hover:text-white">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <NavMobile itens={itens} />
    </div>
  );
}
