import type { Metadata } from "next";
import { Escaner } from "@/components/producao/Escaner";
import { Titulo } from "@/components/ui";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Ler QR do pacote" };

export default async function EscanearPage() {
  await exigirProducao();
  return (
    <div className="mx-auto max-w-md">
      <Titulo subtitulo="Leia a etiqueta para ver toda a história do pacote e registrar o que aconteceu com ele">Ler QR do pacote</Titulo>
      <Escaner />
    </div>
  );
}
