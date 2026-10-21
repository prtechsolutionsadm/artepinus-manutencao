"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditar, diferencas } from "@/lib/auditoria";
import { fotosDoForm, processarFoto } from "@/lib/fotos";
import { criarRequisicaoCompleta, novaRequisicaoSchema } from "@/lib/requisicoes";
import { exigirUsuario } from "@/lib/session";
import { PERFIS_RESPONSAVEIS, pode } from "@/lib/permissoes";
import { PRIORIDADE, STATUS, STATUS_FINAIS, dataLocalParaDate, formatarData, formatarDuracao, numeroRequisicao } from "@/lib/constantes";
import { idsPorPerfil, notificar } from "@/lib/notificacoes";
import type { EstadoForm } from "./auth";

const vazioParaNull = (v: unknown) => (v === "" || v === undefined ? null : v);

export type ResultadoNova = { erro?: string; id?: number };

/** Chamada pelo formulário de nova requisição (que também cuida da fila sem internet). */
export async function criarRequisicao(form: FormData): Promise<ResultadoNova> {
  const eu = await exigirUsuario();
  const dados = novaRequisicaoSchema.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "fotos")));
  if (!dados.success) return { erro: dados.error.issues[0].message };

  try {
    const req = await criarRequisicaoCompleta(eu, dados.data, fotosDoForm(form), "online");
    revalidatePath("/requisicoes");
    revalidatePath("/");
    return { id: req.id };
  } catch (e) {
    return { erro: e instanceof Error && e.message.includes("imagem") ? e.message : "Não foi possível salvar as fotos. Tente novamente." };
  }
}

const statusSchema = z.object({
  id: z.coerce.number().int(),
  status: z.enum(Object.keys(STATUS) as [keyof typeof STATUS, ...(keyof typeof STATUS)[]]),
  observacao: z.preprocess(vazioParaNull, z.string().trim().max(2000).nullable()),
  dataAgendada: z.preprocess(vazioParaNull, z.string().nullable()),
  responsavelId: z.preprocess(vazioParaNull, z.string().nullable()),
  solucao: z.preprocess(vazioParaNull, z.string().trim().nullable()),
  maquinaParada: z.preprocess((v) => v === "on", z.boolean()),
  paradaInicio: z.preprocess(vazioParaNull, z.string().nullable()),
  paradaFim: z.preprocess(vazioParaNull, z.string().nullable()),
});

