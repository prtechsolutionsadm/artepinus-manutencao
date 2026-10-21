"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { LOGIN_REGEX } from "@/lib/constantes";
import { ehEquipe, exigirUsuario } from "@/lib/session";
import type { EstadoForm } from "./auth";

const vazioParaNull = (v: unknown) => (v === "" ? null : v);

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
  perfil: z.enum(["ADMIN", "MANUTENCAO", "SOLICITANTE"]),
  setorId: z.preprocess(vazioParaNull, z.string().nullable()),
  senha: z.preprocess(vazioParaNull, z.string().min(6, "Senha com no mínimo 6 caracteres").nullable()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
  trocarSenha: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarUsuario(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario(["ADMIN"]);
  const dados = usuarioSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, senha, trocarSenha, ...resto } = dados.data;

  if (id === eu.id && (!resto.ativo || resto.perfil !== "ADMIN")) {
    return { erro: "Você não pode remover seu próprio acesso de administrador" };
  }

  try {
    if (id) {
      await db.usuario.update({
        where: { id },
        data: { ...resto, ...(senha ? { senhaHash: await bcrypt.hash(senha, 10), trocarSenha } : {}) },
      });
    } else {
      if (!senha) return { erro: "Defina uma senha inicial" };
      await db.usuario.create({ data: { ...resto, trocarSenha, senhaHash: await bcrypt.hash(senha, 10) } });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um usuário com este login" };
    throw e;
  }
  revalidatePath("/usuarios");
  return { ok: id ? "Usuário atualizado" : "Usuário criado" };
}

export async function salvarSetor(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirUsuario(["ADMIN"]);
  const id = String(form.get("id") ?? "");
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Informe o nome do setor" };
  try {
    if (id) await db.setor.update({ where: { id }, data: { nome } });
    else await db.setor.create({ data: { nome } });
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
  setorId: z.preprocess(vazioParaNull, z.string().nullable()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarEquipamento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  if (!ehEquipe(eu.perfil)) return { erro: "Sem permissão" };
  const dados = equipamentoSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, ...resto } = dados.data;
  try {
    if (id) await db.equipamento.update({ where: { id }, data: resto });
    else await db.equipamento.create({ data: resto });
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um equipamento com este código" };
    throw e;
  }
  revalidatePath("/equipamentos");
  return { ok: id ? "Equipamento atualizado" : "Equipamento cadastrado" };
}
