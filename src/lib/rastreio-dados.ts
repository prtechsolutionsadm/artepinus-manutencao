import "server-only";
import { db } from "@/lib/db";
import { formatarDia } from "@/lib/producao";
import { codigoCarga, codigoColheita } from "@/lib/rastreio";

const selCarga = {
  id: true,
  numero: true,
  data: true,
  origem: true,
  talhao: true,
  placa: true,
  motorista: true,
  comprimentoMedio: true,
  itens: { select: { diametro: true, quantidade: true } },
  colheita: { include: { origem: true } },
} as const;

const selBoletim = {
  id: true,
  data: true,
  responsavel: { select: { nome: true } },
  itens: { select: { tipo: true, m3: true } },
  paradas: { select: { minutos: true } },
  cargas: { select: selCarga },
} as const;

/**
 * Tudo o que se sabe da história de um pacote: estufa → dias de serraria →
 * cargas de toras → colheita → floresta. A madeira de vários dias e cargas se
 * mistura no processo, então a origem é o conjunto de lotes que entrou ali.
 */
export async function rastrearPacote(numero: number) {
  const pacote = await db.pacote.findUnique({
    where: { numero },
    include: {
      criadoPor: { select: { nome: true } },
      eventos: { orderBy: { criadoEm: "asc" }, include: { usuario: { select: { nome: true } } } },
      boletim: { select: selBoletim },
      ciclo: {
        include: {
          estufa: { select: { nome: true } },
          responsavel: { select: { nome: true } },
          checklist: { select: { conforme: true } },
          boletins: { select: selBoletim, orderBy: { data: "asc" } },
        },
      },
    },
  });
  if (!pacote) return null;

  // Dias de serraria: o do pacote (se veio verde) + os que abasteceram o ciclo de estufa
  const boletins = new Map<string, NonNullable<typeof pacote.boletim>>();
  if (pacote.boletim) boletins.set(pacote.boletim.id, pacote.boletim);
  for (const b of pacote.ciclo?.boletins ?? []) boletins.set(b.id, b);
  const dias = [...boletins.values()].sort((a, b) => a.data.getTime() - b.data.getTime());

  const cargas = new Map<string, (typeof dias)[number]["cargas"][number]>();
  for (const b of dias) for (const c of b.cargas) cargas.set(c.id, c);
  const listaCargas = [...cargas.values()].sort((a, b) => a.data.getTime() - b.data.getTime());

  const colheitas = new Map<string, NonNullable<(typeof listaCargas)[number]["colheita"]>>();
  for (const c of listaCargas) if (c.colheita) colheitas.set(c.colheita.id, c.colheita);

  return { pacote, dias, cargas: listaCargas, colheitas: [...colheitas.values()] };
}

export type Rastreio = NonNullable<Awaited<ReturnType<typeof rastrearPacote>>>;

const DIA = 864e5;

/** Colheitas em andamento ou recentes, para escolher na carga de toras. */
export async function colheitasParaForm(incluir?: string | null) {
  const limite = new Date(Date.now() - 180 * DIA);
  const lista = await db.colheita.findMany({
    where: { OR: [{ fim: null }, { fim: { gte: limite } }, ...(incluir ? [{ id: incluir }] : [])] },
    orderBy: { inicio: "desc" },
    take: 100,
    include: { origem: { select: { nome: true } } },
  });
  return lista.map((c) => ({
    id: c.id,
    origem: c.origem.nome,
    talhao: c.talhao,
    rotulo: `${codigoColheita(c.numero)} · ${c.origem.nome}${c.talhao ? ` · talhão ${c.talhao}` : ""} · desde ${formatarDia(c.inicio)}`,
  }));
}

/** Cargas de toras dos últimos 60 dias (e as já ligadas), para marcar no boletim. */
export async function cargasParaForm(ligadas: string[] = []) {
  const lista = await db.cargaToras.findMany({
    where: { OR: [{ data: { gte: new Date(Date.now() - 60 * DIA) } }, { id: { in: ligadas } }] },
    orderBy: { data: "desc" },
    take: 150,
    include: { itens: { select: { quantidade: true } } },
  });
  return lista.map((c) => ({
    id: c.id,
    rotulo: `${codigoCarga(c.numero)} · ${formatarDia(c.data, { day: "2-digit", month: "2-digit" })} · ${c.origem}${c.talhao ? ` (${c.talhao})` : ""} · ${c.itens.reduce((s, i) => s + i.quantidade, 0)} toras`,
  }));
}

/** Boletins dos últimos 30 dias (e os já ligados), para marcar no ciclo de estufa. */
export async function boletinsParaForm(ligados: string[] = []) {
  const lista = await db.boletimProducao.findMany({
    where: { OR: [{ data: { gte: new Date(Date.now() - 30 * DIA) } }, { id: { in: ligados } }] },
    orderBy: { data: "desc" },
    take: 60,
    include: { itens: { select: { m3: true } } },
  });
  return lista.map((b) => ({
    id: b.id,
    rotulo: `${formatarDia(b.data, { weekday: "short", day: "2-digit", month: "2-digit" })} · ${b.itens.reduce((s, i) => s + i.m3, 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m³`,
  }));
}

/** Ciclos de estufa concluídos nos últimos 90 dias (madeira seca para formar pacotes). */
export async function ciclosParaForm() {
  const lista = await db.cicloSecagem.findMany({
    where: { status: "CONCLUIDO", saida: { gte: new Date(Date.now() - 90 * DIA) } },
    orderBy: { saida: "desc" },
    take: 60,
    include: { estufa: { select: { nome: true } }, cargas: { select: { m3: true } } },
  });
  return lista.map((c) => ({
    id: c.id,
    rotulo: `${c.estufa.nome}${c.numero ? ` · ciclo nº ${c.numero}` : ""} · saiu ${c.saida ? formatarDia(c.saida, { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : "—"} · ${c.cargas.reduce((s, x) => s + x.m3, 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m³`,
  }));
}

/** Ciclos em secagem agora (para mandar um pacote verde para a estufa). */
export async function ciclosAtivos() {
  const lista = await db.cicloSecagem.findMany({ where: { status: "EM_SECAGEM" }, orderBy: { entrada: "desc" }, include: { estufa: { select: { nome: true } } } });
  return lista.map((c) => ({ id: c.id, rotulo: `${c.estufa.nome}${c.numero ? ` · ciclo nº ${c.numero}` : ""}` }));
}
