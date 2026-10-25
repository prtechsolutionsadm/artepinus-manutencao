import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FormCiclo } from "@/components/producao/FormCiclo";
import { Titulo } from "@/components/ui";
import { dateParaDataLocal } from "@/lib/constantes";
import { db } from "@/lib/db";
import { estufasParaForm } from "@/lib/producao-estufas";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Editar ciclo" };

export default async function EditarCicloPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirProducao("lancar");
  const { id } = await params;
  const c = await db.cicloSecagem.findUnique({ where: { id }, include: { cargas: true, estufa: { select: { nome: true } } } });
  if (!c) notFound();
  if (c.status !== "EM_SECAGEM") redirect(`/producao/estufas/ciclos/${id}`);
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo>Editar ciclo · {c.estufa.nome}</Titulo>
      <FormCiclo
        estufas={await estufasParaForm()}
        inicial={{ ...c, entrada: dateParaDataLocal(c.entrada), previsaoSaida: dateParaDataLocal(c.previsaoSaida) }}
      />
    </div>
  );
}
