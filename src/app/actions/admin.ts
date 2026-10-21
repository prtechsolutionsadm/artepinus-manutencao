"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar, diferencas } from "@/lib/auditoria";
import { db } from "@/lib/db";
import { LOGIN_REGEX } from "@/lib/constantes";
import { PERFIS_ATRIBUIVEIS, pode } from "@/lib/permissoes";
import { exigirPermissao, exigirUsuario } from "@/lib/session";
import type { EstadoForm } from "./auth";

const vazioParaNull = (v: unknown) => (v === "" || v === undefined ? null : v);

function erroUnico(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}

const usuarioSchema = z.object({
  id: z.preprocess(vazioParaNull, z.string().nullable()),
  nome: z.string().trim().min(2, "Informe o nome"),
  login: z
    .string()
    .trim()
    .toLowerCase()
    .regex(LOGIN_REGEX, "Login deve ser no formato nome.sobrenome (sem acentos ou espaços)"),
  perfil: z.enum(["ADMIN", "GERENTE", "SUPERVISOR", "MANUTENTOR", "OPERADOR"]),
  senha: z.preprocess(vazioParaNull, z.string().min(6, "Senha com no mínimo 6 caracteres").nullable()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
  trocarSenha: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarUsuario(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirPermissao("usuarios");
  const dados = usuarioSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, senha, trocarSenha, ...resto } = dados.data;

  const existente = id
    ? await db.usuario.findUnique({ where: { id }, select: { nome: true, login: true, perfil: true, ativo: true } })
    : null;
  if (id && !existente) return { erro: "Usuário não encontrado" };

  // O perfil Administrador é exclusivo do desenvolvedor: ninguém o atribui pela tela,
  // e só um administrador edita a conta de outro administrador.
  if (existente?.perfil === "ADMIN") {
    if (eu.perfil !== "ADMIN") return { erro: "Sem permissão para alterar este usuário" };
    if (resto.perfil !== "ADMIN" || !resto.ativo) return { erro: "O acesso de administrador não pode ser removido pela tela" };
  } else if (!PERFIS_ATRIBUIVEIS.includes(resto.perfil)) {
    return { erro: "Perfil inválido" };
  }
  if (id === eu.id && !resto.ativo) return { erro: "Você não pode desativar o próprio usuário" };

  try {
    if (id && existente) {
      await db.usuario.update({
        where: { id },
        data: { ...resto, ...(senha ? { senhaHash: await bcrypt.hash(senha, 10), trocarSenha } : {}) },
      });
      const mudou = diferencas(existente, resto, ["nome", "login", "perfil", "ativo"]);
      if (senha) mudou.senha = { de: null, para: "redefinida" };
      if (Object.keys(mudou).length) {
        await auditar({ usuarioId: eu.id, acao: "usuario.editar", entidade: "Usuario", entidadeId: id, resumo: `Editou o usuário ${resto.login}`, detalhes: mudou });
      }
    } else {
      if (!senha) return { erro: "Defina uma senha inicial" };
      const novo = await db.usuario.create({ data: { ...resto, trocarSenha, senhaHash: await bcrypt.hash(senha, 10) } });
      await auditar({ usuarioId: eu.id, acao: "usuario.criar", entidade: "Usuario", entidadeId: novo.id, resumo: `Criou o usuário ${novo.login} (${novo.perfil})` });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um usuário com este login" };
    throw e;
  }
  revalidatePath("/usuarios");
  return { ok: id ? "Usuário atualizado" : "Usuário criado" };
}

export async function salvarSetor(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirPermissao("setores");
  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Informe o nome do setor" };
  try {
    if (id) {
      const antes = await db.setor.findUniqueOrThrow({ where: { id } });
      await db.setor.update({ where: { id }, data: { nome } });
      if (antes.nome !== nome) {
        await auditar({ usuarioId: eu.id, acao: "setor.editar", entidade: "Setor", entidadeId: id, resumo: `Renomeou o setor ${antes.nome} para ${nome}` });
      }
    } else {
      const novo = await db.setor.create({ data: { nome } });
      await auditar({ usuarioId: eu.id, acao: "setor.criar", entidade: "Setor", entidadeId: novo.id, resumo: `Criou o setor ${nome}` });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Setor já cadastrado" };
    throw e;
  }
  revalidatePath("/setores");
  return { ok: id ? "Setor atualizado" : "Setor criado" };
}

const equipamentoSchema = z.object({
  id: z.preprocess(vazioParaNull, z.string().nullable()),
  codigo: z.string().trim().toUpperCase().min(1, "Informe o código/TAG"),
  nome: z.string().trim().min(2, "Informe o nome"),
  descricao: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  fabricante: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable()),
  modelo: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable()),
  numeroSerie: z.preprocess(vazioParaNull, z.string().trim().max(80).nullable()),
  setorId: z.preprocess(vazioParaNull, z.string().nullable()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarEquipamento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  if (!pode(eu.perfil, "equipamentos")) return { erro: "Sem permissão" };
  const dados = equipamentoSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, ...resto } = dados.data;
  try {
    if (id) {
      const antes = await db.equipamento.findUniqueOrThrow({ where: { id } });
      await db.equipamento.update({ where: { id }, data: resto });
      const mudou = diferencas(antes, resto, ["codigo", "nome", "descricao", "fabricante", "modelo", "numeroSerie", "setorId", "ativo"]);
      if (Object.keys(mudou).length) {
        await auditar({ usuarioId: eu.id, acao: "equipamento.editar", entidade: "Equipamento", entidadeId: id, resumo: `Editou o equipamento ${resto.codigo}`, detalhes: mudou });
      }
    } else {
      const novo = await db.equipamento.create({ data: resto });
      await auditar({ usuarioId: eu.id, acao: "equipamento.criar", entidade: "Equipamento", entidadeId: novo.id, resumo: `Cadastrou o equipamento ${novo.codigo} – ${novo.nome}` });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um equipamento com este código" };
    throw e;
  }
  revalidatePath("/equipamentos");
  return { ok: id ? "Equipamento atualizado" : "Equipamento cadastrado" };
}
