import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, assinarSessao, lerSessao, type Sessao } from "@/lib/jwt";
import type { Perfil } from "@/generated/prisma/enums";
import { pode, type Acao } from "@/lib/permissoes";

const DURACAO_DIAS = 30;

export async function criarSessao(sessao: Sessao) {
  const expira = new Date(Date.now() + DURACAO_DIAS * 24 * 60 * 60 * 1000);
  const token = await assinarSessao(sessao, expira);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Usuário logado (consultado no banco, para refletir desativação/troca de perfil). */
export const usuarioAtual = cache(async () => {
  const sessao = await lerSessao((await cookies()).get(SESSION_COOKIE)?.value);
  if (!sessao) return null;
  const usuario = await db.usuario.findUnique({
    where: { id: sessao.userId },
    select: { id: true, nome: true, login: true, perfil: true, ativo: true, trocarSenha: true },
  });
  if (!usuario?.ativo) return null;
  return usuario;
});

export async function exigirUsuario(perfis?: Perfil[]) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.trocarSenha) redirect("/trocar-senha");
  if (perfis && !perfis.includes(usuario.perfil)) redirect("/");
  return usuario;
}

export type UsuarioAtual = NonNullable<Awaited<ReturnType<typeof usuarioAtual>>>;

/** Usuário logado com permissão para a ação; senão volta para o início. */
export async function exigirPermissao(acao: Acao) {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, acao)) redirect("/");
  return usuario;
}
