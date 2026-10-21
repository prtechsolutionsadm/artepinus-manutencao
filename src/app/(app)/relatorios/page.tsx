import type { Metadata } from "next";
import { FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { PrioridadeBadge, StatusBadge, Titulo } from "@/components/ui";
import { PRIORIDADE, STATUS, STATUS_HEX, STATUS_ORDEM, TIPO, formatarData, numeroRequisicao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { EMPRESA } from "@/lib/empresa";
import { formatarDataCurta, gerarRelatorio, type FiltrosRelatorio } from "@/lib/relatorio";
import { exigirUsuario } from "@/lib/session";
import type { StatusRequisicao, TipoManutencao } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<FiltrosRelatorio> }) {
  const eu = await exigirUsuario();
  const [rel, setores] = await Promise.all([gerarRelatorio(await searchParams), db.setor.findMany({ orderBy: { nome: "asc" } })]);
  const f = rel.filtros;
  const query = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const geradoEm = formatarData(new Date(), true);

  return (
    <>
      <div className="nao-imprimir">
        <Titulo
          acao={
            <div className="flex flex-wrap gap-2">
              <BotaoImprimir rotulo="Exportar PDF" icone={<FileText className="h-4 w-4" />} />
              <a href={`/relatorios/excel?${query}`} className="btn-primario">
                <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
              </a>
            </div>
          }
        >
          Relatórios
        </Titulo>

        <form method="get" className="cartao mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label htmlFor="de">De</label>
            <input id="de" name="de" type="date" defaultValue={f.de} className="campo" />
          </div>
          <div>
            <label htmlFor="ate">Até</label>
            <input id="ate" name="ate" type="date" defaultValue={f.ate} className="campo" />
          </div>
          <div>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={f.status} className="campo">
              <option value="">Todos</option>
              <option value="pendentes">Pendentes</option>
              {STATUS_ORDEM.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" defaultValue={f.tipo} className="campo">
              <option value="">Todos</option>
              {Object.entries(TIPO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prioridade">Prioridade</label>
            <select id="prioridade" name="prioridade" defaultValue={f.prioridade} className="campo">
              <option value="">Todas</option>
              {Object.entries(PRIORIDADE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="setor">Setor</label>
            <select id="setor" name="setor" defaultValue={f.setor} className="campo">
              <option value="">Todos</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2 md:col-span-3 lg:col-span-6">
            <Link href="/relatorios" className="btn-secundario">
              Limpar
            </Link>
            <button className="btn-primario">Gerar relatório</button>
          </div>
        </form>
      </div>

      {/* Documento do relatório: é exatamente o que sai no PDF */}
      <article className="relatorio cartao space-y-6 sm:p-8">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-marca-600 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EMPRESA.logo} alt={EMPRESA.nome} className="h-14 w-14 rounded-xl object-contain sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1 basis-52">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-marca-600 sm:text-xs sm:tracking-widest">
              {EMPRESA.nome} · {EMPRESA.sistema}
            </div>
            <h2 className="text-xl font-bold sm:text-2xl">Relatório de Manutenção</h2>
            <div className="text-sm text-stone-600">
              Período: {formatarDataCurta(f.de)} a {formatarDataCurta(f.ate)} (data de abertura)
              {rel.descricaoFiltros.length > 0 && <> · {rel.descricaoFiltros.join(" · ")}</>}
            </div>
          </div>
          <div className="w-full text-xs text-stone-500 sm:w-auto sm:text-right">
            Gerado em {geradoEm}
            <br className="hidden sm:inline" /> 
            por {eu.nome}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Numero rotulo="Requisições" valor={rel.resumo.total} />
          <Numero rotulo="Concluídas" valor={rel.resumo.concluidas} cor="text-emerald-700" />
          <Numero rotulo="Pendentes" valor={rel.resumo.pendentes} cor="text-amber-700" />
          <Numero rotulo="Canceladas" valor={rel.resumo.canceladas} cor="text-rose-700" />
          <Numero rotulo="Urgentes" valor={rel.resumo.urgentes} cor="text-red-700" />
          <Numero
            rotulo="Tempo médio p/ concluir"
            valor={rel.resumo.diasMedios === null ? "—" : `${rel.resumo.diasMedios.toFixed(1).replace(".", ",")} d`}
          />
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Barras
            titulo="Por status"
            total={rel.resumo.total}
            itens={rel.porStatus.map(([s, n]) => ({ rotulo: STATUS[s as StatusRequisicao].label, n, cor: STATUS_HEX[s as StatusRequisicao] }))}
          />
          <Barras
            titulo="Por tipo"
            total={rel.resumo.total}
            itens={rel.porTipo.map(([t, n]) => ({ rotulo: TIPO[t as TipoManutencao], n, cor: "#23703e" }))}
          />
          <Barras titulo="Por setor" total={rel.resumo.total} itens={rel.porSetor.map(([s, n]) => ({ rotulo: s, n, cor: "#57534e" }))} />
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Requisições ({rel.itens.length})</h3>
          {rel.itens.length === 0 ? (
            <p className="rounded-lg bg-stone-50 p-6 text-center text-stone-500">Nenhuma requisição no período/filtro selecionado.</p>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="space-y-2 md:hidden print:hidden">
                {rel.itens.map((r) => (
                  <li key={r.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/requisicoes/${r.id}`} className="font-mono text-xs text-marca-700 underline">
                        {numeroRequisicao(r.id)}
                      </Link>
                      <StatusBadge status={r.status} />
                      <PrioridadeBadge prioridade={r.prioridade} />
                    </div>
                    <div className="mt-1 font-medium">{r.titulo}</div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {formatarData(r.criadoEm)} · {TIPO[r.tipo]} · {r.setor?.nome ?? "Sem setor"}
                      {r.responsavel && ` · Resp.: ${r.responsavel.nome}`}
                      {r.dataConclusao && ` · Concluída ${formatarData(r.dataConclusao)}`}
                    </div>
                  </li>
                ))}
              </ul>
              {/* Desktop e PDF: tabela */}
              <div className="hidden overflow-x-auto md:block print:block">
                <table className="w-full border-collapse text-left text-sm print:text-[10px]">
                  <thead>
                    <tr className="bg-marca-700 text-white">
                      {["Nº", "Abertura", "Título", "Setor / Equip.", "Tipo", "Prior.", "Status", "Responsável", "Conclusão"].map((h) => (
                        <th key={h} className="px-2 py-2 font-semibold first:rounded-tl-lg last:rounded-tr-lg">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rel.itens.map((r) => (
                      <tr key={r.id} className="border-b border-stone-200 align-top even:bg-stone-50">
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                          <Link href={`/requisicoes/${r.id}`} className="text-marca-700 hover:underline print:text-stone-900 print:no-underline">
                            {numeroRequisicao(r.id)}
                          </Link>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{formatarData(r.criadoEm)}</td>
                        <td className="px-2 py-1.5">{r.titulo}</td>
                        <td className="px-2 py-1.5">
                          {r.setor?.nome ?? "—"}
                          {r.equipamento && <div className="text-xs text-stone-500">{r.equipamento.codigo}</div>}
                        </td>
                        <td className="px-2 py-1.5">{TIPO[r.tipo]}</td>
                        <td className="px-2 py-1.5">{PRIORIDADE[r.prioridade].label}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_HEX[r.status] }} />
                            {STATUS[r.status].label}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">{r.responsavel?.nome ?? "—"}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{formatarData(r.dataConclusao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <footer className="border-t border-stone-200 pt-3 text-center text-xs text-stone-400">
          {EMPRESA.nome} · {EMPRESA.sistema} · Gerado em {geradoEm}
        </footer>
      </article>
    </>
  );
}

function Numero({ rotulo, valor, cor = "text-stone-900" }: { rotulo: string; valor: number | string; cor?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 print:p-2">
      <div className="text-xs text-stone-500">{rotulo}</div>
      <div className={`text-2xl font-bold tabular-nums ${cor}`}>{valor}</div>
    </div>
  );
}

function Barras({ titulo, total, itens }: { titulo: string; total: number; itens: { rotulo: string; n: number; cor: string }[] }) {
  return (
    <div className="break-inside-avoid">
      <h3 className="mb-2 text-sm font-semibold">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-sm text-stone-400">—</p>
      ) : (
        <ul className="space-y-1.5">
          {itens.map((i) => (
            <li key={i.rotulo} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="truncate">{i.rotulo}</span>
                <span className="tabular-nums text-stone-600">
                  {i.n} ({Math.round((i.n / total) * 100)}%)
                </span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full" style={{ width: `${(i.n / total) * 100}%`, background: i.cor }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
