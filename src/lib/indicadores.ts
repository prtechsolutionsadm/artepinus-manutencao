import "server-only";
import { STATUS_PENDENTES } from "@/lib/constantes";
import { db } from "@/lib/db";

const DIA = 24 * 60 * 60 * 1000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const PERIODOS = { "30": "Últimos 30 dias", "90": "Últimos 90 dias", "180": "Últimos 6 meses", "365": "Últimos 12 meses" } as const;
export type Periodo = keyof typeof PERIODOS;

/** Sobreposição (em minutos) de um intervalo com o período analisado. */
function minutosNoPeriodo(inicio: Date | null, fim: Date | null, de: Date, ate: Date) {
  if (!inicio) return 0;
  const a = Math.max(inicio.getTime(), de.getTime());
  const b = Math.min((fim ?? ate).getTime(), ate.getTime());
  return b > a ? (b - a) / 60000 : 0;
}

function mesChave(d: Date) {
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return `${br.getUTCFullYear()}-${String(br.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function calcularIndicadores(periodo: Periodo, setorId?: string) {
  const ate = new Date();
  const de = new Date(ate.getTime() - Number(periodo) * DIA);
  const filtroSetor = setorId ? { setorId } : {};

  const [requisicoes, equipamentosAtivos, apontamentos, backlog] = await Promise.all([
    db.requisicao.findMany({
      where: {
        ...filtroSetor,
        OR: [{ criadoEm: { gte: de } }, { dataConclusao: { gte: de } }, { paradaFim: { gte: de } }, { maquinaParada: true, paradaFim: null }],
      },
      select: {
        id: true,
        tipo: true,
        status: true,
        criadoEm: true,
        dataConclusao: true,
        dataAgendada: true,
        maquinaParada: true,
        paradaInicio: true,
        paradaFim: true,
        equipamento: { select: { id: true, codigo: true, nome: true } },
        setor: { select: { nome: true } },
      },
    }),
    db.equipamento.count({ where: { ativo: true, ...(setorId ? { setorId } : {}) } }),
    db.apontamento.findMany({
      where: { inicio: { gte: de }, ...(setorId ? { requisicao: { setorId } } : {}) },
      select: { minutos: true, usuario: { select: { nome: true } } },
    }),
    db.requisicao.count({ where: { ...filtroSetor, status: { in: STATUS_PENDENTES } } }),
  ]);

  const abertas = requisicoes.filter((r) => r.criadoEm >= de);
  const corretivas = abertas.filter((r) => r.tipo === "CORRETIVA");
  const concluidas = requisicoes.filter((r) => r.status === "CONCLUIDA" && r.dataConclusao && r.dataConclusao >= de);

  // Tempo médio de atendimento: abertura → conclusão
  const atendimento = concluidas.map((r) => (r.dataConclusao!.getTime() - r.criadoEm.getTime()) / 60000);
  const tempoMedioAtendimento = atendimento.length ? atendimento.reduce((a, b) => a + b, 0) / atendimento.length : null;

  // MTTR: duração média das paradas encerradas no período
  const paradasEncerradas = requisicoes.filter((r) => r.maquinaParada && r.paradaInicio && r.paradaFim && r.paradaFim >= de);
  const mttr = paradasEncerradas.length
    ? paradasEncerradas.reduce((t, r) => t + (r.paradaFim!.getTime() - r.paradaInicio!.getTime()) / 60000, 0) / paradasEncerradas.length
    : null;

  // Tempo parado dentro do período (inclui paradas ainda em aberto)
  const paradoPorReq = requisicoes.map((r) => ({ r, min: r.maquinaParada ? minutosNoPeriodo(r.paradaInicio, r.paradaFim, de, ate) : 0 }));
  const minutosParados = paradoPorReq.reduce((t, x) => t + x.min, 0);
  const minutosPeriodo = (ate.getTime() - de.getTime()) / 60000;
  const disponibilidade = equipamentosAtivos ? Math.max(0, 1 - minutosParados / (minutosPeriodo * equipamentosAtivos)) : null;

  // MTBF: horas de operação ÷ nº de falhas (corretivas com equipamento)
  const falhas = corretivas.filter((r) => r.equipamento).length;
  const mtbfHoras = falhas ? (minutosPeriodo * equipamentosAtivos - minutosParados) / 60 / falhas : null;

  // Preventivas no prazo: concluídas até o fim do dia agendado
  const preventivasDevidas = requisicoes.filter((r) => r.tipo === "PREVENTIVA" && r.dataAgendada && r.dataAgendada >= de && r.dataAgendada <= ate && r.status !== "CANCELADA");
  const noPrazo = preventivasDevidas.filter((r) => r.dataConclusao && r.dataConclusao.getTime() <= r.dataAgendada!.getTime() + DIA).length;

  // Série mensal: abertas por tipo
  const meses: string[] = [];
  const cursor = new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), 1));
  while (cursor <= ate) {
    meses.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const porMes = meses.map((m) => {
    const doMes = abertas.filter((r) => mesChave(r.criadoEm) === m);
    const [ano, mes] = m.split("-");
    return {
      rotulo: `${MESES[Number(mes) - 1]}/${ano.slice(2)}`,
      corretiva: doMes.filter((r) => r.tipo === "CORRETIVA").length,
      preventiva: doMes.filter((r) => r.tipo === "PREVENTIVA").length,
      outras: doMes.filter((r) => r.tipo !== "CORRETIVA" && r.tipo !== "PREVENTIVA").length,
    };
  });

  // Rankings por equipamento
  const porEquip = new Map<string, { rotulo: string; href: string; falhas: number; parado: number }>();
  for (const { r, min } of paradoPorReq) {
    if (!r.equipamento) continue;
    const e = porEquip.get(r.equipamento.id) ?? { rotulo: `${r.equipamento.codigo} – ${r.equipamento.nome}`, href: `/equipamentos/${r.equipamento.id}`, falhas: 0, parado: 0 };
    if (r.tipo === "CORRETIVA" && r.criadoEm >= de) e.falhas++;
    e.parado += min;
    porEquip.set(r.equipamento.id, e);
  }
  const equipamentos = [...porEquip.values()];
  const topFalhas = equipamentos.filter((e) => e.falhas > 0).sort((a, b) => b.falhas - a.falhas).slice(0, 8);
  const topParado = equipamentos.filter((e) => e.parado > 0).sort((a, b) => b.parado - a.parado).slice(0, 8);

  const horasPorPessoa = new Map<string, number>();
  for (const a of apontamentos) horasPorPessoa.set(a.usuario.nome, (horasPorPessoa.get(a.usuario.nome) ?? 0) + a.minutos);
  const porManutentor = [...horasPorPessoa].map(([rotulo, min]) => ({ rotulo, valor: min })).sort((a, b) => b.valor - a.valor);

  const setores = new Map<string, number>();
  for (const r of abertas) setores.set(r.setor?.nome ?? "Sem setor", (setores.get(r.setor?.nome ?? "Sem setor") ?? 0) + 1);
  const porSetor = [...setores].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);

  return {
    de,
    ate,
    resumo: {
      abertas: abertas.length,
      corretivas: corretivas.length,
      preventivas: abertas.filter((r) => r.tipo === "PREVENTIVA").length,
      concluidas: concluidas.length,
      backlog,
      tempoMedioAtendimento,
      mttr,
      mtbfHoras,
      minutosParados,
      disponibilidade,
      minutosTrabalhados: apontamentos.reduce((t, a) => t + a.minutos, 0),
      preventivasNoPrazo: preventivasDevidas.length ? noPrazo / preventivasDevidas.length : null,
      preventivasDevidas: preventivasDevidas.length,
      equipamentosAtivos,
    },
    porMes,
    topFalhas: topFalhas.map((e) => ({ rotulo: e.rotulo, href: e.href, valor: e.falhas })),
    topParado: topParado.map((e) => ({ rotulo: e.rotulo, href: e.href, valor: Math.round(e.parado) })),
    porManutentor,
    porSetor,
  };
}
