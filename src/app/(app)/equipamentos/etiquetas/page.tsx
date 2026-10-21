import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { EMPRESA } from "@/lib/empresa";
import { linkEquipamento, qrSvg } from "@/lib/qr";
import { exigirPermissao } from "@/lib/session";

export const metadata: Metadata = { title: "Etiquetas QR" };

/** Folha A4 de etiquetas para colar nas máquinas (3 por linha). */
export default async function EtiquetasPage({ searchParams }: { searchParams: Promise<{ ids?: string; setor?: string }> }) {
  await exigirPermissao("equipamentos");
  const { ids, setor } = await searchParams;
  const lista = ids?.split(",").filter(Boolean);
  const [equipamentos, setores] = await Promise.all([
    db.equipamento.findMany({
      where: { ativo: true, ...(lista?.length ? { id: { in: lista } } : {}), ...(setor ? { setorId: setor } : {}) },
      orderBy: { codigo: "asc" },
      include: { setor: { select: { nome: true } } },
    }),
    db.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const etiquetas = await Promise.all(
    equipamentos.map(async (e) => ({ ...e, svg: await qrSvg(await linkEquipamento(e.codigo)) }))
  );

  return (
    <div className="etiquetas">
      <div className="nao-imprimir">
        <Link href="/equipamentos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> Equipamentos
        </Link>
        <Titulo subtitulo="Imprima em papel adesivo e cole em cada máquina. O QR abre a requisição já com o equipamento." acao={<BotaoImprimir rotulo="Imprimir etiquetas" />}>
          Etiquetas QR
        </Titulo>
        {!lista?.length && (
          <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="setor">Setor</label>
              <select id="setor" name="setor" defaultValue={setor ?? ""} className="campo">
                <option value="">Todos os setores</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-secundario">Filtrar</button>
          </form>
        )}
      </div>

      {etiquetas.length === 0 ? (
        <Vazio>Nenhum equipamento ativo.</Vazio>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-0">
          {etiquetas.map((e) => (
            <li key={e.id} className="break-inside-avoid rounded-2xl border-2 border-dashed border-stone-300 bg-white p-3 text-center print:rounded-none print:border print:p-[4mm]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={EMPRESA.logo} alt="" className="mx-auto h-8 w-auto" />
              <div className="mx-auto mt-1 w-[70%] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: e.svg }} />
              <div className="mt-1 font-mono text-lg font-bold leading-tight">{e.codigo}</div>
              <div className="truncate text-sm leading-tight">{e.nome}</div>
              {e.setor && <div className="text-xs text-stone-500">{e.setor.nome}</div>}
              <div className="mt-1 text-[10px] leading-tight text-stone-500">Aponte a câmera do celular para abrir uma requisição</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
