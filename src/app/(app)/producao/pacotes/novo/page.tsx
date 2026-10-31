import type { Metadata } from "next";
import { FormPacote } from "@/components/producao/FormPacote";
import { Titulo } from "@/components/ui";
import { boletinsParaForm, ciclosParaForm } from "@/lib/rastreio-dados";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Formar pacote" };

export default async function NovoPacotePage({ searchParams }: { searchParams: Promise<{ boletim?: string; ciclo?: string }> }) {
  await exigirProducao("lancar");
  const { boletim, ciclo } = await searchParams;
  const [boletins, ciclos] = await Promise.all([boletinsParaForm(boletim ? [boletim] : []), ciclosParaForm()]);
  const origem = boletim ? "boletim" : ciclo || ciclos.length ? "ciclo" : "boletim";
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo subtitulo="Cada pacote ganha um código e uma etiqueta com QR Code que conta toda a história da madeira">Formar pacote</Titulo>
      <FormPacote boletins={boletins} ciclos={ciclos} inicial={{ origem, boletimId: boletim, cicloId: ciclo }} />
    </div>
  );
}
