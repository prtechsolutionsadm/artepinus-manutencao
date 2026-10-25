import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { excluirLevantamento } from "@/app/actions/producao";
import { BotaoAcao } from "@/components/producao/BotaoAcao";
import { FormEstoque } from "@/components/producao/FormEstoque";
import { Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { TIPO_ESTOQUE, dateParaDia, fmtNum, formatarDia } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Levantamento de estoque" };

export default async function LevantamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirProducao();
  const { id } = await params;
  const l = await db.levantamentoEstoque.findUnique({
    where: { id },
    include: { itens: { orderBy: [{ espessura: "asc" }, { comprimento: "asc" }] }, responsavel: { select: { nome: true } } },
  });
  if (!l) notFound();
  const editar = podeProducao(eu, "gerir") || (podeProducao(eu, "lancar") && l.responsavelId === eu.id);
  return (
    <div className="mx-auto max-w-4xl">
      <Titulo
        subtitulo={`Registrado por ${l.responsavel.nome}`}
        acao={
          <div className="flex gap-2">
            {podeProducao(eu, "lancar") && (
              <Link href={`/producao/estoque/novo?copiar=${l.id}`} className="btn-secundario">
                <Copy className="h-4 w-4" /> Novo a partir deste
              </Link>
            )}
            {podeProducao(eu, "gerir") && (
              <BotaoAcao acao={excluirLevantamento} arg={l.id} confirmar="Excluir este levantamento?" depois="/producao/estoque" className="btn-perigo">
                <Trash2 className="h-4 w-4" /> Excluir
              </BotaoAcao>
            )}
          </div>
        }
      >
        {TIPO_ESTOQUE[l.tipo]} · {formatarDia(l.data)}
      </Titulo>
      {editar ? (
        <FormEstoque inicial={{ ...l, data: dateParaDia(l.data) }} />
      ) : (
        <section className="cartao overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Esp.</th>
                <th className="px-3 py-2">Largura</th>
                <th className="px-3 py-2 text-right">Comp.</th>
                <th className="px-3 py-2 text-right">{l.tipo === "VERDE" ? "Grades" : "Pacotes"}</th>
                <th className="px-3 py-2 text-right">m³</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {l.itens.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2">{i.espessura} mm</td>
                  <td className="px-3 py-2">{i.largura}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(i.comprimento, 2)} m</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(l.tipo === "VERDE" ? i.grades : i.pacotes) ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(i.m3, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
