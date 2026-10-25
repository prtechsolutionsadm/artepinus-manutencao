import type { Metadata } from "next";
import { FormNovaRequisicao } from "@/components/FormNovaRequisicao";
import { Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { exigirModulo } from "@/lib/session";

export const metadata: Metadata = { title: "Nova requisição" };

export default async function NovaRequisicaoPage({ searchParams }: { searchParams: Promise<{ equipamento?: string }> }) {
  const eu = await exigirModulo("manutencao");
  const { equipamento } = await searchParams;
  const [setores, equipamentos] = await Promise.all([
    db.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.equipamento.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, include: { setor: { select: { nome: true } } } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo subtitulo={`Solicitante: ${eu.nome}`}>Nova requisição</Titulo>
      <FormNovaRequisicao
        setores={setores}
        equipamentos={equipamentos.map((e) => ({ id: e.id, codigo: e.codigo, nome: e.nome, setor: e.setor?.nome ?? null }))}
        equipamentoInicial={equipamentos.some((e) => e.id === equipamento) ? equipamento : undefined}
      />
    </div>
  );
}
