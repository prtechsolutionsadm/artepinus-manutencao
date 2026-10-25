import "server-only";
import { db } from "@/lib/db";

/** Estufas ativas com a indicação de ciclo em andamento (para os formulários). */
export async function estufasParaForm() {
  const estufas = await db.estufa.findMany({
    where: { ativo: true },
    orderBy: { numero: "asc" },
    select: { id: true, nome: true, ciclos: { where: { status: "EM_SECAGEM" }, select: { id: true }, take: 1 } },
  });
  return estufas.map((e) => ({ id: e.id, nome: e.nome, ocupada: e.ciclos.length > 0 }));
}
