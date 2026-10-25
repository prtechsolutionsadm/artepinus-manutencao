import "server-only";
import { db } from "@/lib/db";
import { arred, calcularKpis, dateParaDia, intervaloMes, m3Toras, mesesAntes, type Kpis } from "@/lib/producao";

const incluirBoletim = {
  itens: { select: { tipo: true, m3: true } },
  paradas: { select: { centro: true, minutos: true, ocorrencias: true, motivoId: true, descricao: true, equipamentoId: true } },
} as const;

export type MesComparativo = { mes: string; dias: number; kpis: Kpis };

/** Dados do painel de produção: o mês escolhido e a comparação com os meses anteriores. */
export async function painelProducao(mes: string, mesesComparar = 6) {
  const inicioComparacao = mesesAntes(mes, mesesComparar - 1);
  const [boletins, motivos, equipamentos, ciclosAtivos, ciclosMes, cargasToras, ultimos] = await Promise.all([
    db.boletimProducao.findMany({
      where: { data: { gte: intervaloMes(inicioComparacao).gte, lt: intervaloMes(mes).lt } },
      orderBy: { data: "asc" },
      include: incluirBoletim,
    }),
    db.motivoParada.findMany({ select: { id: true, codigo: true, descricao: true } }),
    db.equipamento.findMany({ select: { id: true, nome: true } }),
    db.cicloSecagem.findMany({ where: { status: "EM_SECAGEM" }, include: { cargas: { select: { m3: true } } } }),
    db.cicloSecagem.findMany({
      where: { status: "CONCLUIDO", saida: intervaloMes(mes) },
      select: { entrada: true, saida: true, cargas: { select: { m3: true } } },
    }),
    db.cargaToras.findMany({ where: { data: intervaloMes(mes) }, include: { itens: true } }),
    Promise.all(
      (["VERDE", "EMPACOTADA"] as const).map((tipo) =>
        db.levantamentoEstoque.findFirst({ where: { tipo }, orderBy: { data: "desc" }, include: { itens: { select: { m3: true } } } }),
      ),
    ),
  ]);

  const doMes = boletins.filter((b) => dateParaDia(b.data).startsWith(mes));
  const kpis = calcularKpis(doMes);

  // Comparativo mês a mês (índices calculados sobre os totais de cada mês)
  const comparativo: MesComparativo[] = [];
  for (let i = mesesComparar - 1; i >= 0; i--) {
    const m = mesesAntes(mes, i);
    const lista = boletins.filter((b) => dateParaDia(b.data).startsWith(m));
    comparativo.push({ mes: m, dias: lista.length, kpis: calcularKpis(lista) });
  }

  // Produção diária do mês, por tipo
  const diario = doMes.map((b) => {
    const k = calcularKpis([b]);
    return {
      dia: dateParaDia(b.data),
      id: b.id,
      bom: arred(k.bomM3, 2),
      aproveitamento: arred(k.aproveitamentoM3, 2),
      refugo: arred(k.refugoM3, 2),
      metaM3: b.metaM3,
      kpis: k,
    };
  });

  // Pareto de paradas do mês (por motivo; sem motivo, pela descrição)
  const nomeMotivo = new Map(motivos.map((m) => [m.id, `${m.codigo} · ${m.descricao}`]));
  const nomeEquip = new Map(equipamentos.map((e) => [e.id, e.nome]));
  const porMotivo = new Map<string, { minutos: number; ocorrencias: number; centro: string }>();
  const porEquipamento = new Map<string, number>();
  for (const b of doMes) {
    for (const p of b.paradas) {
      const chave = (p.motivoId && nomeMotivo.get(p.motivoId)) || p.descricao?.trim() || "Sem motivo";
      const atual = porMotivo.get(chave) ?? { minutos: 0, ocorrencias: 0, centro: p.centro };
      atual.minutos += p.minutos;
      atual.ocorrencias += p.ocorrencias;
      porMotivo.set(chave, atual);
      if (p.equipamentoId) {
        const nome = nomeEquip.get(p.equipamentoId) ?? "—";
        porEquipamento.set(nome, (porEquipamento.get(nome) ?? 0) + p.minutos);
      }
    }
  }
  const pareto = [...porMotivo].map(([rotulo, v]) => ({ rotulo, ...v })).sort((a, b) => b.minutos - a.minutos);
  const paradasPorEquipamento = [...porEquipamento].map(([rotulo, valor]) => ({ rotulo, valor: Math.round(valor) })).sort((a, b) => b.valor - a.valor);

  // Estufas
  const m3Ativo = ciclosAtivos.reduce((s, c) => s + c.cargas.reduce((x, k) => x + k.m3, 0), 0);
  const m3Seco = ciclosMes.reduce((s, c) => s + c.cargas.reduce((x, k) => x + k.m3, 0), 0);
  const horasCiclo = ciclosMes.filter((c) => c.saida).map((c) => (c.saida!.getTime() - c.entrada.getTime()) / 3.6e6);
  const estufas = {
    emSecagem: ciclosAtivos.length,
    m3EmSecagem: m3Ativo,
    ciclosConcluidos: ciclosMes.length,
    m3Seco,
    horasMediaCiclo: horasCiclo.length ? horasCiclo.reduce((a, b) => a + b, 0) / horasCiclo.length : null,
  };

  // Toras recebidas no mês (volume estimado pelo diâmetro e comprimento médio da carga)
  const toras = cargasToras.reduce(
    (acc, c) => {
      const qtd = c.itens.reduce((s, i) => s + i.quantidade, 0);
      acc.cargas++;
      acc.quantidade += qtd;
      if (c.comprimentoMedio) acc.m3 += c.itens.reduce((s, i) => s + m3Toras(i.diametro, c.comprimentoMedio!, i.quantidade), 0);
      acc.somaDiametro += c.itens.reduce((s, i) => s + i.diametro * i.quantidade, 0);
      return acc;
    },
    { cargas: 0, quantidade: 0, m3: 0, somaDiametro: 0 },
  );

  const estoque = ultimos.map((l) => (l ? { tipo: l.tipo, data: l.data, m3: l.itens.reduce((s, i) => s + i.m3, 0) } : null));

  return {
    kpis,
    diasLancados: doMes.length,
    comparativo,
    diario,
    pareto,
    paradasPorEquipamento,
    estufas,
    toras: { ...toras, diametroMedio: toras.quantidade ? toras.somaDiametro / toras.quantidade : null },
    estoque,
  };
}
