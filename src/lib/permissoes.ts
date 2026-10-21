import type { Perfil } from "@/generated/prisma/enums";

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
export const PERFIS_ATRIBUIVEIS: Perfil[] = ["GERENTE", "SUPERVISOR", "MANUTENTOR", "OPERADOR"];

/** Quem é avisado de uma requisição nova (gerente só nas de prioridade alta/urgente). */
export const AVISO_NOVA = { todas: ["SUPERVISOR", "MANUTENTOR"] as Perfil[], urgentes: ["GERENTE"] as Perfil[] };
