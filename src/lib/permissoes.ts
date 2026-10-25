import type { Perfil, PerfilProducao } from "@/generated/prisma/enums";

/**
 * Quem pode fazer o quê. ADMIN é só o desenvolvedor do sistema: não pode ser
 * atribuído pela tela de usuários.
 */
const REGRAS = {
  /** Atualizar status, data agendada e serviço realizado. */
  atenderRequisicoes: ["ADMIN", "GERENTE", "SUPERVISOR", "MANUTENTOR"],
  /** Definir o responsável como outra pessoa (o manutentor só pode assumir para si). */
  atribuirResponsavel: ["ADMIN", "GERENTE", "SUPERVISOR"],
  /** Cancelar qualquer requisição (o operador cancela só as próprias, enquanto abertas). */
  cancelarRequisicoes: ["ADMIN", "GERENTE", "SUPERVISOR"],
  equipamentos: ["ADMIN", "GERENTE", "SUPERVISOR", "MANUTENTOR"],
  relatorios: ["ADMIN", "GERENTE", "SUPERVISOR"],
  usuarios: ["ADMIN", "GERENTE"],
  setores: ["ADMIN", "GERENTE"],
  /** Histórico de alterações (auditoria). */
  auditoria: ["ADMIN", "GERENTE"],
  /** Planos de preventiva e modelos de checklist. */
  preventivas: ["ADMIN", "GERENTE", "SUPERVISOR"],
  /** Registrar horas trabalhadas e aplicar checklist em requisições. */
  apontarHoras: ["ADMIN", "GERENTE", "SUPERVISOR", "MANUTENTOR"],
} satisfies Record<string, Perfil[]>;

export type Acao = keyof typeof REGRAS;

export function pode(perfil: Perfil, acao: Acao) {
  return (REGRAS[acao] as Perfil[]).includes(perfil);
}

export function perfisCom(acao: Acao): Perfil[] {
  return [...REGRAS[acao]];
}

/** Perfis que aparecem como responsáveis possíveis de uma requisição. */
export const PERFIS_RESPONSAVEIS: Perfil[] = ["SUPERVISOR", "MANUTENTOR"];

/** Perfis que podem ser atribuídos na tela de usuários (ADMIN fica de fora). */
export const PERFIS_ATRIBUIVEIS: Perfil[] = ["GERENTE", "SUPERVISOR", "MANUTENTOR", "OPERADOR", "SEM_ACESSO"];

/** Quem é avisado de uma requisição nova (gerente só nas de prioridade alta/urgente). */
export const AVISO_NOVA = { todas: ["SUPERVISOR", "MANUTENTOR"] as Perfil[], urgentes: ["GERENTE"] as Perfil[] };

// ============================ Módulos ============================

export type Modulo = "manutencao" | "producao";
export type UsuarioComPerfis = { perfil: Perfil; perfilProducao: PerfilProducao | null };

export const MODULOS: Record<Modulo, { nome: string; inicio: string }> = {
  manutencao: { nome: "Manutenção", inicio: "/" },
  producao: { nome: "Produção", inicio: "/producao" },
};

/** Admin e Gerente enxergam todos os módulos com acesso total. */
const GLOBAL: Perfil[] = ["ADMIN", "GERENTE"];

export function temModulo(u: UsuarioComPerfis, m: Modulo) {
  if (m === "manutencao") return u.perfil !== "SEM_ACESSO";
  return GLOBAL.includes(u.perfil) || u.perfilProducao !== null;
}

export function modulosDe(u: UsuarioComPerfis): Modulo[] {
  return (Object.keys(MODULOS) as Modulo[]).filter((m) => temModulo(u, m));
}

const REGRAS_PRODUCAO = {
  /** Ver painéis, boletins, estufas, toras e estoque. */
  ver: ["SUPERVISOR", "APONTADOR", "CONSULTA"],
  /** Lançar e editar boletins, paradas, ciclos de estufa, cargas de toras e estoque. */
  lancar: ["SUPERVISOR", "APONTADOR"],
  /** Excluir lançamentos e alterar cadastros (motivos de parada, estufas, metas). */
  gerir: ["SUPERVISOR"],
} satisfies Record<string, PerfilProducao[]>;

export type AcaoProducao = keyof typeof REGRAS_PRODUCAO;

export function podeProducao(u: UsuarioComPerfis, acao: AcaoProducao) {
  if (GLOBAL.includes(u.perfil)) return true;
  return u.perfilProducao !== null && (REGRAS_PRODUCAO[acao] as PerfilProducao[]).includes(u.perfilProducao);
}
