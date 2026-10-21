import "server-only";
import { db } from "@/lib/db";
import { PRIORIDADE, STATUS, STATUS_FINAIS, STATUS_PENDENTES, TIPO } from "@/lib/constantes";
import type { Prisma } from "@/generated/prisma/client";
import type { Prioridade, StatusRequisicao, TipoManutencao } from "@/generated/prisma/enums";

export type FiltrosRelatorio = {
  de?: string;
  ate?: string;
  status?: string;
  prioridade?: string;
  tipo?: string;
  setor?: string;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Primeiro dia do mês corrente (horário de Brasília), no formato YYYY-MM-DD. */
function inicioDoMes() {
  const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `${hoje.slice(0, 8)}01`;
}

export function normalizarFiltros(f: FiltrosRelatorio): Required<FiltrosRelatorio> {
  const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    de: f.de && DATA.test(f.de) ? f.de : inicioDoMes(),
    ate: f.ate && DATA.test(f.ate) ? f.ate : hoje,
    status: f.status ?? "",
    prioridade: f.prioridade ?? "",
    tipo: f.tipo ?? "",
    setor: f.setor ?? "",
  };
}

export async function gerarRelatorio(filtrosBrutos: FiltrosRelatorio) {
  const f = normalizarFiltros(filtrosBrutos);
  const inicio = new Date(`${f.de}T00:00:00-03:00`);
  const fim = new Date(new Date(`${f.ate}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000);

  const where: Prisma.RequisicaoWhereInput = { criadoEm: { gte: inicio, lt: fim } };
  if (f.status === "pendentes") where.status = { in: STATUS_PENDENTES };
  else if (f.status in STATUS) where.status = f.status as StatusRequisicao;
  if (f.prioridade in PRIORIDADE) where.prioridade = f.prioridade as Prioridade;
  if (f.tipo in TIPO) where.tipo = f.tipo as TipoManutencao;
  if (f.setor) where.setorId = f.setor;

  const [itens, setor] = await Promise.all([
    db.requisicao.findMany({
      where,
      orderBy: { id: "asc" },
      include: {
        solicitante: { select: { nome: true } },
        responsavel: { select: { nome: true } },
        setor: { select: { nome: true } },
        equipamento: { select: { codigo: true, nome: true } },
      },
    }),
    f.setor ? db.setor.findUnique({ where: { id: f.setor } }) : null,
  ]);

  const contar = <K extends string>(chave: (r: (typeof itens)[number]) => K) => {
    const m = new Map<K, number>();
    for (const r of itens) m.set(chave(r), (m.get(chave(r)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };

  const concluidas = itens.filter((r) => r.status === "CONCLUIDA" && r.dataConclusao);
  const diasMedios = concluidas.length
    ? concluidas.reduce((t, r) => t + (r.dataConclusao!.getTime() - r.criadoEm.getTime()), 0) /
      concluidas.length /
      (24 * 60 * 60 * 1000)
    : null;

  const descricaoFiltros = [
    f.status === "pendentes" ? "Status: pendentes" : f.status in STATUS ? `Status: ${STATUS[f.status as StatusRequisicao].label}` : null,
    f.prioridade in PRIORIDADE ? `Prioridade: ${PRIORIDADE[f.prioridade as Prioridade].label}` : null,
    f.tipo in TIPO ? `Tipo: ${TIPO[f.tipo as TipoManutencao]}` : null,
    setor ? `Setor: ${setor.nome}` : null,
  ].filter(Boolean) as string[];

  return {
    filtros: f,
    descricaoFiltros,
    itens,
    resumo: {
      total: itens.length,
      concluidas: itens.filter((r) => r.status === "CONCLUIDA").length,
      pendentes: itens.filter((r) => !STATUS_FINAIS.includes(r.status)).length,
      canceladas: itens.filter((r) => r.status === "CANCELADA").length,
      urgentes: itens.filter((r) => r.prioridade === "URGENTE").length,
      diasMedios,
    },
    porStatus: contar((r) => r.status),
    porTipo: contar((r) => r.tipo),
    porSetor: contar((r) => r.setor?.nome ?? "Sem setor"),
  };
}

export type Relatorio = Awaited<ReturnType<typeof gerarRelatorio>>;

export function formatarDataCurta(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
