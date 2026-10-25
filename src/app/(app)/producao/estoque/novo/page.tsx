import type { Metadata } from "next";
import { FormEstoque } from "@/components/producao/FormEstoque";
import { Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { hojeSP } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";
import type { TipoEstoque } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Novo levantamento de estoque" };

export default async function NovoLevantamentoPage({ searchParams }: { searchParams: Promise<{ tipo?: string; copiar?: string }> }) {
  await exigirProducao("lancar");
  const { tipo: t, copiar } = await searchParams;
  const tipo: TipoEstoque = t === "EMPACOTADA" ? "EMPACOTADA" : "VERDE";
  // "Copiar" parte do último levantamento: só ajustar o que mudou
  const base = copiar ? await db.levantamentoEstoque.findUnique({ where: { id: copiar }, include: { itens: true } }) : null;
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo subtitulo={base ? "Partindo do levantamento anterior — ajuste o que mudou" : undefined}>Novo levantamento de estoque</Titulo>
      <FormEstoque inicial={{ data: hojeSP(), tipo: base?.tipo ?? tipo, observacoes: null, itens: base?.itens ?? [] }} />
    </div>
  );
}
