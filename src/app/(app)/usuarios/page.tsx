import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { salvarUsuario } from "@/app/actions/admin";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Badge, Titulo } from "@/components/ui";
import { PERFIL, PERFIL_PRODUCAO } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirPermissao } from "@/lib/session";
import { MODULOS_ATIVOS, PERFIS_ATRIBUIVEIS } from "@/lib/permissoes";
import type { Perfil, PerfilProducao } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Usuários" };

type Usr = { id: string; nome: string; login: string; perfil: Perfil; perfilProducao: PerfilProducao | null; ativo: boolean };

const MANUTENCAO_ATIVA = MODULOS_ATIVOS.includes("manutencao");

/** Com a manutenção desligada, o perfil geral só distingue Gerente (acesso total) dos demais. */
function opcoesPerfil(atual?: Perfil): { valor: Perfil; rotulo: string }[] {
  if (atual === "ADMIN") return [{ valor: "ADMIN", rotulo: PERFIL.ADMIN }];
  if (MANUTENCAO_ATIVA) return PERFIS_ATRIBUIVEIS.map((k) => ({ valor: k, rotulo: PERFIL[k] }));
  const base: { valor: Perfil; rotulo: string }[] = [
    { valor: "SEM_ACESSO", rotulo: "Usuário (acesso pelo perfil na Produção)" },
    { valor: "GERENTE", rotulo: "Gerente (acesso total e usuários)" },
  ];
  // Mantém o perfil de manutenção de quem já tinha, para não perder ao salvar
  return atual && !base.some((b) => b.valor === atual) ? [...base, { valor: atual, rotulo: `${PERFIL[atual]} (manutenção)` }] : base;
}

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
          <label>{MANUTENCAO_ATIVA ? "Perfil na Manutenção" : "Acesso geral"}</label>
          <select name="perfil" defaultValue={u?.perfil ?? (MANUTENCAO_ATIVA ? "OPERADOR" : "SEM_ACESSO")} className="campo">
            {opcoesPerfil(u?.perfil).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Perfil na Produção</label>
          {u?.perfil === "ADMIN" || u?.perfil === "GERENTE" ? (
            <p className="campo flex items-center bg-stone-50 text-stone-500">Acesso total (Admin/Gerente)</p>
          ) : (
            <select name="perfilProducao" defaultValue={u?.perfilProducao ?? ""} className="campo">
              <option value="">Sem acesso</option>
              {(Object.keys(PERFIL_PRODUCAO) as PerfilProducao[]).map((k) => (
                <option key={k} value={k}>
                  {PERFIL_PRODUCAO[k]}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-stone-500">Supervisor: tudo, inclusive cadastros · Apontador: lança dados · Consulta: só vê. Gerente tem acesso total.</p>
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
  const eu = await exigirPermissao("usuarios");
  // A conta de administrador (desenvolvedor) só aparece para o próprio administrador
  const usuarios = await db.usuario.findMany({
    where: eu.perfil === "ADMIN" ? {} : { perfil: { not: "ADMIN" } },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, login: true, perfil: true, perfilProducao: true, ativo: true },
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
                {(u.perfil === "ADMIN" || u.perfil === "GERENTE") && <Badge cor="bg-marca-50 text-marca-700 ring-marca-100">{PERFIL[u.perfil]} · acesso total</Badge>}
                {MANUTENCAO_ATIVA && u.perfil !== "SEM_ACESSO" && u.perfil !== "ADMIN" && u.perfil !== "GERENTE" && (
                  <Badge cor="bg-marca-50 text-marca-700 ring-marca-100">Manutenção · {PERFIL[u.perfil]}</Badge>
                )}
                {u.perfilProducao && u.perfil !== "ADMIN" && u.perfil !== "GERENTE" && (
                  <Badge cor="bg-amber-50 text-amber-800 ring-amber-100">Produção · {PERFIL_PRODUCAO[u.perfilProducao]}</Badge>
                )}
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
