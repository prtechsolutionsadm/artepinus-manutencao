import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FormBoletim } from "@/components/producao/FormBoletim";
import { Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { dateParaDia, formatarDia } from "@/lib/producao";
import { opcoesBoletim } from "@/lib/producao-dados";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Editar boletim" };

export default async function EditarBoletimPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirProducao("lancar");
  const { id } = await params;
  const b = await db.boletimProducao.findUnique({ where: { id }, include: { itens: true, paradas: true } });
  if (!b) notFound();
  if (b.responsavelId !== eu.id && !podeProducao(eu, "gerir")) redirect(`/producao/boletins/${id}`);
  const opcoes = await opcoesBoletim();
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo>Editar boletim de {formatarDia(b.data)}</Titulo>
      <FormBoletim inicial={{ ...b, data: dateParaDia(b.data) }} {...opcoes} />
    </div>
  );
}
