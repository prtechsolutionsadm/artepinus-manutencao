import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagePlus, Pencil, Trash2, Wrench } from "lucide-react";
import { abrirRequisicaoDaParada, excluirBoletim } from "@/app/actions/producao";
import { BotaoAcao } from "@/components/producao/BotaoAcao";
import { Badge, Titulo } from "@/components/ui";
import { formatarData, formatarDuracao, numeroRequisicao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { podeProducao, temModulo } from "@/lib/permissoes";
import { CENTRO, MERCADO, TIPO_PRODUTO, calcularKpis, fmtM3, fmtNum, fmtPct, formatarDia } from "@/lib/producao";
import { codigoCarga } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";
import type { TipoProduto } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Boletim da serraria" };

export default async function BoletimPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirProducao();
  const { id } = await params;
  const b = await db.boletimProducao.findUnique({
    where: { id },
    include: {
      responsavel: { select: { nome: true } },
      itens: { orderBy: [{ tipo: "asc" }, { espessura: "asc" }, { largura: "asc" }, { comprimento: "asc" }] },
      paradas: {
        orderBy: { minutos: "desc" },
        include: { motivo: true, equipamento: { select: { nome: true } }, requisicao: { select: { id: true, status: true } } },
      },
      cargas: { orderBy: { data: "asc" }, include: { itens: { select: { quantidade: true } }, colheita: { include: { origem: { select: { nome: true } } } } } },
      ciclos: { select: { id: true, numero: true, estufa: { select: { nome: true } } } },
      pacotes: { select: { numero: true, m3: true, status: true } },
    },
  });
  if (!b) notFound();
  const k = calcularKpis([b]);
  const editar = podeProducao(eu, "gerir") || (podeProducao(eu, "lancar") && b.responsavelId === eu.id);
  const abrirReq = podeProducao(eu, "lancar") && temModulo(eu, "manutencao");

  return (
    <div className="mx-auto max-w-5xl">
      <Titulo
        subtitulo={
          <>
            Lançado por {b.responsavel.nome} · atualizado em {formatarData(b.atualizadoEm, true)}
          </>
        }
        acao={
          <div className="flex gap-2">
            {editar && (
              <Link href={`/producao/boletins/${b.id}/editar`} className="btn-secundario">
                <Pencil className="h-4 w-4" /> Editar
              </Link>
            )}
            {podeProducao(eu, "gerir") && (
              <BotaoAcao acao={excluirBoletim} arg={b.id} confirmar="Excluir este boletim? Esta ação não pode ser desfeita." depois="/producao/boletins" className="btn-perigo">
                <Trash2 className="h-4 w-4" /> Excluir
              </BotaoAcao>
            )}
          </div>
        }
      >
        Boletim de {formatarDia(b.data, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </Titulo>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Produção", fmtM3(k.producaoM3), `meta ${fmtM3(k.metaM3)}`],
          ["Disponibilidade", fmtPct(k.disponibilidade), `${formatarDuracao(k.minutosParados)} parado de ${fmtNum(b.horasProgramadas, 1)} h`],
          ["Produtividade", fmtPct(k.produtividade), "produção ÷ meta"],
          ["Qualidade", fmtPct(k.qualidade), `refugo ${fmtM3(k.refugoM3)}`],
          ["OEE", fmtPct(k.oee), "disp. × prod. × qual."],
          ["Rendimento", fmtPct(k.rendimento), b.torasM3 ? `de ${fmtM3(b.torasM3)} em toras` : "toras não informadas"],
          ["Toras", b.torasQtd ? fmtNum(b.torasQtd) : "—", b.diametroMedio ? `Ø médio ${fmtNum(b.diametroMedio, 1)} cm` : ""],
          ["Aproveitamento", fmtM3(k.aproveitamentoM3), `bom ${fmtM3(k.bomM3)}`],
        ].map(([r, v, d]) => (
          <div key={r} className="cartao py-3">
            <dt className="text-xs text-stone-500">{r}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            {d && <dd className="text-xs text-stone-500">{d}</dd>}
          </div>
        ))}
      </dl>

      <section className="cartao mb-6 overflow-hidden p-0">
        <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">Produção por bitola</h2>
        {b.itens.length === 0 ? (
          <p className="px-4 py-4 text-sm text-stone-500">Sem produção lançada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Tipo</th>
                  <th className="px-4 py-2 font-semibold">Mercado</th>
                  <th className="px-4 py-2 text-right font-semibold">E × L × C (mm)</th>
                  <th className="px-4 py-2 text-right font-semibold">Peças</th>
                  <th className="px-4 py-2 text-right font-semibold">m³</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {b.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2">{TIPO_PRODUTO[i.tipo]}</td>
                    <td className="px-4 py-2 text-stone-500">{MERCADO[i.mercado].replace("Mercado ", "")}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {i.espessura} × {i.largura} × {i.comprimento}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(i.pecas)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(i.m3, 4)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-stone-50 font-semibold">
                {(Object.keys(TIPO_PRODUTO) as TipoProduto[]).map((t) => {
                  const s = b.itens.filter((i) => i.tipo === t);
                  if (!s.length) return null;
                  return (
                    <tr key={t}>
                      <td className="px-4 py-1.5" colSpan={3}>
                        Total {TIPO_PRODUTO[t].toLowerCase()}
                      </td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{fmtNum(s.reduce((x, i) => x + i.pecas, 0))}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums">{fmtNum(s.reduce((x, i) => x + i.m3, 0), 4)}</td>
                    </tr>
                  );
                })}
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="cartao mb-6 p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
          <h2 className="font-semibold">Paradas</h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(Object.keys(CENTRO) as (keyof typeof CENTRO)[]).map((c) => (
              <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                {CENTRO[c].curto} {formatarDuracao(k.paradoPorCentro[c])}
              </span>
            ))}
          </div>
        </div>
        {b.paradas.length === 0 ? (
          <p className="px-4 py-4 text-sm text-stone-500">Sem paradas.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {b.paradas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{p.motivo ? `${p.motivo.codigo} · ${p.motivo.descricao}` : (p.descricao ?? "Parada")}</div>
                  <div className="text-sm text-stone-500">
                    {CENTRO[p.centro].label}
                    {p.equipamento && ` · ${p.equipamento.nome}`} · {p.ocorrencias}× · <b className="text-stone-700">{formatarDuracao(p.minutos)}</b>
                  </div>
                  {p.motivo && p.descricao && <div className="mt-0.5 text-sm text-stone-600">{p.descricao}</div>}
                </div>
                {p.requisicao ? (
                  temModulo(eu, "manutencao") ? (
                    <Link href={`/requisicoes/${p.requisicao.id}`} className="shrink-0">
                      <Badge cor="bg-sky-50 text-sky-800 ring-sky-200">Requisição {numeroRequisicao(p.requisicao.id)}</Badge>
                    </Link>
                  ) : (
                    <Badge cor="bg-sky-50 text-sky-800 ring-sky-200">Requisição {numeroRequisicao(p.requisicao.id)}</Badge>
                  )
                ) : (
                  abrirReq &&
                  p.centro !== "OPE" && (
                    <BotaoAcao
                      acao={abrirRequisicaoDaParada}
                      arg={p.id}
                      confirmar="Abrir uma requisição de manutenção corretiva para esta parada?"
                      depois="/requisicoes/{id}"
                      className="btn-secundario shrink-0 px-3 py-1.5 text-sm"
                    >
                      <Wrench className="h-4 w-4" /> Abrir requisição
                    </BotaoAcao>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Rastreabilidade</h2>
          {podeProducao(eu, "lancar") && (
            <Link href={`/producao/pacotes/novo?boletim=${b.id}`} className="btn-secundario px-3 py-1.5 text-sm">
              <PackagePlus className="h-4 w-4" /> Formar pacote verde deste dia
            </Link>
          )}
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Toras serradas</dt>
            {b.cargas.length ? (
              <dd className="space-y-1">
                {b.cargas.map((c) => (
                  <Link key={c.id} href={`/producao/toras/${c.id}`} className="block hover:underline">
                    <span className="font-mono text-xs text-stone-500">{codigoCarga(c.numero)}</span> {c.colheita?.origem.nome ?? c.origem} ·{" "}
                    {c.itens.reduce((s, i) => s + i.quantidade, 0)} toras
                  </Link>
                ))}
              </dd>
            ) : (
              <dd className="text-stone-500">Nenhuma carga ligada (edite o boletim para marcar).</dd>
            )}
          </div>
          <div>
            <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Estufas</dt>
            {b.ciclos.length ? (
              <dd className="space-y-1">
                {b.ciclos.map((c) => (
                  <Link key={c.id} href={`/producao/estufas/ciclos/${c.id}`} className="block hover:underline">
                    {c.estufa.nome}
                    {c.numero ? ` · ciclo nº ${c.numero}` : ""}
                  </Link>
                ))}
              </dd>
            ) : (
              <dd className="text-stone-500">Madeira ainda não ligada a um ciclo.</dd>
            )}
          </div>
          <div>
            <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Pacotes verdes</dt>
            <dd>
              {b.pacotes.length ? (
                <Link href={`/producao/pacotes?status=todos&boletim=${b.id}`} className="hover:underline">
                  {b.pacotes.length} pacote(s) · {fmtM3(b.pacotes.reduce((s, p) => s + p.m3, 0), 2)}
                </Link>
              ) : (
                <span className="text-stone-500">Nenhum.</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {b.observacoes && (
        <section className="cartao">
          <h2 className="mb-1 font-semibold">Observações</h2>
          <p className="whitespace-pre-line text-sm text-stone-700">{b.observacoes}</p>
        </section>
      )}
    </div>
  );
}
