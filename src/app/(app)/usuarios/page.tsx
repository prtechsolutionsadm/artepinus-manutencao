import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { salvarUsuario } from "@/app/actions/admin";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Badge, Titulo } from "@/components/ui";
import { PERFIL } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import type { Perfil } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Usuários" };

type Usr = { id: string; nome: string; login: string; perfil: Perfil; ativo: boolean };

function CamposUsuario({ u }: { u?: Usr }) {
  return (
    <>
      <input type="hidden" name="id" value={u?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label>Nome *</label>
          <input name="nome" defaultValue={u?.nome} required className="campo" />
        </div>
        <div>
          <label>Login (nome.sobrenome) *</label>
          <input
            name="login"
            defaultValue={u?.login}
            required
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nome.sobrenome"
            className="campo lowercase"
          />
        </div>
        <div>
          <label>Perfil</label>
          <select name="perfil" defaultValue={u?.perfil ?? "SOLICITANTE"} className="campo">
            {Object.entries(PERFIL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>{u ? "Nova senha (deixe em branco para manter)" : "Senha inicial *"}</label>
          <input name="senha" type="text" autoComplete="off" minLength={6} required={!u} className="campo" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 font-normal">
            <input type="checkbox" name="ativo" defaultChecked={u?.ativo ?? true} /> Ativo
          </label>
          <label className="flex items-center gap-2 font-normal">
            <input type="checkbox" name="trocarSenha" defaultChecked />{" "}
            {u ? "Ao redefinir a senha, exigir troca no próximo acesso" : "Exigir troca da senha no primeiro acesso"}
          </label>
        </div>
        <BotaoEnviar>{u ? "Salvar" : "Criar usuário"}</BotaoEnviar>
      </div>
    </>
  );
}

export default async function UsuariosPage() {
  await exigirUsuario(["ADMIN"]);
  const usuarios = await db.usuario.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, login: true, perfil: true, ativo: true },
  });

  return (
    <>
      <Titulo>Usuários</Titulo>
      <details className="cartao mb-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700"><Plus className="h-4 w-4" /> Novo usuário</summary>
        <ActionForm action={salvarUsuario} limparAoSalvar className="mt-4">
          <CamposUsuario />
        </ActionForm>
      </details>
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {usuarios.map((u) => (
          <li key={u.id} className="px-4 py-3">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                <span className="font-medium">{u.nome}</span>
                <span className="font-mono text-sm text-stone-500">{u.login}</span>
                <Badge cor="bg-marca-50 text-marca-700 ring-marca-100">{PERFIL[u.perfil]}</Badge>
                {!u.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativo</Badge>}
                <Pencil className="ml-auto h-4 w-4 text-stone-400" />
              </summary>
              <ActionForm action={salvarUsuario} className="mt-3">
                <CamposUsuario u={u} />
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
