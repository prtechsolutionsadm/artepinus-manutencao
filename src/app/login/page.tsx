import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Factory, Gauge } from "lucide-react";
import { entrar } from "@/app/actions/auth";
import { Rodape } from "@/components/Rodape";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-marca-700 to-marca-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-branco.svg" alt="Artepinus" className="h-24 w-auto" />
          <div className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-marca-100">Sistema de produção</div>
        </div>
        <div className="max-w-md space-y-8">
          <h2 className="text-4xl font-bold leading-tight">Da floresta ao pacote, sem papel.</h2>
          <ul className="space-y-4 text-marca-100">
            <li className="flex gap-3">
              <ClipboardCheck className="h-5 w-5 shrink-0 text-white" /> Cada pacote com QR Code e toda a sua história.
            </li>
            <li className="flex gap-3">
              <Factory className="h-5 w-5 shrink-0 text-white" /> Lance a produção e as paradas da serraria no fim do turno.
            </li>
            <li className="flex gap-3">
              <Gauge className="h-5 w-5 shrink-0 text-white" /> Indicadores, OEE e comparativos mensais.
            </li>
          </ul>
        </div>
        <Rodape claro className="text-left" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-10 top-1/3 h-56 w-56 rounded-full bg-white/5" />
      </section>

      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" className="absolute left-4 top-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 sm:left-8 sm:top-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Artepinus" className="mb-6 h-24 w-auto lg:hidden" />
            <h1 className="text-2xl font-bold">Entrar</h1>
            <p className="mt-1 text-sm text-stone-500">Use seu login no formato nome.sobrenome</p>
          </div>
          <ActionForm action={entrar} className="space-y-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <div>
              <label htmlFor="login">Login</label>
              <input
                id="login"
                name="login"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="nome.sobrenome"
                required
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="senha">Senha</label>
              <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
            </div>
            <BotaoEnviar className="btn-primario w-full py-3">Entrar</BotaoEnviar>
          </ActionForm>
          <p className="mt-8 text-center text-xs text-stone-400">Esqueceu a senha? Fale com o administrador do sistema.</p>
          <Rodape className="mt-10 lg:hidden" />
        </div>
      </section>
    </main>
  );
}
