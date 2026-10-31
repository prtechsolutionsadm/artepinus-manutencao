import type { Metadata } from "next";
import { FormToras } from "@/components/producao/FormToras";
import { Titulo } from "@/components/ui";
import { hojeSP } from "@/lib/producao";
import { colheitasParaForm } from "@/lib/rastreio-dados";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Nova carga de toras" };

export default async function NovaCargaPage() {
  await exigirProducao("lancar");
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo>Nova carga de toras</Titulo>
      <FormToras colheitas={await colheitasParaForm()} inicial={{ data: hojeSP(), origem: "", colheitaId: null, talhao: null, motorista: null, placa: null, comprimentoMedio: null, observacoes: null, itens: [] }} />
    </div>
  );
}
