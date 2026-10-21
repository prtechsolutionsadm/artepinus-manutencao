import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type Registro = {
  usuarioId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | number | null;
  resumo: string;
  detalhes?: Prisma.InputJsonValue;
};

/** Grava na auditoria. Nunca lança erro: falha de log não pode desfazer a ação. */
export async function auditar(r: Registro) {
  try {
    await db.auditoria.create({
      data: {
        usuarioId: r.usuarioId ?? null,
        acao: r.acao,
        entidade: r.entidade,
        entidadeId: r.entidadeId == null ? null : String(r.entidadeId),
        resumo: r.resumo,
        detalhes: r.detalhes,
      },
    });
  } catch (e) {
    console.error("Falha ao gravar auditoria", e);
  }
}

type Valor = Prisma.InputJsonValue | null;
export type Mudancas = Record<string, { de: Valor; para: Valor }>;

function normalizar(v: unknown): Valor {
  if (v instanceof Date) return v.toISOString();
  return (v ?? null) as Valor;
}

/** Campos que mudaram entre dois objetos: { campo: { de, para } }. */
export function diferencas<T extends Record<string, unknown>>(antes: T, depois: Partial<T>, campos: (keyof T)[]) {
  const mudou: Mudancas = {};
  for (const c of campos) {
    if (!(c in depois)) continue;
    const de = normalizar(antes[c]);
    const para = normalizar(depois[c]);
    if (JSON.stringify(de) !== JSON.stringify(para)) mudou[String(c)] = { de, para };
  }
  return mudou;
}
