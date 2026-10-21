"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { ehEquipe, exigirUsuario } from "@/lib/session";
import { PRIORIDADE, STATUS, STATUS_FINAIS, dataLocalParaDate, formatarData, numeroRequisicao } from "@/lib/constantes";
import { idsEquipe, notificar } from "@/lib/notificacoes";
import type { EstadoForm } from "./auth";

const vazioParaNull = (v: unknown) => (v === "" ? null : v);

const novaSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título (mín. 3 caracteres)").max(120),
  descricao: z.string().trim().min(5, "Descreva o problema ou serviço"),
  tipo: z.enum(["CORRETIVA", "PREVENTIVA", "PREDITIVA", "MELHORIA"]),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]),
  local: z.preprocess(vazioParaNull, z.string().trim().max(120).nullable()),
  setorId: z.preprocess(vazioParaNull, z.string().nullable()),
  equipamentoId: z.preprocess(vazioParaNull, z.string().nullable()),
});

export async function criarRequisicao(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  const dados = novaSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };

  // Sem setor informado, a requisição herda o setor do equipamento
  const equipamento = dados.data.equipamentoId
    ? await db.equipamento.findUnique({ where: { id: dados.data.equipamentoId }, select: { setorId: true } })
    : null;

  const req = await db.requisicao.create({
    data: {
      ...dados.data,
      setorId: dados.data.setorId ?? equipamento?.setorId ?? null,
      solicitanteId: eu.id,
      historico: {
        create: { statusNovo: "ABERTA", usuarioId: eu.id, observacao: "Requisição aberta" },
      },
    },
  });

  const urgente = req.prioridade === "URGENTE" || req.prioridade === "ALTA";
  after(async () =>
    notificar(await idsEquipe(eu.id), {
      titulo: `${req.prioridade === "URGENTE" ? "🚨 URGENTE · " : urgente ? "⚠️ Prioridade alta · " : ""}Nova requisição ${numeroRequisicao(req.id)}`,
      mensagem: `${req.titulo} — aberta por ${eu.nome}`,
      link: `/requisicoes/${req.id}`,
    })
  );

  revalidatePath("/requisicoes");
  redirect(`/requisicoes/${req.id}`);
}

const statusSchema = z.object({
  id: z.coerce.number().int(),
  status: z.enum(Object.keys(STATUS) as [keyof typeof STATUS, ...(keyof typeof STATUS)[]]),
  observacao: z.preprocess(vazioParaNull, z.string().trim().max(2000).nullable()),
  dataAgendada: z.preprocess(vazioParaNull, z.string().nullable()),
  responsavelId: z.preprocess(vazioParaNull, z.string().nullable()),
  solucao: z.preprocess(vazioParaNull, z.string().trim().nullable()),
});

