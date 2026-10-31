import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { excluirCargaToras } from "@/app/actions/producao";
import { BotaoAcao } from "@/components/producao/BotaoAcao";
import { FormToras } from "@/components/producao/FormToras";
import { Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { dateParaDia, fmtNum, formatarDia } from "@/lib/producao";
import { colheitasParaForm } from "@/lib/rastreio-dados";
import { codigoCarga, codigoColheita } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Carga de toras" };

export default async function CargaPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirProducao();
  const { id } = await params;
  const c = await db.cargaToras.findUnique({ where: { id }, include: { itens: { orderBy: { diametro: "asc" } }, responsavel: { select: { nome: true } }, colheita: { include: { origem: { select: { nome: true } } } } } });
  if (!c) notFound();
  const editar = podeProducao(eu, "gerir") || (podeProducao(eu, "lancar") && c.responsavelId === eu.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Titulo
        subtitulo={`${codigoCarga(c.numero)} · registrada por ${c.responsavel.nome}${c.colheita ? ` · colheita ${codigoColheita(c.colheita.numero)} (${c.colheita.origem.nome})` : ""}`}
        acao={
          podeProducao(eu, "gerir") && (
            <BotaoAcao acao={excluirCargaToras} arg={c.id} confirmar="Excluir esta carga?" depois="/producao/toras" className="btn-perigo">
              <Trash2 className="h-4 w-4" /> Excluir
            </BotaoAcao>
          )
        }
      >
        Carga de {c.origem} · {formatarDia(c.data)}
      </Titulo>
      {editar ? (
        <FormToras colheitas={await colheitasParaForm(c.colheitaId)} inicial={{ ...c, data: dateParaDia(c.data) }} />
      ) : (
        <section className="cartao">
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Talhão", c.talhao],
              ["Motorista", c.motorista],
              ["Placa", c.placa],
              ["Comprimento médio", c.comprimentoMedio ? `${fmtNum(c.comprimentoMedio, 2)} m` : null],
            ].map(([r, v]) => (
              <div key={r}>
                <dt className="text-xs text-stone-500">{r}</dt>
                <dd className="font-medium">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <ul className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-6">
            {c.itens.map((i) => (
              <li key={i.id} className="rounded-lg bg-stone-50 px-2 py-1.5 text-center">
                <div className="text-xs text-stone-500">Ø {i.diametro} cm</div>
                <div className="font-semibold tabular-nums">{i.quantidade}</div>
              </li>
            ))}
          </ul>
          {c.observacoes && <p className="mt-4 whitespace-pre-line text-sm text-stone-700">{c.observacoes}</p>}
        </section>
      )}
    </div>
  );
}
