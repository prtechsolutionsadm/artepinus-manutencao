"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar, diferencas } from "@/lib/auditoria";
import { dataLocalParaDate, numeroRequisicao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { PERFIS_RESPONSAVEIS } from "@/lib/permissoes";
import { gerarPreventivas } from "@/lib/preventivas";
import { exigirPermissao } from "@/lib/session";
import type { EstadoForm } from "./auth";

const vazioParaNull = (v: unknown) => (v === "" || v === undefined ? null : v);

function erroUnico(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}

const checklistSchema = z.object({
  id: z.preprocess(vazioParaNull, z.string().nullable()),
  nome: z.string().trim().min(2, "Informe o nome do checklist").max(80),
  itens: z.string(),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

/** Itens vêm de uma caixa de texto, um por linha. Alterar o modelo não muda requisições já criadas. */
export async function salvarChecklist(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirPermissao("preventivas");
  const dados = checklistSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const itens = dados.data.itens
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 60);
  if (itens.length === 0) return { erro: "Adicione pelo menos um item (um por linha)" };
  const { id, nome, ativo } = dados.data;

  try {
    if (id) {
      await db.$transaction([
        db.checklistModelo.update({ where: { id }, data: { nome, ativo } }),
        db.checklistModeloItem.deleteMany({ where: { modeloId: id } }),
        db.checklistModeloItem.createMany({ data: itens.map((texto, ordem) => ({ modeloId: id, texto, ordem: ordem + 1 })) }),
      ]);
      await auditar({ usuarioId: eu.id, acao: "checklist.editar", entidade: "ChecklistModelo", entidadeId: id, resumo: `Editou o checklist "${nome}" (${itens.length} itens)` });
    } else {
      const novo = await db.checklistModelo.create({
        data: { nome, ativo, itens: { create: itens.map((texto, ordem) => ({ texto, ordem: ordem + 1 })) } },
      });
      await auditar({ usuarioId: eu.id, acao: "checklist.criar", entidade: "ChecklistModelo", entidadeId: novo.id, resumo: `Criou o checklist "${nome}" (${itens.length} itens)` });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um checklist com este nome" };
    throw e;
  }
  revalidatePath("/checklists");
  return { ok: id ? "Checklist atualizado" : "Checklist criado" };
}

const planoSchema = z.object({
  id: z.preprocess(vazioParaNull, z.string().nullable()),
  equipamentoId: z.string().min(1, "Escolha o equipamento"),
  titulo: z.string().trim().min(3, "Informe o que será feito").max(120),
  descricao: z.preprocess(vazioParaNull, z.string().trim().max(2000).nullable()),
  intervalo: z.coerce.number().int().min(1, "Intervalo mínimo é 1").max(365),
  unidade: z.enum(["DIAS", "SEMANAS", "MESES"]),
  proximaData: z.string().min(1, "Informe a data da próxima execução"),
  antecedenciaDias: z.coerce.number().int().min(0).max(30),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]),
  responsavelId: z.preprocess(vazioParaNull, z.string().nullable()),
  checklistId: z.preprocess(vazioParaNull, z.string().nullable()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarPlano(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirPermissao("preventivas");
  const dados = planoSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, proximaData: dataTexto, ...resto } = dados.data;
  const proximaData = dataLocalParaDate(dataTexto);
  if (!proximaData) return { erro: "Data inválida" };
  if (resto.responsavelId) {
    const r = await db.usuario.findUnique({ where: { id: resto.responsavelId }, select: { perfil: true, ativo: true } });
    if (!r?.ativo || !PERFIS_RESPONSAVEIS.includes(r.perfil)) return { erro: "Responsável inválido" };
  }

  if (id) {
    const antes = await db.planoPreventivo.findUniqueOrThrow({ where: { id } });
    const plano = await db.planoPreventivo.update({ where: { id }, data: { ...resto, proximaData } });
    const mudou = diferencas(antes, plano, ["titulo", "descricao", "intervalo", "unidade", "proximaData", "antecedenciaDias", "prioridade", "responsavelId", "checklistId", "ativo"]);
    if (Object.keys(mudou).length) {
      await auditar({ usuarioId: eu.id, acao: "plano.editar", entidade: "PlanoPreventivo", entidadeId: id, resumo: `Editou o plano de preventiva "${plano.titulo}"`, detalhes: mudou });
    }
  } else {
    const plano = await db.planoPreventivo.create({ data: { ...resto, proximaData, criadoPorId: eu.id } });
    await auditar({ usuarioId: eu.id, acao: "plano.criar", entidade: "PlanoPreventivo", entidadeId: plano.id, resumo: `Criou o plano de preventiva "${plano.titulo}"` });
  }
  revalidatePath("/preventivas");
  return { ok: id ? "Plano atualizado" : "Plano criado. A requisição será gerada automaticamente na data." };
}

export async function gerarAgora(planoId: string) {
  const eu = await exigirPermissao("preventivas");
  const geradas = await gerarPreventivas({ planoId, usuarioId: eu.id });
  revalidatePath("/preventivas");
  revalidatePath("/agenda");
  return geradas.map((g) => numeroRequisicao(g.id));
}
