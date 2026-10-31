import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { EMPRESA } from "@/lib/empresa";
import { fmtM3, fmtNum } from "@/lib/producao";
import { linkPacote, qrSvg } from "@/lib/qr";
import { codigoPacote } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Etiquetas de pacotes" };

/** Folha A4 com 8 etiquetas (2 × 4) para prender nos pacotes. */
export default async function EtiquetasPacotesPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  await exigirProducao();
  const numeros = ((await searchParams).n ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
  const pacotes = numeros.length
    ? await db.pacote.findMany({ where: { numero: { in: numeros } }, orderBy: { numero: "asc" }, include: { ciclo: { include: { estufa: { select: { nome: true } } } } } })
    : [];
  const etiquetas = await Promise.all(pacotes.map(async (p) => ({ ...p, svg: await qrSvg(await linkPacote(p.numero)) })));

  return (
    <div className="etiquetas">
      <div className="nao-imprimir">
        <Link href="/producao/pacotes" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> Pacotes
        </Link>
        <Titulo
          subtitulo="Imprima (de preferência em papel adesivo resistente ou etiqueta plástica) e prenda no pacote. O QR abre a história completa do pacote."
          acao={etiquetas.length > 0 && <BotaoImprimir rotulo={`Imprimir ${etiquetas.length} etiqueta(s)`} />}
        >
          Etiquetas de pacotes
        </Titulo>
      </div>
      {etiquetas.length === 0 ? (
        <Vazio>Nenhum pacote escolhido. Selecione os pacotes na lista e toque em Imprimir etiquetas.</Vazio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
          {etiquetas.map((p) => (
            <li
              key={p.id}
              className="flex break-inside-avoid gap-3 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-3 print:h-[68mm] print:rounded-none print:border print:p-[4mm]"
            >
              <div className="w-[42%] shrink-0 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: p.svg }} />
              <div className="flex min-w-0 flex-1 flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={EMPRESA.logo} alt="" className="h-7 w-auto self-start" />
                <div className="mt-1 font-mono text-xl font-bold leading-tight">{codigoPacote(p.numero)}</div>
                <div className="mt-1 text-lg font-bold leading-tight tabular-nums">
                  {p.espessura} × {p.largura} × {p.comprimento}
                </div>
                <div className="text-sm leading-snug">
                  {fmtNum(p.pecas)} peças · {fmtM3(p.m3, 3)}
                  {p.classe && <> · {p.classe}</>}
                </div>
                <div className="text-xs leading-snug text-stone-600">
                  {p.ciclo ? `Seco · ${p.ciclo.estufa.nome}` : "Verde"} · {p.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </div>
                <div className="mt-auto text-[9px] leading-tight text-stone-500">{EMPRESA.razaoSocial}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
