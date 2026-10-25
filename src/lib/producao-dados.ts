import "server-only";
import { db } from "@/lib/db";
import { mesesAntes, hojeSP, mesDe } from "@/lib/producao";

/** Opções dos formulários de boletim: motivos ativos, equipamentos e metas recentes. */
export async function opcoesBoletim() {
  const [motivos, equipamentos, metas] = await Promise.all([
    db.motivoParada.findMany({
      where: { ativo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, descricao: true, centro: true, equipamentoId: true },
    }),
    db.equipamento.findMany({ where: { ativo: true }, orderBy: [{ setor: { nome: "asc" } }, { nome: "asc" }], select: { id: true, codigo: true, nome: true } }),
    db.metaProducao.findMany({ where: { mes: { gte: mesesAntes(mesDe(hojeSP()), 24) } } }),
  ]);
  return {
    motivos,
    equipamentos,
    metas: Object.fromEntries(metas.map((m) => [m.mes, { metaDiariaM3: m.metaDiariaM3, horasDia: m.horasDia }])),
  };
}
