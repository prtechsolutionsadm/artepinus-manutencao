"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatarDuracao } from "@/lib/constantes";

// Paleta categórica validada (light): azul, laranja, verde-água — nesta ordem fixa.
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
const GRADE = "#e7e5e4";

function ticks(maximo: number) {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? mag * 10;
  const lista = [];
  for (let v = 0; v <= maximo + passo * 0.001; v += passo) lista.push(Math.round(v * 100) / 100);
  if (lista[lista.length - 1] < maximo) lista.push(lista[lista.length - 1] + passo);
  return lista;
}

type Serie = { chave: string; rotulo: string };

/** Colunas empilhadas por categoria (ex.: mês) com legenda, dica ao passar o mouse e tabela. */
export function ColunasEmpilhadas({
  dados,
  series,
  titulo,
  meta,
}: {
  dados: ({ rotulo: string } & Record<string, number | string>)[];
  series: Serie[];
  titulo: string;
  /** Marca de referência por coluna (ex.: meta do dia). */
  meta?: Serie;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  // Desenha na largura real (px): o texto mantém o tamanho em qualquer tela
  const caixa = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabela]);
  const totais = dados.map((d) => Math.round(series.reduce((t, s) => t + Number(d[s.chave] ?? 0), 0) * 100) / 100);
  const metas = meta ? dados.map((d) => Number(d[meta.chave] ?? 0)) : [];
  const escala = ticks(Math.max(...totais, ...metas, 1));
  const topo = escala[escala.length - 1];
  // Margem esquerda conforme o tamanho do maior número do eixo
  const H = W < 480 ? 200 : 240, ESQ = Math.max(28, 12 + String(topo).length * 7), BASE = H - 24, ALTURA = BASE - 8;
  const banda = (W - ESQ) / Math.max(dados.length, 1);
  const pularRotulo = banda < 34 ? Math.ceil(34 / banda) : 1;
  const largura = Math.min(24, banda * 0.6);
  const y = (v: number) => BASE - (v / topo) * ALTURA;

  return (
    <figure className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600" aria-label="Legenda">
          {series.map((s, i) => (
            <li key={s.chave} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i] }} />
              {s.rotulo}
            </li>
          ))}
          {meta && (
            <li className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-stone-800" />
              {meta.rotulo}
            </li>
          )}
        </ul>
        <button type="button" onClick={() => setTabela(!tabela)} className="text-xs font-medium text-marca-700 hover:underline">
          {tabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {tabela ? (
        <Tabela
          cabecalho={["", ...series.map((s) => s.rotulo), "Total", ...(meta ? [meta.rotulo] : [])]}
          linhas={dados.map((d, i) => [d.rotulo, ...series.map((s) => String(d[s.chave] ?? 0)), String(totais[i]), ...(meta ? [String(metas[i])] : [])])}
        />
      ) : (
        <div className="relative w-full min-w-0 overflow-hidden" ref={caixa}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={titulo} onMouseLeave={() => setAtivo(null)}>
            {escala.map((t) => (
              <g key={t}>
                <line x1={ESQ} x2={W} y1={y(t)} y2={y(t)} stroke={GRADE} strokeWidth={1} />
                <text x={ESQ - 6} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-stone-400">
                  {t}
                </text>
              </g>
            ))}
            {dados.map((d, i) => {
              const cx = ESQ + banda * i + banda / 2;
              let acumulado = 0;
              const segs = series.map((s, si) => {
                const v = Number(d[s.chave] ?? 0);
                const y1 = y(acumulado), y0 = y(acumulado + v);
                acumulado += v;
                return { v, si, y0, y1 };
              }).filter((s) => s.v > 0);
              return (
                <g key={d.rotulo} onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} tabIndex={0} className="outline-none">
                  <rect x={cx - banda / 2} y={0} width={banda} height={BASE} fill={ativo === i ? "#f5f5f4" : "transparent"} />
                  {segs.map((s, n) => {
                    const ultimo = n === segs.length - 1;
                    const h = Math.max(0, s.y1 - s.y0 - (ultimo ? 0 : 2)); // 2px de respiro entre segmentos
                    const yTopo = s.y0 + (ultimo ? 0 : 2);
                    const r = ultimo ? Math.min(4, h) : 0;
                    const x = cx - largura / 2;
                    const path = `M${x},${yTopo + h} V${yTopo + r} Q${x},${yTopo} ${x + r},${yTopo} H${x + largura - r} Q${x + largura},${yTopo} ${x + largura},${yTopo + r} V${yTopo + h} Z`;
                    return <path key={s.si} d={path} fill={SERIES[s.si]} />;
                  })}
                  {meta && metas[i] > 0 && (
                    <line x1={cx - Math.min(banda * 0.45, largura * 0.9)} x2={cx + Math.min(banda * 0.45, largura * 0.9)} y1={y(metas[i])} y2={y(metas[i])} stroke="#292524" strokeWidth={2} strokeLinecap="round" />
                  )}
                  {i % pularRotulo === 0 && (
                    <text x={cx} y={H - 7} textAnchor="middle" fontSize={11} className="fill-stone-500">
                      {d.rotulo}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={ESQ} x2={W} y1={BASE} y2={BASE} stroke="#d6d3d1" strokeWidth={1} />
          </svg>
          {ativo !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-36 -translate-x-1/2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${((ESQ + banda * ativo + banda / 2) / W) * 100}%` }}
            >
              <div className="mb-1 font-semibold text-stone-900">{dados[ativo].rotulo}</div>
              {series.map((s, i) => (
                <div key={s.chave} className="flex items-center justify-between gap-4 text-stone-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: SERIES[i] }} />
                    {s.rotulo}
                  </span>
                  <span className="font-medium tabular-nums text-stone-900">{dados[ativo][s.chave]}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-stone-100 pt-1 text-stone-600">
                Total <span className="font-semibold tabular-nums text-stone-900">{totais[ativo]}</span>
              </div>
              {meta && (
                <div className="flex justify-between text-stone-600">
                  {meta.rotulo} <span className="font-medium tabular-nums text-stone-900">{metas[ativo]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

type Item = { rotulo: string; valor: number; href?: string };

/** Barras horizontais de uma série (rankings). O valor vai na ponta da barra. */
export function BarrasHorizontais({ itens, formato = "numero", vazio = "Sem dados no período." }: { itens: Item[]; formato?: "numero" | "duracao"; vazio?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  if (itens.length === 0) return <p className="py-6 text-center text-sm text-stone-400">{vazio}</p>;
  const maximo = Math.max(...itens.map((i) => i.valor), 1);
  const fmt = (v: number) => (formato === "duracao" ? formatarDuracao(v) : String(v));
  return (
    <ul className="space-y-2.5" onMouseLeave={() => setAtivo(null)}>
      {itens.map((item, i) => {
        const conteudo = (
          <>
            <div className="mb-1 flex justify-between gap-3 text-xs">
              <span className={`truncate ${ativo === i ? "text-stone-900" : "text-stone-600"}`}>{item.rotulo}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 flex-1">
                <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(2, (item.valor / maximo) * 100)}%`, background: SERIES[0], opacity: ativo === null || ativo === i ? 1 : 0.55 }} />
              </div>
              <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-stone-900">{fmt(item.valor)}</span>
            </div>
          </>
        );
        return (
          <li key={item.rotulo} onMouseEnter={() => setAtivo(i)}>
            {item.href ? (
              <Link href={item.href} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-marca-500">
                {conteudo}
              </Link>
            ) : (
              conteudo
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            {cabecalho.map((c) => (
              <th key={c} className="px-2 py-1.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l[0]} className="border-b border-stone-100">
              {l.map((c, i) => (
                <td key={i} className={`px-2 py-1.5 tabular-nums ${i === 0 ? "text-stone-700" : "text-stone-900"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
