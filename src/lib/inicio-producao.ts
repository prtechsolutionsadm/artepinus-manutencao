import "server-only";
import { db } from "@/lib/db";
import { calcularKpis, dateParaDia, diaParaDate, formatarDia, hojeSP, intervaloMes, mesDe } from "@/lib/producao";
import { codigoCarga } from "@/lib/rastreio";

const DIA = 864e5;

export type Pendencia = { tipo: "atraso" | "aviso" | "rastreio"; texto: string; detalhe?: string; href: string; acao: string };

/** Dias úteis (seg–sex) entre `de` e ontem, no formato "AAAA-MM-DD". */
function diasUteisAte(hoje: string, quantos: number) {
  const lista: string[] = [];
  const d = diaParaDate(hoje);
  for (let i = 1; lista.length < quantos && i <= quantos * 2; i++) {
    const x = new Date(d.getTime() - i * DIA);
    const dow = x.getUTCDay();
    if (dow !== 0 && dow !== 6) lista.push(dateParaDia(x));
  }
  return lista;
}

/** O que a tela Início mostra: pendências do dia a dia, situação de hoje e últimos lançamentos. */
export async function dadosInicio() {
  const hoje = hojeSP();
  const agora = new Date();
  const uteis = diasUteisAte(hoje, 5);
  const desde30 = new Date(agora.getTime() - 30 * DIA);

  const [boletinsRecentes, emSecagem, ciclosSemPacote, cargasSemColheita, boletinsSemCarga, estoque, boletinsMes, metaMes, recentes] = await Promise.all([
    db.boletimProducao.findMany({ where: { data: { gte: diaParaDate(uteis[uteis.length - 1] ?? hoje) } }, select: { id: true, data: true } }),
    db.cicloSecagem.findMany({ where: { status: "EM_SECAGEM" }, include: { estufa: { select: { nome: true } } }, orderBy: { entrada: "asc" } }),
    db.cicloSecagem.findMany({
      where: { status: "CONCLUIDO", saida: { gte: desde30 }, pacotes: { none: {} } },
      include: { estufa: { select: { nome: true } } },
      orderBy: { saida: "desc" },
      take: 5,
    }),
    db.cargaToras.findMany({ where: { colheitaId: null, data: { gte: desde30 } }, select: { id: true, numero: true, data: true, origem: true }, orderBy: { data: "desc" }, take: 5 }),
    db.boletimProducao.findMany({ where: { data: { gte: desde30 }, cargas: { none: {} } }, select: { id: true, data: true }, orderBy: { data: "desc" }, take: 5 }),
    db.pacote.groupBy({ by: ["status"], where: { status: { in: ["VERDE", "EM_ESTUFA", "SECO"] } }, _count: true, _sum: { m3: true } }),
    db.boletimProducao.findMany({
      where: { data: intervaloMes(mesDe(hoje)) },
      select: { metaM3: true, horasProgramadas: true, itens: { select: { tipo: true, m3: true } }, paradas: { select: { centro: true, minutos: true } } },
    }),
    db.metaProducao.findUnique({ where: { mes: mesDe(hoje) } }),
    db.auditoria.findMany({
      where: { OR: ["boletim.", "ciclo.", "toras.", "pacote.", "colheita.", "estoque."].map((p) => ({ acao: { startsWith: p } })) },
      orderBy: { criadoEm: "desc" },
      take: 15,
      include: { usuario: { select: { nome: true } } },
    }),
  ]);

  const lancados = new Set(boletinsRecentes.map((b) => dateParaDia(b.data)));
  const boletimHoje = boletinsRecentes.find((b) => dateParaDia(b.data) === hoje) ?? null;

  const pendencias: Pendencia[] = [];
  for (const dia of uteis.filter((d) => !lancados.has(d)).reverse()) {
    pendencias.push({
      tipo: "atraso",
      texto: `Boletim da serraria de ${formatarDia(diaParaDate(dia), { weekday: "long", day: "2-digit", month: "2-digit" })} não lançado`,
      href: `/producao/boletins/novo?data=${dia}`,
      acao: "Lançar",
    });
  }
  for (const c of emSecagem.filter((c) => c.previsaoSaida && c.previsaoSaida < agora)) {
    pendencias.push({
      tipo: "atraso",
      texto: `${c.estufa.nome} passou da previsão de saída`,
      detalhe: `Previsto para ${c.previsaoSaida!.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      href: `/producao/estufas/ciclos/${c.id}`,
      acao: "Ver ciclo",
    });
  }
  for (const c of ciclosSemPacote) {
    pendencias.push({
      tipo: "aviso",
      texto: `${c.estufa.nome}${c.numero ? ` (ciclo nº ${c.numero})` : ""} concluída sem pacotes formados`,
      href: `/producao/pacotes/novo?ciclo=${c.id}`,
      acao: "Formar pacotes",
    });
  }
  for (const c of cargasSemColheita) {
    pendencias.push({
      tipo: "rastreio",
      texto: `Carga ${codigoCarga(c.numero)} (${c.origem}) sem colheita ligada`,
      detalhe: "Sem isso, os pacotes não chegam até a floresta",
      href: `/producao/toras/${c.id}`,
      acao: "Ligar",
    });
  }
  for (const b of boletinsSemCarga) {
    pendencias.push({
      tipo: "rastreio",
      texto: `Boletim de ${formatarDia(b.data, { day: "2-digit", month: "2-digit" })} sem as cargas de toras serradas`,
      href: `/producao/boletins/${b.id}/editar`,
      acao: "Marcar cargas",
    });
  }

  const k = calcularKpis(boletinsMes);
  const porStatus = Object.fromEntries(estoque.map((e) => [e.status, { qtd: e._count, m3: e._sum.m3 ?? 0 }]));

  return {
    hoje,
    boletimHoje,
    pendencias,
    emSecagem: emSecagem.length,
    estoque: porStatus as Partial<Record<"VERDE" | "EM_ESTUFA" | "SECO", { qtd: number; m3: number }>>,
    mes: { producaoM3: k.producaoM3, metaM3: k.metaM3, dias: boletinsMes.length, oee: k.oee, metaDiaria: metaMes?.metaDiariaM3 ?? null },
    recentes,
  };
}
