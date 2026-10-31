import type { StatusPacote, TipoEvento, TipoOrigem } from "@/generated/prisma/enums";

// Códigos e rótulos da rastreabilidade (servidor e navegador).

export const codigoPacote = (n: number) => `PCT-${String(n).padStart(6, "0")}`;
export const codigoCarga = (n: number) => `CT-${String(n).padStart(5, "0")}`;
export const codigoColheita = (n: number) => `COL-${String(n).padStart(4, "0")}`;

/** "PCT-000123", "pct123", "123" ou o link do QR → 123. */
export function numeroDoCodigo(texto: string): number | null {
  const t = texto.trim();
  const doLink = t.match(/\/p\/(\d+)/);
  const m = doLink ?? t.match(/^(?:PCT[-\s]?)?0*(\d{1,9})$/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const STATUS_PACOTE: Record<StatusPacote, { label: string; cor: string; hex: string }> = {
  VERDE: { label: "Verde (serrado)", cor: "bg-emerald-50 text-emerald-800 ring-emerald-200", hex: "#1baf7a" },
  EM_ESTUFA: { label: "Na estufa", cor: "bg-amber-50 text-amber-800 ring-amber-200", hex: "#eb6834" },
  SECO: { label: "Seco · em estoque", cor: "bg-sky-50 text-sky-800 ring-sky-200", hex: "#2a78d6" },
  EXPEDIDO: { label: "Expedido", cor: "bg-stone-100 text-stone-700 ring-stone-200", hex: "#78716c" },
  CANCELADO: { label: "Cancelado", cor: "bg-rose-50 text-rose-700 ring-rose-200", hex: "#e11d48" },
};

/** Pacotes que ainda estão na empresa (contam no estoque). */
export const STATUS_EM_ESTOQUE: StatusPacote[] = ["VERDE", "EM_ESTUFA", "SECO"];

export const TIPO_EVENTO: Record<TipoEvento, string> = {
  CRIADO: "Pacote formado",
  ENTRADA_ESTUFA: "Entrou na estufa",
  SAIDA_ESTUFA: "Saiu da estufa",
  MOVIMENTADO: "Movimentado",
  EXPEDIDO: "Expedido",
  OBSERVACAO: "Observação",
  ALTERADO: "Dados alterados",
  CANCELADO: "Cancelado",
};

export const TIPO_ORIGEM: Record<TipoOrigem, string> = {
  PROPRIA: "Floresta própria",
  ARRENDADA: "Floresta arrendada",
  TERCEIRO: "Fornecedor (terceiro)",
};

export const bitola = (p: { espessura: number; largura: number; comprimento: number }) => `${p.espessura} × ${p.largura} × ${p.comprimento} mm`;
