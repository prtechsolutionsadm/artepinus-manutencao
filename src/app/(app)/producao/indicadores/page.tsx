import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, Flame, Package, Plus, TreePine, Boxes } from "lucide-react";
import { BarrasHorizontais, ColunasEmpilhadas } from "@/components/Graficos";
import { BotaoLink, Titulo, Vazio } from "@/components/ui";
import { formatarDuracao } from "@/lib/constantes";
import { painelProducao } from "@/lib/indicadores-producao";
import { podeProducao } from "@/lib/permissoes";
import { CENTRO, TIPO_ESTOQUE, fmtM3, fmtNum, fmtPct, formatarDia, hojeSP, mesDe, mesesAntes, nomeMes, type Kpis } from "@/lib/producao";
import { STATUS_EM_ESTOQUE, STATUS_PACOTE } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";
import type { CentroParada } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Indicadores de produção" };

type Indice = "disponibilidade" | "produtividade" | "qualidade" | "oee";

function Variacao({ atual, anterior, pontos = true }: { atual: number | null; anterior: number | null; pontos?: boolean }) {
  if (atual == null || anterior == null) return null;
  const d = pontos ? (atual - anterior) * 100 : anterior ? (atual / anterior - 1) * 100 : null;
  if (d == null || !Number.isFinite(d) || Math.abs(d) < 0.05) return <span className="text-xs text-stone-400">= mês anterior</span>;
  const sobe = d > 0;
  return (
    <span className={`text-xs font-medium ${sobe ? "text-emerald-700" : "text-rose-700"}`}>
      {sobe ? "▲" : "▼"} {Math.abs(d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      {pontos ? " p.p." : "%"} vs. mês anterior
    </span>
  );
}

function Medidor({ rotulo, valor, anterior, ajuda }: { rotulo: string; valor: number | null; anterior: number | null; ajuda: string }) {
  const pct = valor == null ? 0 : Math.min(1, Math.max(0, valor));
  return (
    <div className="cartao py-4">
      <div className="text-xs font-medium text-stone-500" title={ajuda}>
        {rotulo}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{fmtPct(valor)}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
        <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="mt-2 min-h-4">
        <Variacao atual={valor} anterior={anterior} />
      </div>
    </div>
  );
}

export default async function PainelProducaoPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const eu = await exigirProducao();
  const atual = mesDe(hojeSP());
  const { mes: q } = await searchParams;
  const mes = q && /^\d{4}-\d{2}$/.test(q) && q <= atual ? q : atual;
  const p = await painelProducao(mes);
  const k = p.kpis;
  const ant: Kpis | undefined = p.comparativo[p.comparativo.length - 2]?.kpis;
  const meses = Array.from({ length: 12 }, (_, i) => mesesAntes(atual, i));

  const indices: { chave: Indice; rotulo: string; ajuda: string }[] = [
    { chave: "oee", rotulo: "OEE", ajuda: "Disponibilidade × Produtividade × Qualidade" },
    { chave: "disponibilidade", rotulo: "Disponibilidade", ajuda: "(Tempo programado − paradas) ÷ tempo programado" },
    { chave: "produtividade", rotulo: "Produtividade", ajuda: "Produção (m³) ÷ meta (m³)" },
    { chave: "qualidade", rotulo: "Qualidade", ajuda: "1 − refugo ÷ produção" },
  ];
  const totalParado = k.minutosParados || 1;

  return (
    <>
      <Titulo
        subtitulo={`Serraria · ${p.diasLancados} dia(s) lançado(s) em ${nomeMes(mes)}`}
        acao={
          <div className="flex flex-wrap gap-2">
            <a href={`/producao/excel?mes=${mes}`} className="btn-secundario">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </a>
            {podeProducao(eu, "lancar") && (
              <BotaoLink href="/producao/boletins/novo">
                <Plus className="h-4 w-4" /> Novo boletim
              </BotaoLink>
            )}
          </div>
        }
      >
        Painel de produção
      </Titulo>

      <form className="mb-5 flex items-center gap-2" action="/producao/indicadores">
        <label htmlFor="mes" className="mb-0 text-sm text-stone-500">
          Mês
        </label>
        <select id="mes" name="mes" defaultValue={mes} className="campo w-auto py-1.5">
          {meses.map((m) => (
            <option key={m} value={m}>
              {nomeMes(m)}
            </option>
          ))}
        </select>
        <button className="btn-secundario px-3 py-1.5 text-sm">Ver</button>
      </form>

      {p.diasLancados === 0 && (
        <div className="mb-6">
          <Vazio>
            Nenhum boletim lançado em {nomeMes(mes)}.{" "}
            {podeProducao(eu, "lancar") && (
              <Link href="/producao/boletins/novo" className="font-medium text-marca-700 underline">
                Lançar o primeiro
              </Link>
            )}
          </Vazio>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {indices.map((i) => (
          <Medidor key={i.chave} rotulo={i.rotulo} valor={k[i.chave]} anterior={ant?.[i.chave] ?? null} ajuda={i.ajuda} />
        ))}
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { r: "Produção", v: fmtM3(k.producaoM3), d: <>meta {fmtM3(k.metaM3)}</> },
          { r: "Tempo parado", v: formatarDuracao(k.minutosParados), d: <>de {formatarDuracao(k.minutosProgramados)} programados</> },
          { r: "Refugo", v: fmtM3(k.refugoM3), d: <>aproveitamento {fmtM3(k.aproveitamentoM3)}</> },
          { r: "Rendimento", v: fmtPct(k.rendimento), d: <>{k.torasM3 ? `de ${fmtM3(k.torasM3)} em toras` : "informe as toras no boletim"}</> },
        ].map((x) => (
          <div key={x.r} className="cartao py-3">
            <dt className="text-xs text-stone-500">{x.r}</dt>
            <dd className="text-lg font-semibold tabular-nums">{x.v}</dd>
            <dd className="text-xs text-stone-500">{x.d}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <section className="cartao min-w-0 lg:col-span-3">
          <h2 className="mb-3 font-semibold">Produção diária (m³)</h2>
          {p.diario.length ? (
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
          ) : (
            <p className="py-6 text-center text-sm text-stone-400">Sem dados no mês.</p>
          )}
        </section>
        <section className="cartao min-w-0 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Paradas por centro</h2>
          <ul className="space-y-3">
            {(Object.keys(CENTRO) as CentroParada[]).map((c) => {
              const v = k.paradoPorCentro[c];
              return (
                <li key={c}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{CENTRO[c].label}</span>
                    <span className="tabular-nums">
                      <b>{formatarDuracao(v)}</b> <span className="text-stone-400">· {fmtPct(k.minutosParados ? v / totalParado : null)}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full" style={{ width: `${(v / totalParado) * 100}%`, background: CENTRO[c].hex }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-stone-500">
            Paradas mecânicas e elétricas podem virar requisição de manutenção direto do boletim.
          </p>
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="cartao min-w-0">
          <h2 className="mb-1 font-semibold">Pareto das paradas</h2>
          <p className="mb-3 text-xs text-stone-500">Motivos que mais pararam a linha no mês</p>
          <BarrasHorizontais itens={p.pareto.slice(0, 10).map((x) => ({ rotulo: `${x.rotulo} (${x.ocorrencias}×)`, valor: Math.round(x.minutos) }))} formato="duracao" vazio="Sem paradas no mês." />
        </section>
        <section className="cartao min-w-0">
          <h2 className="mb-1 font-semibold">Paradas por equipamento</h2>
          <p className="mb-3 text-xs text-stone-500">Tempo parado atribuído a cada máquina da linha</p>
          <BarrasHorizontais itens={p.paradasPorEquipamento.slice(0, 10)} formato="duracao" vazio="Sem paradas com equipamento no mês." />
        </section>
      </div>

      <section className="cartao mb-6 min-w-0 p-0">
        <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">Comparativo mensal</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                {["Mês", "Dias", "Produção", "Meta", "Refugo", "Parado", "Disp.", "Prod.", "Qual.", "OEE", "Rend."].map((c, i) => (
                  <th key={c} className={`px-3 py-2 font-semibold ${i > 0 ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[...p.comparativo].reverse().filter((c) => c.dias > 0 || c.mes === mes).map((c) => (
                <tr key={c.mes} className={c.mes === mes ? "bg-marca-50/50 font-medium" : ""}>
                  <td className="px-3 py-2">
                    <Link href={`/producao/indicadores?mes=${c.mes}`} className="hover:underline">
                      {nomeMes(c.mes)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.dias}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(c.kpis.producaoM3, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(c.kpis.metaM3, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(c.kpis.refugoM3, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatarDuracao(c.kpis.minutosParados)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c.kpis.disponibilidade)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c.kpis.produtividade)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c.kpis.qualidade)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtPct(c.kpis.oee)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c.kpis.rendimento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-stone-500">Produção, meta e refugo em m³. Índices calculados sobre os totais do mês.</p>
      </section>

      <section className="cartao mb-6 min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Package className="h-4 w-4 text-marca-600" /> Pacotes e expedição
          </h2>
          <Link href="/producao/pacotes" className="text-sm font-medium text-marca-700 hover:underline">
            Ver pacotes
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { r: "Formados no mês", v: fmtNum(p.pacotes.formados), d: fmtM3(p.pacotes.m3Formado, 1) },
            { r: "Expedidos no mês", v: fmtNum(p.pacotes.expedidos), d: fmtM3(p.pacotes.m3Expedido, 1) },
            {
              r: "Rastreados até a floresta",
              v: p.pacotes.formados ? fmtPct(p.pacotes.rastreados / p.pacotes.formados) : "—",
              d: `${p.pacotes.rastreados} de ${p.pacotes.formados} pacotes do mês`,
            },
            {
              r: "Tempo até a expedição",
              v: p.pacotes.diasMedioEmEstoque != null ? `${fmtNum(p.pacotes.diasMedioEmEstoque, 1)} dias` : "—",
              d: "média, da formação à saída",
            },
          ].map((x) => (
            <div key={x.r} className="min-w-0 rounded-xl bg-stone-50 px-3 py-2">
              <dt className="truncate text-xs text-stone-500">{x.r}</dt>
              <dd className="text-lg font-semibold tabular-nums">{x.v}</dd>
              <dd className="truncate text-xs text-stone-500">{x.d}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-stone-600">Estoque de pacotes agora</h3>
            <ul className="space-y-2">
              {STATUS_EM_ESTOQUE.map((s) => {
                const e = p.pacotes.estoque[s as "VERDE" | "EM_ESTUFA" | "SECO"];
                const total = Object.values(p.pacotes.estoque).reduce((a, x) => a + (x?.m3 ?? 0), 0) || 1;
                return (
                  <li key={s}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{STATUS_PACOTE[s].label}</span>
                      <span className="tabular-nums">
                        <b>{fmtNum(e?.qtd ?? 0)}</b> <span className="text-stone-400">· {fmtM3(e?.m3 ?? 0, 1)}</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full" style={{ width: `${((e?.m3 ?? 0) / total) * 100}%`, background: STATUS_PACOTE[s].hex }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-stone-600">Expedido por cliente (m³)</h3>
            <BarrasHorizontais itens={p.pacotes.porCliente.slice(0, 8).map((c) => ({ rotulo: c.rotulo, valor: Math.round(c.m3 * 10) / 10 }))} vazio="Nenhuma expedição no mês." />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/producao/estufas" className="cartao block hover:border-marca-300">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Flame className="h-4 w-4 text-[#eb6834]" /> Estufas
          </div>
          <div className="text-2xl font-bold tabular-nums">{p.estufas.emSecagem}</div>
          <div className="text-sm text-stone-500">em secagem · {fmtM3(p.estufas.m3EmSecagem)}</div>
          <div className="mt-2 text-xs text-stone-500">
            {p.estufas.ciclosConcluidos} ciclo(s) concluído(s) no mês · {fmtM3(p.estufas.m3Seco)} secos
            {p.estufas.horasMediaCiclo != null && ` · média ${formatarDuracao(p.estufas.horasMediaCiclo * 60)}`}
          </div>
        </Link>
        <Link href="/producao/toras" className="cartao block hover:border-marca-300">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <TreePine className="h-4 w-4 text-marca-600" /> Toras recebidas
          </div>
          <div className="text-2xl font-bold tabular-nums">{fmtNum(p.toras.quantidade)}</div>
          <div className="text-sm text-stone-500">
            em {p.toras.cargas} carga(s){p.toras.m3 > 0 && ` · ≈ ${fmtM3(p.toras.m3, 1)}`}
          </div>
          <div className="mt-2 text-xs text-stone-500">{p.toras.diametroMedio != null ? `Diâmetro médio ${fmtNum(p.toras.diametroMedio, 1)} cm` : "Sem cargas no mês"}</div>
        </Link>
        <Link href="/producao/estoque" className="cartao block hover:border-marca-300">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Boxes className="h-4 w-4 text-[#2a78d6]" /> Estoque (último levantamento)
          </div>
          <ul className="space-y-1 text-sm">
            {p.estoque.map((e, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-stone-500">{TIPO_ESTOQUE[i === 0 ? "VERDE" : "EMPACOTADA"].split(" (")[0]}</span>
                <span className="tabular-nums">{e ? <>{fmtM3(e.m3, 1)} <span className="text-xs text-stone-400">em {formatarDia(e.data, { day: "2-digit", month: "2-digit" })}</span></> : "—"}</span>
              </li>
            ))}
          </ul>
        </Link>
      </div>
    </>
  );
}
