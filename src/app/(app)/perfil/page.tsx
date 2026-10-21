import type { Metadata } from "next";
import { trocarSenha } from "@/app/actions/auth";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Titulo } from "@/components/ui";
import { PERFIL } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const eu = await exigirUsuario();
  const setor = eu.setorId ? await db.setor.findUnique({ where: { id: eu.setorId } }) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Titulo>Meu perfil</Titulo>
      <div className="cartao space-y-1 text-sm">
        <div className="text-lg font-semibold">{eu.nome}</div>
        <div className="font-mono text-stone-600">{eu.login}</div>
        <div className="text-stone-600">
          {PERFIL[eu.perfil]}
          {setor ? ` · ${setor.nome}` : ""}
        </div>
      </div>
      <ActionForm action={trocarSenha} limparAoSalvar className="cartao space-y-3">
        <h2 className="font-semibold">Trocar senha</h2>
        <div>
          <label htmlFor="atual">Senha atual</label>
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
        <BotaoEnviar>Salvar nova senha</BotaoEnviar>
      </ActionForm>
    </div>
  );
}
