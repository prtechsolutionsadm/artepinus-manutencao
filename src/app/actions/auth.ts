"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auditar } from "@/lib/auditoria";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao, usuarioAtual } from "@/lib/session";

export type EstadoForm = { erro?: string; ok?: string } | undefined;

const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1, "Informe o login"),
  senha: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

/** Só aceita caminhos internos (evita redirecionar para outro site). */
function destinoSeguro(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/sistema";
}

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const dados = loginSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const usuario = await db.usuario.findUnique({ where: { login: dados.data.login } });
  const senhaOk = usuario && (await bcrypt.compare(dados.data.senha, usuario.senhaHash));
  if (!usuario || !senhaOk) {
    await auditar({
      usuarioId: usuario?.id,
      acao: "login.falha",
      entidade: "Usuario",
      entidadeId: usuario?.id,
      resumo: `Tentativa de login sem sucesso (${dados.data.login})`,
    });
    return { erro: "Login ou senha incorretos" };
  }
  if (!usuario.ativo) return { erro: "Usuário desativado. Procure o administrador." };

  await criarSessao({ userId: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
  await auditar({ usuarioId: usuario.id, acao: "login", entidade: "Usuario", entidadeId: usuario.id, resumo: "Entrou no sistema" });
  const destino = destinoSeguro(dados.data.next);
  redirect(usuario.trocarSenha ? `/trocar-senha?next=${encodeURIComponent(destino)}` : destino);
}

export async function sair() {
  const eu = await usuarioAtual();
  if (eu) await auditar({ usuarioId: eu.id, acao: "logout", entidade: "Usuario", entidadeId: eu.id, resumo: "Saiu do sistema" });
  await encerrarSessao();
  redirect("/login");
}

const senhaSchema = z
  .object({
    atual: z.string().min(1, "Informe a senha atual"),
    nova: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, { message: "A confirmação não confere" })
  .refine((d) => d.nova !== d.atual, { message: "A nova senha deve ser diferente da atual" });

export async function trocarSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  // usuarioAtual (e não exigirUsuario) para funcionar também na troca obrigatória
  const eu = await usuarioAtual();
  if (!eu) redirect("/login");
  const dados = senhaSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const usuario = await db.usuario.findUniqueOrThrow({ where: { id: eu.id } });
  if (!(await bcrypt.compare(dados.data.atual, usuario.senhaHash))) {
    return { erro: "Senha atual incorreta" };
  }
  await db.usuario.update({
    where: { id: eu.id },
    data: { senhaHash: await bcrypt.hash(dados.data.nova, 10), trocarSenha: false },
  });
  await auditar({ usuarioId: eu.id, acao: "senha.trocar", entidade: "Usuario", entidadeId: eu.id, resumo: "Trocou a própria senha" });
  if (eu.trocarSenha) redirect(destinoSeguro(String(form.get("next") ?? "")));
  return { ok: "Senha alterada com sucesso" };
}