/** Atualiza status / agendamento / responsável. Gerente, supervisor e manutentor (e admin). */
export async function atualizarStatus(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  if (!pode(eu.perfil, "atenderRequisicoes")) return { erro: "Sem permissão" };

  const dados = statusSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, status, observacao, responsavelId, solucao } = dados.data;
  const dataAgendada = dataLocalParaDate(dados.data.dataAgendada);

  const atual = await db.requisicao.findUnique({
    where: { id },
    include: { checklist: { select: { feito: true } } },
  });
  if (!atual) return { erro: "Requisição não encontrada" };

  if (status === "CANCELADA" && atual.status !== "CANCELADA" && !pode(eu.perfil, "cancelarRequisicoes")) {
    return { erro: "Só gerente ou supervisor pode cancelar requisições" };
  }
  // Manutentor: pode assumir para si ou deixar como está, mas não atribuir a outra pessoa
  const soAssumeOuLarga = responsavelId === eu.id || (responsavelId === null && atual.responsavelId === eu.id);
  if (responsavelId !== atual.responsavelId && !pode(eu.perfil, "atribuirResponsavel") && !soAssumeOuLarga) {
    return { erro: "Você só pode assumir a requisição para você" };
  }
  if (responsavelId && responsavelId !== atual.responsavelId) {
    const resp = await db.usuario.findUnique({ where: { id: responsavelId }, select: { perfil: true, ativo: true } });
    if (!resp?.ativo || !PERFIS_RESPONSAVEIS.includes(resp.perfil)) return { erro: "Responsável inválido" };
  }

  if (status === "AGENDADA" && !dataAgendada) return { erro: "Informe a data agendada" };
  if (status === "ADIADA" && !observacao) return { erro: "Informe o motivo do adiamento" };
  if (status === "CANCELADA" && !observacao) return { erro: "Informe o motivo do cancelamento" };
  if (status === "CONCLUIDA" && !(solucao ?? atual.solucao)) {
    return { erro: "Descreva o serviço realizado para concluir" };
  }
  const pendentes = atual.checklist.filter((i) => !i.feito).length;
  if (status === "CONCLUIDA" && atual.status !== "CONCLUIDA" && pendentes > 0) {
    return { erro: `Conclua o checklist antes de finalizar (${pendentes} ite${pendentes > 1 ? "ns pendentes" : "m pendente"})` };
  }

  const mudouStatus = status !== atual.status;
  const mudouData = (dataAgendada?.getTime() ?? null) !== (atual.dataAgendada?.getTime() ?? null);
  const agora = new Date();

  // Máquina parada: início padrão = agora; ao concluir, considera que voltou a operar
  const maquinaParada = dados.data.maquinaParada;
  const paradaInicio = maquinaParada ? (dataLocalParaDate(dados.data.paradaInicio) ?? atual.paradaInicio ?? agora) : null;
  let paradaFim = maquinaParada ? dataLocalParaDate(dados.data.paradaFim) : null;
  if (maquinaParada && !paradaFim && status === "CONCLUIDA") paradaFim = atual.paradaFim ?? agora;
  if (paradaInicio && paradaFim && paradaFim < paradaInicio) return { erro: "O fim da parada não pode ser antes do início" };
  if (paradaInicio && paradaInicio > agora) return { erro: "O início da parada não pode ser no futuro" };

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
      maquinaParada,
      paradaInicio,
      paradaFim,
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
  const mudou = diferencas(atual, { status, responsavelId, dataAgendada: dataAgendada ?? atual.dataAgendada, solucao: solucao ?? atual.solucao, maquinaParada, paradaInicio, paradaFim }, [
    "status",
    "responsavelId",
    "dataAgendada",
    "solucao",
    "maquinaParada",
    "paradaInicio",
    "paradaFim",
  ]);
  if (Object.keys(mudou).length || observacao) {
    await auditar({
      usuarioId: eu.id,
      acao: mudouStatus ? "requisicao.status" : "requisicao.editar",
      entidade: "Requisicao",
      entidadeId: id,
      resumo: mudouStatus ? `${num}: ${STATUS[atual.status].label} → ${STATUS[status].label}` : `Atualizou a requisição ${num}`,
      detalhes: { ...mudou, ...(observacao ? { observacao: { de: null, para: observacao } } : {}) },
    });
  }
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
  await auditar({ usuarioId: eu.id, acao: "requisicao.cancelar", entidade: "Requisicao", entidadeId: id, resumo: `Cancelou a própria requisição ${numeroRequisicao(id)}`, detalhes: { motivo } });
  after(async () =>
    notificar(req.responsavelId ? [req.responsavelId] : await idsPorPerfil(["SUPERVISOR"], eu.id), {
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
  if (STATUS_FINAIS.includes(req.status) && !pode(eu.perfil, "atenderRequisicoes")) {
    return { erro: "Requisição encerrada" };
  }

  const comentario = await db.comentario.create({ data: { requisicaoId: id, autorId: eu.id, texto } });
  await auditar({ usuarioId: eu.id, acao: "requisicao.comentar", entidade: "Requisicao", entidadeId: id, resumo: `Comentou em ${numeroRequisicao(id)}`, detalhes: { comentarioId: comentario.id } });
  after(async () => {
    // Avisa solicitante e responsável; sem responsável, a equipe fica sabendo do comentário do solicitante.
    const destinos = [req.solicitanteId, req.responsavelId];
    if (!req.responsavelId && eu.id === req.solicitanteId) destinos.push(...(await idsPorPerfil(PERFIS_RESPONSAVEIS)));
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

/** Quem pode mexer em fotos de uma requisição: solicitante, responsável e equipe. */
async function podeAnexar(eu: { id: string; perfil: Parameters<typeof pode>[0] }, requisicaoId: number) {
  const req = await db.requisicao.findUnique({ where: { id: requisicaoId }, select: { solicitanteId: true, responsavelId: true } });
  if (!req) return null;
  const ok = pode(eu.perfil, "atenderRequisicoes") || req.solicitanteId === eu.id || req.responsavelId === eu.id;
  return ok ? req : null;
}

export async function enviarFotos(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  const id = Number(form.get("id"));
  const tipo = form.get("tipo") === "SERVICO" && pode(eu.perfil, "atenderRequisicoes") ? "SERVICO" : "PROBLEMA";
  if (!(await podeAnexar(eu, id))) return { erro: "Sem permissão" };
  const fotos = fotosDoForm(form);
  if (fotos.length === 0) return { erro: "Escolha ao menos uma foto" };

  try {
    const processadas = await Promise.all(fotos.map(processarFoto));
    await db.anexo.createMany({
      data: processadas.map((f) => ({ ...f, dados: new Uint8Array(f.dados), miniatura: new Uint8Array(f.miniatura), requisicaoId: id, autorId: eu.id, tipo })),
    });
  } catch (e) {
    return { erro: e instanceof Error && e.message.includes("imagem") ? e.message : "Não foi possível salvar as fotos" };
  }
  await auditar({
    usuarioId: eu.id,
    acao: "requisicao.foto",
    entidade: "Requisicao",
    entidadeId: id,
    resumo: `Anexou ${fotos.length} foto${fotos.length > 1 ? "s" : ""} ${tipo === "SERVICO" ? "do serviço" : "do problema"} em ${numeroRequisicao(id)}`,
  });
  revalidatePath(`/requisicoes/${id}`);
  return { ok: fotos.length > 1 ? `${fotos.length} fotos anexadas` : "Foto anexada" };
}

export async function removerFoto(anexoId: string) {
  const eu = await exigirUsuario();
  const anexo = await db.anexo.findUnique({ where: { id: anexoId }, select: { requisicaoId: true, autorId: true } });
  if (!anexo) return;
  if (anexo.autorId !== eu.id && !pode(eu.perfil, "cancelarRequisicoes")) throw new Error("Sem permissão");
  await db.anexo.delete({ where: { id: anexoId } });
  await auditar({ usuarioId: eu.id, acao: "requisicao.foto.remover", entidade: "Requisicao", entidadeId: anexo.requisicaoId, resumo: `Removeu uma foto de ${numeroRequisicao(anexo.requisicaoId)}` });
  revalidatePath(`/requisicoes/${anexo.requisicaoId}`);
}

const horasSchema = z.object({
  id: z.coerce.number().int(),
  inicio: z.string().min(1, "Informe quando começou"),
  horas: z.coerce.number().min(0).max(24),
  minutos: z.coerce.number().min(0).max(59),
  descricao: z.preprocess(vazioParaNull, z.string().trim().max(500).nullable()),
  usuarioId: z.preprocess(vazioParaNull, z.string().nullable()),
});

/** Registra horas trabalhadas. Supervisor/gerente podem lançar em nome de outro manutentor. */
export async function registrarHoras(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  if (!pode(eu.perfil, "apontarHoras")) return { erro: "Sem permissão" };
  const dados = horasSchema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { id, horas, minutos, descricao } = dados.data;
  const total = Math.round(horas * 60 + minutos);
  if (total <= 0) return { erro: "Informe o tempo trabalhado" };
  if (total > 24 * 60) return { erro: "Máximo de 24 horas por lançamento" };
  const inicio = dataLocalParaDate(dados.data.inicio);
  if (!inicio) return { erro: "Data inválida" };
  if (inicio > new Date()) return { erro: "A data não pode ser no futuro" };

  let usuarioId = eu.id;
  if (dados.data.usuarioId && dados.data.usuarioId !== eu.id) {
    if (!pode(eu.perfil, "atribuirResponsavel")) return { erro: "Você só pode lançar as suas horas" };
    const outro = await db.usuario.findUnique({ where: { id: dados.data.usuarioId }, select: { perfil: true, ativo: true } });
    if (!outro?.ativo || !PERFIS_RESPONSAVEIS.includes(outro.perfil)) return { erro: "Manutentor inválido" };
    usuarioId = dados.data.usuarioId;
  }
  if (!(await db.requisicao.count({ where: { id } }))) return { erro: "Requisição não encontrada" };

  const ap = await db.apontamento.create({ data: { requisicaoId: id, usuarioId, inicio, minutos: total, descricao } });
  await auditar({
    usuarioId: eu.id,
    acao: "requisicao.horas",
    entidade: "Requisicao",
    entidadeId: id,
    resumo: `Lançou ${formatarDuracao(total)} em ${numeroRequisicao(id)}`,
    detalhes: { apontamentoId: ap.id, minutos: total, para: usuarioId },
  });
  revalidatePath(`/requisicoes/${id}`);
  return { ok: `${formatarDuracao(total)} registradas` };
}

export async function removerHoras(apontamentoId: string) {
  const eu = await exigirUsuario();
  const ap = await db.apontamento.findUnique({ where: { id: apontamentoId } });
  if (!ap) return;
  if (ap.usuarioId !== eu.id && !pode(eu.perfil, "atribuirResponsavel")) throw new Error("Sem permissão");
  await db.apontamento.delete({ where: { id: apontamentoId } });
  await auditar({ usuarioId: eu.id, acao: "requisicao.horas.remover", entidade: "Requisicao", entidadeId: ap.requisicaoId, resumo: `Removeu lançamento de ${formatarDuracao(ap.minutos)} de ${numeroRequisicao(ap.requisicaoId)}` });
  revalidatePath(`/requisicoes/${ap.requisicaoId}`);
}

export async function aplicarChecklist(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const eu = await exigirUsuario();
  if (!pode(eu.perfil, "apontarHoras")) return { erro: "Sem permissão" };
  const id = Number(form.get("id"));
  const modeloId = String(form.get("modeloId") ?? "");
  const modelo = await db.checklistModelo.findUnique({ where: { id: modeloId }, include: { itens: { orderBy: { ordem: "asc" } } } });
  if (!modelo) return { erro: "Escolha um checklist" };
  const ultimo = await db.checklistItem.aggregate({ where: { requisicaoId: id }, _max: { ordem: true } });
  const base = (ultimo._max.ordem ?? 0) + 1;
  await db.checklistItem.createMany({ data: modelo.itens.map((i, n) => ({ requisicaoId: id, texto: i.texto, ordem: base + n })) });
  await auditar({ usuarioId: eu.id, acao: "requisicao.checklist", entidade: "Requisicao", entidadeId: id, resumo: `Aplicou o checklist "${modelo.nome}" em ${numeroRequisicao(id)}` });
  revalidatePath(`/requisicoes/${id}`);
  return { ok: `Checklist "${modelo.nome}" adicionado` };
}

export async function marcarItemChecklist(itemId: string, feito: boolean) {
  const eu = await exigirUsuario();
  if (!pode(eu.perfil, "apontarHoras")) throw new Error("Sem permissão");
  const item = await db.checklistItem.update({
    where: { id: itemId },
    data: { feito, feitoPorId: feito ? eu.id : null, feitoEm: feito ? new Date() : null },
  });
  await auditar({
    usuarioId: eu.id,
    acao: "requisicao.checklist.item",
    entidade: "Requisicao",
    entidadeId: item.requisicaoId,
    resumo: `${feito ? "Marcou" : "Desmarcou"} "${item.texto}" em ${numeroRequisicao(item.requisicaoId)}`,
  });
  revalidatePath(`/requisicoes/${item.requisicaoId}`);
}
