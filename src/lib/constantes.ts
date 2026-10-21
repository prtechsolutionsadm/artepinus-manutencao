import type { Perfil, Prioridade, StatusRequisicao, TipoManutencao } from "@/generated/prisma/enums";

export const STATUS: Record<StatusRequisicao, { label: string; cor: string }> = {
  ABERTA: { label: "Aberta", cor: "bg-blue-50 text-blue-700 ring-blue-200" },
  EM_ANALISE: { label: "Em análise", cor: "bg-indigo-100 text-indigo-800 ring-indigo-300" },
  PLANEJADA: { label: "Planejada", cor: "bg-violet-100 text-violet-800 ring-violet-300" },
  AGENDADA: { label: "Agendada", cor: "bg-teal-50 text-teal-700 ring-teal-200" },
  EM_ANDAMENTO: { label: "Em andamento", cor: "bg-amber-100 text-amber-800 ring-amber-300" },
  AGUARDANDO_PECAS: { label: "Aguardando peças", cor: "bg-orange-100 text-orange-800 ring-orange-300" },
  ADIADA: { label: "Adiada", cor: "bg-stone-200 text-stone-800 ring-stone-400" },
  CONCLUIDA: { label: "Concluída", cor: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  CANCELADA: { label: "Cancelada", cor: "bg-rose-100 text-rose-800 ring-rose-300" },
};

export const STATUS_ORDEM = Object.keys(STATUS) as StatusRequisicao[];
export const STATUS_FINAIS: StatusRequisicao[] = ["CONCLUIDA", "CANCELADA"];
export const STATUS_PENDENTES = STATUS_ORDEM.filter((s) => !STATUS_FINAIS.includes(s));

export const PRIORIDADE: Record<Prioridade, { label: string; cor: string }> = {
  BAIXA: { label: "Baixa", cor: "bg-slate-100 text-slate-700 ring-slate-300" },
  MEDIA: { label: "Média", cor: "bg-blue-100 text-blue-800 ring-blue-300" },
  ALTA: { label: "Alta", cor: "bg-orange-100 text-orange-800 ring-orange-300" },
  URGENTE: { label: "Urgente", cor: "bg-red-600 text-white ring-red-700" },
};

export const TIPO: Record<TipoManutencao, string> = {
  CORRETIVA: "Corretiva",
  PREVENTIVA: "Preventiva",
  PREDITIVA: "Preditiva",
  MELHORIA: "Melhoria",
};

/** Formato do login: nome.sobrenome (letras minúsculas sem acento, números, ponto, hífen ou _). */
export const LOGIN_REGEX = /^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/;

/** Sugere um login nome.sobrenome a partir do nome completo. */
export function sugerirLogin(nome: string) {
  const partes = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  return partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : (partes[0] ?? "");
}

export const PERFIL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  MANUTENCAO: "Manutenção",
  SOLICITANTE: "Solicitante",
};

export function formatarData(d: Date | null | undefined, comHora = false) {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function numeroRequisicao(id: number) {
  return `#${String(id).padStart(5, "0")}`;
}

// Brasil (São Paulo) não tem horário de verão desde 2019: UTC-3 fixo.
const OFFSET_SP = "-03:00";

/** Converte o valor de um <input type="datetime-local"> (horário de Brasília) em Date. */
export function dataLocalParaDate(valor: string | null | undefined) {
  if (!valor) return null;
  const d = new Date(`${valor}${valor.length === 16 ? ":00" : ""}${OFFSET_SP}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formata uma Date para o valor de um <input type="datetime-local"> no horário de Brasília. */
export function dateParaDataLocal(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

/** Cores sólidas dos status (gráficos e Excel). */
export const STATUS_HEX: Record<StatusRequisicao, string> = {
  ABERTA: "#2563eb",
  EM_ANALISE: "#4f46e5",
  PLANEJADA: "#7c3aed",
  AGENDADA: "#0d9488",
  EM_ANDAMENTO: "#d97706",
  AGUARDANDO_PECAS: "#ea580c",
  ADIADA: "#78716c",
  CONCLUIDA: "#059669",
  CANCELADA: "#e11d48",
};
