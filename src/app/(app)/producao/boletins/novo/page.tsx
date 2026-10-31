import type { Metadata } from "next";
import { FormBoletim } from "@/components/producao/FormBoletim";
import { Titulo } from "@/components/ui";
import { opcoesBoletim } from "@/lib/producao-dados";
import { cargasParaForm } from "@/lib/rastreio-dados";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Novo boletim" };

export default async function NovoBoletimPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  await exigirProducao("lancar");
  const { data } = await searchParams;
  const opcoes = await opcoesBoletim();
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo subtitulo="Lance a produção por bitola e as paradas do turno">Novo boletim da serraria</Titulo>
      <FormBoletim inicial={null} {...opcoes} cargas={await cargasParaForm()} dataPadrao={data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined} />
    </div>
  );
}
