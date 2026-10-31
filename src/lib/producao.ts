import type { CentroParada, Mercado, StatusCiclo, TipoEstoque, TipoProduto } from "@/generated/prisma/enums";

// Funções puras do módulo de produção (usadas no servidor e nos formulários).

export const CENTRO: Record<CentroParada, { label: string; curto: string; hex: string }> = {
  MEC: { label: "Mecânica", curto: "MEC", hex: "#2a78d6" },
  ELE: { label: "Elétrica", curto: "ELE", hex: "#eb6834" },
  OPE: { label: "Operacional", curto: "OPE", hex: "#1baf7a" },
};

export const TIPO_PRODUTO: Record<TipoProduto, string> = {
  BOM: "Bom",
  APROVEITAMENTO: "Aproveitamento",
  REFUGO: "Refugo",
};

export const MERCADO: Record<Mercado, string> = { EXTERNO: "Mercado externo", INTERNO: "Mercado interno" };

export const STATUS_CICLO: Record<StatusCiclo, { label: string; cor: string }> = {
  EM_SECAGEM: { label: "Em secagem", cor: "bg-amber-50 text-amber-800 ring-amber-200" },
  CONCLUIDO: { label: "Concluído", cor: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  CANCELADO: { label: "Cancelado", cor: "bg-stone-100 text-stone-600 ring-stone-200" },
};

export const TIPO_ESTOQUE: Record<TipoEstoque, string> = { VERDE: "Madeira verde (pátio)", EMPACOTADA: "Madeira seca empacotada" };

/** Volume de peças serradas: espessura × largura × comprimento (mm) × peças → m³. */
export function m3Pecas(espessura: number, largura: number, comprimento: number, pecas: number) {
  return arred((espessura * largura * comprimento * pecas) / 1e9, 4);
}

/** Volume de grades/pacotes com comprimento em metros: espessura e largura em mm. */
export function m3Grade(espessura: number, largura: number, comprimentoM: number, pecas: number) {
  return arred((espessura * largura * comprimentoM * 1000 * pecas) / 1e9, 4);
}

/** Volume estimado de toras (cilindro): diâmetro em cm, comprimento em m. */
export function m3Toras(diametroCm: number, comprimentoM: number, quantidade: number) {
  const r = diametroCm / 200;
  return arred(Math.PI * r * r * comprimentoM * quantidade, 4);
}

export function arred(n: number, casas = 2) {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
}

export function fmtM3(n: number | null | undefined, casas = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })} m³`;
}

export function fmtPct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function fmtNum(n: number | null | undefined, casas = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

type BoletimBase = {
  metaM3: number;
  horasProgramadas: number;
  torasM3?: number | null;
  itens: { tipo: TipoProduto; m3: number }[];
  paradas: { centro: CentroParada; minutos: number }[];
};

export type Kpis = {
  producaoM3: number;
  bomM3: number;
  aproveitamentoM3: number;
  refugoM3: number;
  metaM3: number;
  minutosProgramados: number;
  minutosParados: number;
  paradoPorCentro: Record<CentroParada, number>;
  /** (tempo programado − paradas) ÷ tempo programado */
  disponibilidade: number | null;
  /** produção ÷ meta */
  produtividade: number | null;
  /** 1 − refugo ÷ produção */
  qualidade: number | null;
  /** disponibilidade × produtividade × qualidade */
  oee: number | null;
  /** produção ÷ m³ de toras consumidas */
  rendimento: number | null;
  torasM3: number;
};

/**
 * KPIs pelas mesmas fórmulas da planilha de controle da serraria. Somando vários
 * boletins, os índices são calculados sobre os totais (não é média dos dias).
 */
export function calcularKpis(boletins: BoletimBase[]): Kpis {
  const k: Kpis = {
    producaoM3: 0,
    bomM3: 0,
    aproveitamentoM3: 0,
    refugoM3: 0,
    metaM3: 0,
    minutosProgramados: 0,
    minutosParados: 0,
    paradoPorCentro: { MEC: 0, ELE: 0, OPE: 0 },
    disponibilidade: null,
    produtividade: null,
    qualidade: null,
    oee: null,
    rendimento: null,
    torasM3: 0,
  };
  for (const b of boletins) {
    k.metaM3 += b.metaM3;
    k.minutosProgramados += b.horasProgramadas * 60;
    k.torasM3 += b.torasM3 ?? 0;
    for (const i of b.itens) {
      k.producaoM3 += i.m3;
      if (i.tipo === "BOM") k.bomM3 += i.m3;
      else if (i.tipo === "APROVEITAMENTO") k.aproveitamentoM3 += i.m3;
      else k.refugoM3 += i.m3;
    }
    for (const p of b.paradas) {
      k.minutosParados += p.minutos;
      k.paradoPorCentro[p.centro] += p.minutos;
    }
  }
  if (k.minutosProgramados > 0) k.disponibilidade = Math.max(0, (k.minutosProgramados - k.minutosParados) / k.minutosProgramados);
  if (k.metaM3 > 0) k.produtividade = k.producaoM3 / k.metaM3;
  if (k.producaoM3 > 0) k.qualidade = 1 - k.refugoM3 / k.producaoM3;
  if (k.disponibilidade != null && k.produtividade != null && k.qualidade != null) k.oee = k.disponibilidade * k.produtividade * k.qualidade;
  if (k.torasM3 > 0) k.rendimento = k.producaoM3 / k.torasM3;
  return k;
}

/** Hoje no horário de Brasília, como "AAAA-MM-DD". */
export function hojeSP() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" → Date à meia-noite UTC (colunas @db.Date). */
export function diaParaDate(dia: string) {
  return new Date(`${dia}T00:00:00Z`);
}

/** Date de coluna @db.Date → "AAAA-MM-DD". */
export function dateParaDia(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Data de coluna @db.Date para exibição (sem converter fuso). */
export function formatarDia(d: Date, opcoes: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC", ...opcoes });
}

export function mesDe(dia: string) {
  return dia.slice(0, 7);
}

export function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const s = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "short", year: "2-digit" });
  return s.replace(".", "").replace(" de ", "/");
}

/** "2026-10" → "outubro de 2026". */
export function nomeMesLongo(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
}

/** Primeiro dia do mês e do mês seguinte (intervalo semiaberto) para filtrar boletins. */
export function intervaloMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return { gte: new Date(Date.UTC(a, m - 1, 1)), lt: new Date(Date.UTC(a, m, 1)) };
}

export function mesesAntes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

/** Checklist da estufa a cada ciclo (planilha "Check list estufas"). */
export const CHECKLIST_ESTUFA: { secao: string; itens: string[] }[] = [
  {
    secao: "A cada novo ciclo",
    itens: [
      "Verificar o supervisório do Ecopower",
      "Verificar inversores de frequência",
      "Verificar disjuntores de motores",
      "Verificar disjuntores dampers",
      "Verificar disjuntores aspersão",
      "Verificar painéis elétricos de todas as estufas",
    ],
  },
  {
    secao: "Antes de iniciar novo ciclo",
    itens: [
      "Banho H2O (bicos aspersores)",
      "Banho vapor",
      "Válvula aquecimento radiadores",
      "Vazamento em radiadores",
      "Ventiladores no mesmo sentido",
      "Ventiladores sentido 1",
      "Ventiladores sentido 2",
      "PT 100 TBS",
      "PT 100 TBU",
      "Caixa d'água TBU 1 e 2",
      "Caixa de TBU (pano)",
      "Cabos pontos de umidade",
      "Pinos banana / fêmea",
      "Pinos sensores",
      "Dampers",
      "Estado dos sensores PT100",
      "Purgadores",
      "Temperatura purgadores",
      "Portas (vedação – borrachas)",
      "Limpeza interna das estufas",
    ],
  },
];

/** Aclimatação depois da secagem (instrução da planilha das estufas). */
export const ACLIMATACAO_HORAS = 48;
