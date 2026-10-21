import type { Metadata } from "next";
import { entrar } from "@/app/actions/auth";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="mb-3 h-16 w-16 rounded-2xl shadow" />
          <h1 className="text-2xl font-bold">Manutenção Artepinus</h1>
          <p className="text-sm text-stone-500">Entre para abrir e acompanhar requisições</p>
        </div>
        <ActionForm action={entrar} className="cartao space-y-4">
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
          <BotaoEnviar className="btn-primario w-full py-2.5">Entrar</BotaoEnviar>
        </ActionForm>
      </div>
    </main>
  );
}
