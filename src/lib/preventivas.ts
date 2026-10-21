import "server-only";
import { auditar } from "@/lib/auditoria";
import { formatarData, numeroRequisicao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { idsPorPerfil, notificar } from "@/lib/notificacoes";
import type { UnidadeFrequencia } from "@/generated/prisma/enums";

export const UNIDADES: Record<UnidadeFrequencia, { singular: string; plural: string }> = {
  DIAS: { singular: "dia", plural: "dias" },
  SEMANAS: { singular: "semana", plural: "semanas" },
  MESES: { singular: "mês", plural: "meses" },
};

export function descreverFrequencia(intervalo: number, unidade: UnidadeFrequencia) {
  if (intervalo === 1) return { DIAS: "Todo dia", SEMANAS: "Toda semana", MESES: "Todo mês" }[unidade];
  return `A cada ${intervalo} ${UNIDADES[unidade].plural}`;
}

/** Soma o intervalo do plano a uma data (meses respeitam o calendário, horário de Brasília fixo). */
export function somarIntervalo(data: Date, intervalo: number, unidade: UnidadeFrequencia) {
  const d = new Date(data);
  if (unidade === "DIAS") d.setUTCDate(d.getUTCDate() + intervalo);
  else if (unidade === "SEMANAS") d.setUTCDate(d.getUTCDate() + intervalo * 7);
  else {
    const dia = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + intervalo);
    const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(dia, ultimo)); // 31/01 + 1 mês = 28/02
  }
  return d;
}

/**
 * Gera as requisições das preventivas que estão dentro da antecedência.
 * Chamada pelo cron diário e pelo botão "Gerar agora". `planoId` limita a um plano.
 */
export async function gerarPreventivas({ planoId, usuarioId }: { planoId?: string; usuarioId?: string } = {}) {
  const agora = new Date();
  const planos = await db.planoPreventivo.findMany({
    where: { ativo: true, ...(planoId ? { id: planoId } : {}), equipamento: { ativo: true } },
    include: {
      equipamento: { select: { id: true, codigo: true, nome: true, setorId: true } },
      checklist: { include: { itens: { orderBy: { ordem: "asc" } } } },
    },
  });

  const geradas: { id: number; plano: string }[] = [];
  for (const plano of planos) {
    const limite = new Date(agora.getTime() + plano.antecedenciaDias * 24 * 60 * 60 * 1000);
    if (!planoId && plano.proximaData > limite) continue;

    // Se ficou muito tempo sem gerar, não cria várias atrasadas: agenda a ocorrência atual e segue
    let data = plano.proximaData;
    while (somarIntervalo(data, plano.intervalo, plano.unidade) <= agora) data = somarIntervalo(data, plano.intervalo, plano.unidade);
    const proxima = somarIntervalo(data, plano.intervalo, plano.unidade);

    const req = await db.$transaction(async (tx) => {
      // Trava otimista: só gera se a próxima data ainda é a que lemos (evita duplicar em execuções simultâneas)
      const { count } = await tx.planoPreventivo.updateMany({
        where: { id: plano.id, proximaData: plano.proximaData },
        data: { proximaData: proxima },
      });
      if (count === 0) return null;
      return tx.requisicao.create({
        data: {
          titulo: `Preventiva: ${plano.titulo}`,
          descricao: plano.descricao || `Manutenção preventiva do equipamento ${plano.equipamento.codigo} – ${plano.equipamento.nome}.`,
          tipo: "PREVENTIVA",
          status: "AGENDADA",
          prioridade: plano.prioridade,
          dataAgendada: data,
          equipamentoId: plano.equipamento.id,
          setorId: plano.equipamento.setorId,
          solicitanteId: plano.criadoPorId,
          responsavelId: plano.responsavelId,
          planoId: plano.id,
          historico: {
            create: [
              {
                statusNovo: "AGENDADA",
                usuarioId: usuarioId ?? plano.criadoPorId,
                observacao: `Gerada automaticamente pelo plano de preventiva "${plano.titulo}"`,
              },
            ],
          },
          checklist: plano.checklist
            ? { create: plano.checklist.itens.map((i) => ({ texto: i.texto, ordem: i.ordem })) }
            : undefined,
        },
      });
    });
    if (!req) continue;
    geradas.push({ id: req.id, plano: plano.titulo });

    await auditar({
      usuarioId: usuarioId ?? null,
      acao: "preventiva.gerar",
      entidade: "Requisicao",
      entidadeId: req.id,
      resumo: `Preventiva ${numeroRequisicao(req.id)} gerada pelo plano "${plano.titulo}" para ${formatarData(data, true)}`,
      detalhes: { planoId: plano.id, proximaData: { de: plano.proximaData.toISOString(), para: proxima.toISOString() } },
    });
    await notificar(plano.responsavelId ? [plano.responsavelId] : await idsPorPerfil(["SUPERVISOR"]), {
      titulo: `🗓️ Preventiva agendada: ${numeroRequisicao(req.id)}`,
      mensagem: `${plano.titulo} · ${plano.equipamento.codigo} · ${formatarData(data, true)}`,
      link: `/requisicoes/${req.id}`,
    });
  }
  return geradas;
}