/** Atualiza status / agendamento / responsável. Exclusivo da equipe de manutenção. */
export async function atualizarStatus(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  if (!ehEquipe(eu.perfil)) return { erro: "Sem permissão" };

  const dados = statusSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, status, observacao, responsavelId, solucao } = dados.data;
  const dataAgendada = dataLocalParaDate(dados.data.dataAgendada);

  const atual = await db.requisicao.findUnique({ where: { id } });
  if (!atual) return { erro: "Requisição não encontrada" };

  if (status === "AGENDADA" && !dataAgendada) return { erro: "Informe a data agendada" };
  if (status === "ADIADA" && !observacao) return { erro: "Informe o motivo do adiamento" };
  if (status === "CANCELADA" && !observacao) return { erro: "Informe o motivo do cancelamento" };
  if (status === "CONCLUIDA" && !(solucao ?? atual.solucao)) {
    return { erro: "Descreva o serviço realizado para concluir" };
  }

  const mudouStatus = status !== atual.status;
  const mudouData = (dataAgendada?.getTime() ?? null) !== (atual.dataAgendada?.getTime() ?? null);
  const agora = new Date();

  await db.requisicao.update({
    where: { id },
    data: {
      status,
      responsavelId,
      dataAgendada: dataAgendada ?? (status === "ADIADA" ? null : atual.dataAgendada),
      solucao: solucao ?? atual.solucao,
      // reagendou: o lembrete do novo dia ainda precisa ser enviado
      lembreteEm: mudouData ? null : undefined,
      dataInicio: status === "EM_ANDAMENTO" && !atual.dataInicio ? agora : atual.dataInicio,
      dataConclusao: status === "CONCLUIDA" ? (atual.dataConclusao ?? agora) : null,
      historico:
        mudouStatus || observacao
          ? {
              create: {
                statusAnterior: atual.status,
                statusNovo: status,
                observacao,
                usuarioId: eu.id,
              },
            }
          : undefined,
    },
  });

  const num = numeroRequisicao(id);
  const link = `/requisicoes/${id}`;
  after(async () => {
    if (mudouStatus || (status === "AGENDADA" && mudouData)) {
      const detalhe =
        status === "AGENDADA" && dataAgendada
          ? ` para ${formatarData(dataAgendada, true)}`
          : observacao
            ? ` — ${observacao}`
            : "";
      await notificar([atual.solicitanteId === eu.id ? null : atual.solicitanteId], {
        titulo: `${num}: ${STATUS[status].label}`,
        mensagem: `${atual.titulo}${detalhe}`,
        link,
      });
    }
    if (responsavelId && responsavelId !== atual.responsavelId && responsavelId !== eu.id) {
      await notificar([responsavelId], {
        titulo: `${num} atribuída a você`,
        mensagem: `${atual.titulo} · Prioridade ${PRIORIDADE[atual.prioridade].label}`,
        link,
      });
    }
  });

  revalidatePath(`/requisicoes/${id}`);
  revalidatePath("/requisicoes");
  revalidatePath("/");
  return { ok: mudouStatus ? `Status alterado para "${STATUS[status].label}"` : "Requisição atualizada" };
}

/** O solicitante pode cancelar a própria requisição enquanto ainda não foi tratada. */
export async function cancelarPropria(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  const id = Number(form.get("id"));
  const motivo = String(form.get("motivo") ?? "").trim();
  if (!motivo) return { erro: "Informe o motivo do cancelamento" };

  const req = await db.requisicao.findUnique({ where: { id } });
  if (!req || req.solicitanteId !== eu.id) return { erro: "Sem permissão" };
  if (req.status !== "ABERTA") return { erro: "Só é possível cancelar requisições ainda abertas" };

  await db.requisicao.update({
    where: { id },
    data: {
      status: "CANCELADA",
      historico: {
        create: { statusAnterior: req.status, statusNovo: "CANCELADA", observacao: motivo, usuarioId: eu.id },
      },
    },
  });
  after(async () =>
    notificar(req.responsavelId ? [req.responsavelId] : await idsEquipe(eu.id), {
      titulo: `${numeroRequisicao(id)} cancelada pelo solicitante`,
      mensagem: `${req.titulo} — ${motivo}`,
      link: `/requisicoes/${id}`,
    })
  );
  revalidatePath(`/requisicoes/${id}`);
  return { ok: "Requisição cancelada" };
}

export async function comentar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  const id = Number(form.get("id"));
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return { erro: "Escreva um comentário" };

  const req = await db.requisicao.findUnique({
    where: { id },
    select: { status: true, titulo: true, solicitanteId: true, responsavelId: true },
  });
  if (!req) return { erro: "Requisição não encontrada" };
  if (STATUS_FINAIS.includes(req.status) && !ehEquipe(eu.perfil)) {
    return { erro: "Requisição encerrada" };
  }

  await db.comentario.create({ data: { requisicaoId: id, autorId: eu.id, texto } });
  after(async () => {
    // Avisa solicitante e responsável; sem responsável, a equipe fica sabendo do comentário do solicitante.
    const destinos = [req.solicitanteId, req.responsavelId];
    if (!req.responsavelId && eu.id === req.solicitanteId) destinos.push(...(await idsEquipe()));
    await notificar(
      destinos.filter((d) => d !== eu.id),
      {
        titulo: `💬 ${eu.nome} comentou em ${numeroRequisicao(id)}`,
        mensagem: texto.length > 140 ? `${texto.slice(0, 137)}…` : texto,
        link: `/requisicoes/${id}`,
      }
    );
  });
  revalidatePath(`/requisicoes/${id}`);
  return { ok: "Comentário adicionado" };
}
