import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sair, trocarSenha } from "@/app/actions/auth";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { usuarioAtual } from "@/lib/session";

export const metadata: Metadata = { title: "Defina sua senha" };

/** Troca obrigatória de senha no primeiro acesso (ou após o admin redefinir a senha). */
export default async function TrocarSenhaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const eu = await usuarioAtual();
  if (!eu) redirect("/login");
  if (!eu.trocarSenha) redirect("/perfil");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Olá, {eu.nome.split(" ")[0]}!</h1>
          <p className="text-sm text-stone-500">Antes de continuar, defina uma nova senha pessoal.</p>
        </div>
        <ActionForm action={trocarSenha} className="cartao space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label htmlFor="atual">Senha atual (a que você recebeu)</label>
            <input id="atual" name="atual" type="password" autoComplete="current-password" required className="campo" />
          </div>
          <div>
            <label htmlFor="nova">Nova senha</label>
            <input id="nova" name="nova" type="password" autoComplete="new-password" minLength={6} required className="campo" />
          </div>
          <div>
            <label htmlFor="confirmacao">Confirme a nova senha</label>
            <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required className="campo" />
          </div>
          <BotaoEnviar className="btn-primario w-full py-2.5">Salvar e continuar</BotaoEnviar>
        </ActionForm>
        <form action={sair} className="mt-4 text-center">
          <button className="text-sm text-stone-500 hover:underline">Sair</button>
        </form>
      </div>
    </main>
  );
}
