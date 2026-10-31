import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, FileSpreadsheet, Flame, Plus, TreePine } from "lucide-react";
import { BarrasHorizontais, ColunasEmpilhadas } from "@/components/Graficos";
import { SeletorMes } from "@/components/SeletorMes";
import { formatarDuracao } from "@/lib/constantes";
import { painelProducao } from "@/lib/indicadores-producao";
import { podeProducao } from "@/lib/permissoes";
import { CENTRO, TIPO_ESTOQUE, fmtM3, fmtNum, fmtPct, formatarDia, hojeSP, mesDe, nomeMes, nomeMesLongo, type Kpis } from "@/lib/producao";
import { mesesComBoletim } from "@/lib/producao-dados";
import { STATUS_EM_ESTOQUE, STATUS_PACOTE } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";
import type { CentroParada } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Indicadores" };

const ABAS = [
  { id: "geral", rotulo: "Visão geral" },
  { id: "paradas", rotulo: "Paradas" },
  { id: "pacotes", rotulo: "Pacotes e estoque" },
  { id: "comparativo", rotulo: "Comparativo mensal" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

type Indice = "oee" | "disponibilidade" | "produtividade" | "qualidade";
const INDICES: { chave: Indice; rotulo: string; formula: string }[] = [
  { chave: "oee", rotulo: "OEE", formula: "Disponibilidade × Produtividade × Qualidade" },
  { chave: "disponibilidade", rotulo: "Disponibilidade", formula: "Tempo produzindo ÷ tempo programado" },
  { chave: "produtividade", rotulo: "Produtividade", formula: "Produção ÷ meta" },
  { chave: "qualidade", rotulo: "Qualidade", formula: "1 − refugo ÷ produção" },
];

/** Diferença em pontos percentuais contra o mês anterior. */
function Variacao({ atual, anterior }: { atual: number | null; anterior: number | null | undefined }) {
  if (atual == null || anterior == null) return <span className="text-xs text-stone-400">sem mês anterior</span>;
  const d = (atual - anterior) * 100;
  if (Math.abs(d) < 0.05) return <span className="text-xs text-stone-500">igual ao mês anterior</span>;
  return (
    <span className={`text-xs font-semibold ${d > 0 ? "text-emerald-700" : "text-rose-700"}`}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. <span className="font-normal text-stone-500">vs. mês anterior</span>
    </span>
  );
}

function Secao({ titulo, subtitulo, children, className = "" }: { titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`cartao min-w-0 ${className}`}>
      <h2 className="font-semibold">{titulo}</h2>
      {subtitulo && <p className="text-xs text-stone-500">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function IndicadoresPage({ searchParams }: { searchParams: Promise<{ mes?: string; aba?: string }> }) {
  const eu = await exigirProducao();
  const atual = mesDe(hojeSP());
  const q = await searchParams;
  const mes = q.mes && /^\d{4}-\d{2}$/.test(q.mes) && q.mes <= atual ? q.mes : atual;
  const aba: Aba = ABAS.some((a) => a.id === q.aba) ? (q.aba as Aba) : "geral";
  const [p, comDados] = await Promise.all([painelProducao(mes, 12), mesesComBoletim()]);
  const k = p.kpis;
  const ant: Kpis | undefined = p.comparativo[p.comparativo.length - 2]?.dias ? p.comparativo[p.comparativo.length - 2].kpis : undefined;
  const ultimoComDados = comDados.find((m) => m !== mes);
  const semBoletins = p.diasLancados === 0;
  const totalParado = k.minutosParados || 1;
  const linkAba = (a: Aba) => `/producao/indicadores?${new URLSearchParams({ ...(mes !== atual ? { mes } : {}), ...(a !== "geral" ? { aba: a } : {}) })}`;

  const vazio = (
    <section className="cartao flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-400">
        <BarChart3 className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold first-letter:uppercase">Nenhum boletim em {nomeMesLongo(mes)}</h2>
      <p className="mt-1 max-w-md text-sm text-stone-500">
        Os indicadores (OEE, disponibilidade, produtividade, qualidade e paradas) são calculados a partir dos boletins da serraria lançados no mês.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {podeProducao(eu, "lancar") && mes === atual && (
          <Link href="/producao/boletins/novo" className="btn-primario">
            <Plus className="h-4 w-4" /> Lançar boletim
          </Link>
        )}
        {ultimoComDados && (
          <Link href={`/producao/indicadores?mes=${ultimoComDados}${aba !== "geral" ? `&aba=${aba}` : ""}`} className="btn-secundario">
            Ver {nomeMesLongo(ultimoComDados)} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho: título, mês e exportação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Indicadores da produção</h1>
          <p className="text-sm text-stone-500">
            Serraria · {p.diasLancados ? `${p.diasLancados} dia(s) lançado(s)` : "nenhum dia lançado"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeletorMes mes={mes} atual={atual} base="/producao/indicadores" extra={{ aba: aba !== "geral" ? aba : undefined }} comDados={comDados} />
          <a href={`/producao/excel?mes=${mes}`} className="btn-secundario px-3 py-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
        </div>
      </div>

      {/* Abas */}
      <nav aria-label="Indicadores" className="-mx-4 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-6">
          {ABAS.map((a) => (
            <li key={a.id}>
              <Link
                href={linkAba(a.id)}
                aria-current={aba === a.id ? "page" : undefined}
                className={`-mb-px block whitespace-nowrap border-b-2 py-2.5 text-sm font-semibold transition ${
                  aba === a.id ? "border-marca-700 text-marca-800" : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                {a.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {aba === "geral" &&
        (semBoletins ? (
          vazio
        ) : (
          <>
            {/* Índices principais em uma faixa só */}
            <section className="cartao grid p-0 sm:grid-cols-2 lg:grid-cols-4">
              {INDICES.map((i, n) => {
                const v = k[i.chave];
                return (
                  <div
                    key={i.chave}
                    className={`px-5 py-4 ${n > 0 ? "border-t border-stone-200 sm:border-t-0" : ""} ${n % 2 === 1 ? "sm:border-l" : ""} ${n === 2 ? "sm:border-t lg:border-t-0" : ""} ${n === 3 ? "sm:border-t lg:border-t-0" : ""} ${n > 0 ? "lg:border-l" : ""} border-stone-200`}
                  >
                    <div className={`text-sm font-semibold ${i.chave === "oee" ? "text-marca-800" : "text-stone-700"}`}>{i.rotulo}</div>
                    <div className="truncate text-[11px] text-stone-400" title={i.formula}>
                      {i.formula}
                    </div>
                    <div className={`mt-1 font-semibold tabular-nums tracking-tight ${i.chave === "oee" ? "text-4xl text-marca-800" : "text-3xl"}`}>{fmtPct(v)}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                      <div className={`h-full rounded-full ${i.chave === "oee" ? "bg-marca-600" : "bg-[#2a78d6]"}`} style={{ width: `${Math.min(1, Math.max(0, v ?? 0)) * 100}%` }} />
                    </div>
                    <div className="mt-2">
                      <Variacao atual={v} anterior={ant?.[i.chave]} />
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Números do mês */}
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 lg:grid-cols-4">
              {[
                {
                  r: "Produção",
                  v: fmtM3(k.producaoM3, 1),
                  d: k.metaM3 ? `${fmtPct(k.producaoM3 / k.metaM3)} da meta de ${fmtM3(k.metaM3, 0)}` : "sem meta definida",
                },
                { r: "Tempo parado", v: formatarDuracao(k.minutosParados), d: `${fmtPct(k.minutosProgramados ? k.minutosParados / k.minutosProgramados : null)} do tempo programado` },
                { r: "Refugo", v: fmtM3(k.refugoM3, 1), d: `${fmtPct(k.producaoM3 ? k.refugoM3 / k.producaoM3 : null)} da produção` },
                { r: "Rendimento", v: fmtPct(k.rendimento), d: k.torasM3 ? `sobre ${fmtM3(k.torasM3, 0)} de toras` : "informe as toras no boletim" },
              ].map((x) => (
                <div key={x.r} className="min-w-0 bg-white px-5 py-3.5">
                  <dt className="text-xs font-medium text-stone-500">{x.r}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{x.v}</dd>
                  <dd className="truncate text-xs text-stone-500">{x.d}</dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-5 lg:grid-cols-3">
              <Secao titulo="Produção diária (m³)" subtitulo="Por tipo, com a meta de cada dia" className="lg:col-span-2">
                <ColunasEmpilhadas
                  titulo="Produção diária por tipo, com a meta do dia"
                  dados={p.diario.map((d) => ({ rotulo: d.dia.slice(8), bom: d.bom, aproveitamento: d.aproveitamento, refugo: d.refugo, meta: d.metaM3 }))}
                  series={[
                    { chave: "bom", rotulo: "Bom" },
                    { chave: "aproveitamento", rotulo: "Aproveitamento" },
                    { chave: "refugo", rotulo: "Refugo" },
                  ]}
                  meta={{ chave: "meta", rotulo: "Meta" }}
                />
              </Secao>
              <Secao titulo="Paradas por centro" subtitulo={`${formatarDuracao(k.minutosParados)} no mês`}>
                <ParadasPorCentro k={k} total={totalParado} />
                <Link href={linkAba("paradas")} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-marca-700 hover:underline">
                  Ver motivos e equipamentos <ArrowRight className="h-4 w-4" />
                </Link>
              </Secao>
            </div>
          </>
        ))}

      {aba === "paradas" &&
        (semBoletins ? (
          vazio
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <Secao titulo="Por centro" subtitulo={`${formatarDuracao(k.minutosParados)} parado no mês`}>
              <ParadasPorCentro k={k} total={totalParado} />
            </Secao>
            <Secao titulo="Pareto dos motivos" subtitulo="O que mais parou a linha (vezes)" className="lg:col-span-2">
              <BarrasHorizontais itens={p.pareto.slice(0, 10).map((x) => ({ rotulo: `${x.rotulo} (${x.ocorrencias}×)`, valor: Math.round(x.minutos) }))} formato="duracao" vazio="Sem paradas no mês." />
            </Secao>
            <Secao titulo="Por equipamento" subtitulo="Tempo parado atribuído a cada máquina da linha" className="lg:col-span-3">
              <BarrasHorizontais itens={p.paradasPorEquipamento.slice(0, 12)} formato="duracao" vazio="Sem paradas com equipamento no mês." />
            </Secao>
          </div>
        ))}

      {aba === "pacotes" && (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 lg:grid-cols-4">
            {[
              { r: "Pacotes formados", v: fmtNum(p.pacotes.formados), d: fmtM3(p.pacotes.m3Formado, 1) },
              { r: "Pacotes expedidos", v: fmtNum(p.pacotes.expedidos), d: fmtM3(p.pacotes.m3Expedido, 1) },
              {
                r: "Rastreados até a floresta",
                v: p.pacotes.formados ? fmtPct(p.pacotes.rastreados / p.pacotes.formados) : "—",
                d: `${p.pacotes.rastreados} de ${p.pacotes.formados} pacotes do mês`,
              },
              { r: "Tempo até a expedição", v: p.pacotes.diasMedioEmEstoque != null ? `${fmtNum(p.pacotes.diasMedioEmEstoque, 1)} dias` : "—", d: "média, da formação à saída" },
            ].map((x) => (
              <div key={x.r} className="min-w-0 bg-white px-5 py-3.5">
                <dt className="truncate text-xs font-medium text-stone-500">{x.r}</dt>
                <dd className="text-xl font-semibold tabular-nums">{x.v}</dd>
                <dd className="truncate text-xs text-stone-500">{x.d}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-5 lg:grid-cols-2">
            <Secao titulo="Pacotes no estoque agora">
              <ul className="space-y-3">
                {STATUS_EM_ESTOQUE.map((s) => {
                  const e = p.pacotes.estoque[s as "VERDE" | "EM_ESTUFA" | "SECO"];
                  const total = Object.values(p.pacotes.estoque).reduce((a, x) => a + (x?.m3 ?? 0), 0) || 1;
                  return (
                    <li key={s}>
                      <Link href={`/producao/pacotes?status=${s}`} className="block hover:opacity-80">
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{STATUS_PACOTE[s].label}</span>
                          <span className="tabular-nums">
                            <b>{fmtNum(e?.qtd ?? 0)}</b> <span className="text-stone-400">· {fmtM3(e?.m3 ?? 0, 1)}</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full" style={{ width: `${((e?.m3 ?? 0) / total) * 100}%`, background: STATUS_PACOTE[s].hex }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Secao>
            <Secao titulo="Expedido por cliente (m³)" subtitulo={`Em ${nomeMesLongo(mes)}`}>
              <BarrasHorizontais itens={p.pacotes.porCliente.slice(0, 8).map((c) => ({ rotulo: c.rotulo, valor: Math.round(c.m3 * 10) / 10 }))} vazio="Nenhuma expedição no mês." />
            </Secao>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Link href="/producao/estufas" className="cartao block hover:border-marca-300">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Flame className="h-4 w-4 text-[#eb6834]" /> Estufas
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{p.estufas.emSecagem}</div>
              <div className="text-sm text-stone-500">em secagem · {fmtM3(p.estufas.m3EmSecagem, 1)}</div>
              <div className="mt-2 text-xs text-stone-500">
                {p.estufas.ciclosConcluidos} ciclo(s) no mês · {fmtM3(p.estufas.m3Seco, 1)} secos
                {p.estufas.horasMediaCiclo != null && ` · média ${formatarDuracao(p.estufas.horasMediaCiclo * 60)}`}
              </div>
            </Link>
            <Link href="/producao/toras" className="cartao block hover:border-marca-300">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TreePine className="h-4 w-4 text-marca-600" /> Toras recebidas no mês
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{fmtNum(p.toras.quantidade)}</div>
              <div className="text-sm text-stone-500">
                em {p.toras.cargas} carga(s){p.toras.m3 > 0 && ` · ≈ ${fmtM3(p.toras.m3, 1)}`}
              </div>
              <div className="mt-2 text-xs text-stone-500">{p.toras.diametroMedio != null ? `Diâmetro médio ${fmtNum(p.toras.diametroMedio, 1)} cm` : "Sem cargas no mês"}</div>
            </Link>
            <Link href="/producao/estoque" className="cartao block hover:border-marca-300">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Boxes className="h-4 w-4 text-[#2a78d6]" /> Último levantamento de estoque
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {p.estoque.map((e, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-stone-500">{TIPO_ESTOQUE[i === 0 ? "VERDE" : "EMPACOTADA"].split(" (")[0]}</span>
                    <span className="tabular-nums">
                      {e ? (
                        <>
                          {fmtM3(e.m3, 1)} <span className="text-xs text-stone-400">em {formatarDia(e.data, { day: "2-digit", month: "2-digit" })}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Link>
          </div>
        </>
      )}

      {aba === "comparativo" &&
        (p.comparativo.every((c) => c.dias === 0) ? (
          vazio
        ) : (
          <>
            <Secao titulo="Produção por mês (m³)" subtitulo="Meses com lançamento (até 12), com a meta acumulada">
              <ColunasEmpilhadas
                titulo="Produção por mês"
                dados={p.comparativo.slice(Math.max(0, p.comparativo.findIndex((c) => c.dias > 0))).map((c) => ({
                  rotulo: nomeMes(c.mes),
                  bom: Math.round(c.kpis.bomM3),
                  aproveitamento: Math.round(c.kpis.aproveitamentoM3),
                  refugo: Math.round(c.kpis.refugoM3),
                  meta: Math.round(c.kpis.metaM3),
                }))}
                series={[
                  { chave: "bom", rotulo: "Bom" },
                  { chave: "aproveitamento", rotulo: "Aproveitamento" },
                  { chave: "refugo", rotulo: "Refugo" },
                ]}
                meta={{ chave: "meta", rotulo: "Meta" }}
              />
            </Secao>
            <section className="cartao min-w-0 p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      {["Mês", "Dias", "Produção", "Meta", "Refugo", "Parado", "Disp.", "Prod.", "Qual.", "OEE", "Rend."].map((c, i) => (
                        <th key={c} className={`px-4 py-3 font-semibold ${i > 0 ? "text-right" : ""}`}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {[...p.comparativo]
                      .reverse()
                      .filter((c) => c.dias > 0 || c.mes === mes)
                      .map((c) => (
                        <tr key={c.mes} className={c.mes === mes ? "bg-marca-50/60 font-medium" : "hover:bg-stone-50"}>
                          <td className="px-4 py-2.5">
                            <Link href={`/producao/indicadores?mes=${c.mes}`} className="hover:underline">
                              {nomeMes(c.mes)}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{c.dias}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(c.kpis.producaoM3, 1)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(c.kpis.metaM3, 1)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(c.kpis.refugoM3, 1)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatarDuracao(c.kpis.minutosParados)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(c.kpis.disponibilidade)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(c.kpis.produtividade)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(c.kpis.qualidade)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-marca-800">{fmtPct(c.kpis.oee)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(c.kpis.rendimento)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">Produção, meta e refugo em m³. Índices calculados sobre os totais de cada mês.</p>
            </section>
          </>
        ))}
    </div>
  );
}

function ParadasPorCentro({ k, total }: { k: Kpis; total: number }) {
  return (
    <ul className="space-y-3">
      {(Object.keys(CENTRO) as CentroParada[]).map((c) => {
        const v = k.paradoPorCentro[c];
        return (
          <li key={c}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{CENTRO[c].label}</span>
              <span className="tabular-nums">
                <b>{formatarDuracao(v)}</b> <span className="text-stone-400">· {fmtPct(k.minutosParados ? v / total : null)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: CENTRO[c].hex }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
