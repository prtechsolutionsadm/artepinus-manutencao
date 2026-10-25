"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2 } from "lucide-react";
import { salvarBoletim, type DadosBoletim } from "@/app/actions/producao";
import { CENTRO, MERCADO, TIPO_PRODUTO, calcularKpis, fmtM3, fmtPct, hojeSP, m3Pecas, mesDe } from "@/lib/producao";
import { formatarDuracao } from "@/lib/constantes";
import type { CentroParada, Mercado, TipoProduto } from "@/generated/prisma/enums";

export type MotivoOpcao = { id: string; codigo: number; descricao: string; centro: CentroParada; equipamentoId: string | null };
export type EquipamentoOpcao = { id: string; codigo: string; nome: string };
type Meta = { metaDiariaM3: number; horasDia: number };

type Item = { k: number; tipo: TipoProduto; mercado: Mercado; espessura: string; largura: string; comprimento: string; pecas: string };
type Parada = {
  k: number;
  motivoId: string;
  equipamentoId: string;
  centro: CentroParada;
  ocorrencias: string;
  minutos: string;
  descricao: string;
  requisicaoId: number | null;
};

export type BoletimInicial = {
  id?: string;
  data: string;
  metaM3: number;
  horasProgramadas: number;
  torasQtd: number | null;
  torasM3: number | null;
  diametroMedio: number | null;
  comprimentoMedio: number | null;
  observacoes: string | null;
  itens: { tipo: TipoProduto; mercado: Mercado; espessura: number; largura: number; comprimento: number; pecas: number }[];
  paradas: { motivoId: string | null; equipamentoId: string | null; centro: CentroParada; ocorrencias: number; minutos: number; descricao: string | null; requisicaoId: number | null }[];
};

let seq = 0;
const novaChave = () => ++seq;
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const txt = (n: number | null | undefined) => (n == null ? "" : String(n));

export function FormBoletim({
  inicial,
  motivos,
  equipamentos,
  metas,
}: {
  inicial: BoletimInicial | null;
  motivos: MotivoOpcao[];
  equipamentos: EquipamentoOpcao[];
  metas: Record<string, Meta>;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const metaDe = (dia: string) => metas[mesDe(dia)] ?? null;
  const hoje = hojeSP();
  const [data, setData] = useState(inicial?.data ?? hoje);
  const [metaM3, setMetaM3] = useState(txt(inicial?.metaM3 ?? metaDe(hoje)?.metaDiariaM3));
  const [horas, setHoras] = useState(txt(inicial?.horasProgramadas ?? metaDe(hoje)?.horasDia ?? 8.8));
  const [metaEditada, setMetaEditada] = useState(!!inicial);
  const [torasQtd, setTorasQtd] = useState(txt(inicial?.torasQtd));
  const [torasM3, setTorasM3] = useState(txt(inicial?.torasM3));
  const [diametro, setDiametro] = useState(txt(inicial?.diametroMedio));
  const [comprimentoToras, setComprimentoToras] = useState(txt(inicial?.comprimentoMedio));
  const [obs, setObs] = useState(inicial?.observacoes ?? "");

  const [itens, setItens] = useState<Item[]>(() =>
    (inicial?.itens ?? []).map((i) => ({
      k: novaChave(),
      tipo: i.tipo,
      mercado: i.mercado,
      espessura: String(i.espessura),
      largura: String(i.largura),
      comprimento: String(i.comprimento),
      pecas: String(i.pecas),
    })),
  );
  const [paradas, setParadas] = useState<Parada[]>(() =>
    (inicial?.paradas ?? []).map((p) => ({
      k: novaChave(),
      motivoId: p.motivoId ?? "",
      equipamentoId: p.equipamentoId ?? "",
      centro: p.centro,
      ocorrencias: String(p.ocorrencias),
      minutos: String(p.minutos),
      descricao: p.descricao ?? "",
      requisicaoId: p.requisicaoId,
    })),
  );

  const motivoPorId = useMemo(() => new Map(motivos.map((m) => [m.id, m])), [motivos]);
  const motivosPorCentro = useMemo(() => {
    const g: Record<CentroParada, MotivoOpcao[]> = { MEC: [], ELE: [], OPE: [] };
    for (const m of motivos) g[m.centro].push(m);
    return g;
  }, [motivos]);

  const m3Item = (i: Item) => {
    const v = [num(i.espessura), num(i.largura), num(i.comprimento), num(i.pecas)];
    return v.every((x) => Number.isFinite(x) && x > 0) ? m3Pecas(v[0], v[1], v[2], v[3]) : 0;
  };

  const kpis = calcularKpis([
    {
      metaM3: num(metaM3) || 0,
      horasProgramadas: num(horas) || 0,
      torasM3: num(torasM3) || 0,
      itens: itens.map((i) => ({ tipo: i.tipo, m3: m3Item(i) })),
      paradas: paradas.map((p) => ({ centro: p.centro, minutos: num(p.minutos) || 0 })),
    },
  ]);

  function trocarData(d: string) {
    setData(d);
    const m = metaDe(d);
    if (!metaEditada && m) {
      setMetaM3(String(m.metaDiariaM3));
      setHoras(String(m.horasDia));
    }
  }

  const mudarItem = (k: number, campo: keyof Item, v: string) => setItens((l) => l.map((i) => (i.k === k ? { ...i, [campo]: v } : i)));
  const mudarParada = (k: number, mud: Partial<Parada>) => setParadas((l) => l.map((p) => (p.k === k ? { ...p, ...mud } : p)));

  function addItem(base?: Item) {
    const ultimo = base ?? itens[itens.length - 1];
    setItens((l) => [
      ...l,
      ultimo
        ? { ...ultimo, k: novaChave(), pecas: "" }
        : { k: novaChave(), tipo: "BOM", mercado: "EXTERNO", espessura: "", largura: "", comprimento: "", pecas: "" },
    ]);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const payload: DadosBoletim = {
      id: inicial?.id ?? null,
      data,
      metaM3,
      horasProgramadas: horas.replace(",", "."),
      torasQtd,
      torasM3: torasM3.replace(",", "."),
      diametroMedio: diametro.replace(",", "."),
      comprimentoMedio: comprimentoToras.replace(",", "."),
      observacoes: obs,
      itens: itens
        .filter((i) => i.espessura || i.largura || i.comprimento || i.pecas)
        .map(({ tipo, mercado, espessura, largura, comprimento, pecas }) => ({ tipo, mercado, espessura, largura, comprimento, pecas })),
      paradas: paradas
        .filter((p) => p.minutos || p.motivoId)
        .map((p) => ({
          motivoId: p.motivoId,
          equipamentoId: p.equipamentoId,
          centro: p.centro,
          ocorrencias: p.ocorrencias || 1,
          minutos: p.minutos.replace(",", "."),
          descricao: p.descricao,
          requisicaoId: p.requisicaoId,
        })),
    };
    iniciar(async () => {
      const r = await salvarBoletim(payload);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      router.push(`/producao/boletins/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset disabled={pendente} className="min-w-0 space-y-6">
        <section className="cartao">
          <h2 className="mb-3 font-semibold">Dia e meta</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="b-data">Data *</label>
              <input id="b-data" type="date" required max={hoje} value={data} onChange={(e) => trocarData(e.target.value)} className="campo" />
            </div>
            <div>
              <label htmlFor="b-meta">Meta (m³) *</label>
              <input id="b-meta" inputMode="decimal" required value={metaM3} onChange={(e) => (setMetaM3(e.target.value), setMetaEditada(true))} className="campo" />
            </div>
            <div>
              <label htmlFor="b-horas">Horas programadas *</label>
              <input id="b-horas" inputMode="decimal" required value={horas} onChange={(e) => (setHoras(e.target.value), setMetaEditada(true))} className="campo" />
            </div>
          </div>
          <details className="mt-4" open={!!(torasQtd || torasM3)}>
            <summary className="cursor-pointer text-sm font-medium text-marca-700">Toras consumidas no dia (para o rendimento)</summary>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="b-tq">Quantidade</label>
                <input id="b-tq" inputMode="numeric" value={torasQtd} onChange={(e) => setTorasQtd(e.target.value)} className="campo" />
              </div>
              <div>
                <label htmlFor="b-tm">Volume (m³)</label>
                <input id="b-tm" inputMode="decimal" value={torasM3} onChange={(e) => setTorasM3(e.target.value)} className="campo" />
              </div>
              <div>
                <label htmlFor="b-td">Diâmetro médio (cm)</label>
                <input id="b-td" inputMode="decimal" value={diametro} onChange={(e) => setDiametro(e.target.value)} className="campo" />
              </div>
              <div>
                <label htmlFor="b-tc">Comprimento médio (m)</label>
                <input id="b-tc" inputMode="decimal" value={comprimentoToras} onChange={(e) => setComprimentoToras(e.target.value)} className="campo" />
              </div>
            </div>
          </details>
        </section>

        <section className="cartao">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Produção por bitola</h2>
            <span className="text-sm text-stone-500">Medidas em milímetros · m³ calculado</span>
          </div>
          {itens.length === 0 && <p className="mb-3 text-sm text-stone-500">Nenhuma bitola lançada.</p>}
          <ul className="space-y-3">
            {itens.map((i, n) => (
              <li key={i.k} className="rounded-xl border border-stone-200 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-2">
                    <label htmlFor={`i-t-${i.k}`}>Tipo</label>
                    <select id={`i-t-${i.k}`} value={i.tipo} onChange={(e) => mudarItem(i.k, "tipo", e.target.value)} className="campo">
                      {(Object.keys(TIPO_PRODUTO) as TipoProduto[]).map((t) => (
                        <option key={t} value={t}>
                          {TIPO_PRODUTO[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`i-m-${i.k}`}>Mercado</label>
                    <select id={`i-m-${i.k}`} value={i.mercado} onChange={(e) => mudarItem(i.k, "mercado", e.target.value)} className="campo">
                      {(Object.keys(MERCADO) as Mercado[]).map((m) => (
                        <option key={m} value={m}>
                          {m === "EXTERNO" ? "Externo" : "Interno"}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(
                    [
                      ["espessura", "Espessura"],
                      ["largura", "Largura"],
                      ["comprimento", "Comprimento"],
                      ["pecas", "Peças"],
                    ] as const
                  ).map(([campo, rotulo]) => (
                    <div key={campo} className="sm:col-span-2">
                      <label htmlFor={`i-${campo}-${i.k}`}>{rotulo}</label>
                      <input
                        id={`i-${campo}-${i.k}`}
                        inputMode="numeric"
                        required
                        value={i[campo]}
                        onChange={(e) => mudarItem(i.k, campo, e.target.value.replace(/\D/g, ""))}
                        className="campo"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium tabular-nums text-stone-700">
                    {n + 1}. {fmtM3(m3Item(i), 4)}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" onClick={() => addItem(i)} className="btn-secundario px-2 py-1 text-xs" title="Repetir esta bitola">
                      <Copy className="h-3.5 w-3.5" /> Repetir
                    </button>
                    <button type="button" onClick={() => setItens((l) => l.filter((x) => x.k !== i.k))} className="btn-secundario px-2 py-1 text-xs text-rose-700" aria-label={`Remover bitola ${n + 1}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => addItem()} className="btn-secundario mt-3">
            <Plus className="h-4 w-4" /> Adicionar bitola
          </button>
        </section>

        <section className="cartao">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Paradas da linha</h2>
            <span className="text-sm text-stone-500">Total: {formatarDuracao(kpis.minutosParados)}</span>
          </div>
          {paradas.length === 0 && <p className="mb-3 text-sm text-stone-500">Nenhuma parada lançada.</p>}
          <ul className="space-y-3">
            {paradas.map((p, n) => (
              <li key={p.k} className="rounded-xl border border-stone-200 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
                  <div className="col-span-2 sm:col-span-5">
                    <label htmlFor={`p-m-${p.k}`}>Motivo</label>
                    <select
                      id={`p-m-${p.k}`}
                      value={p.motivoId}
                      onChange={(e) => {
                        const m = motivoPorId.get(e.target.value);
                        mudarParada(p.k, { motivoId: e.target.value, ...(m ? { centro: m.centro, equipamentoId: m.equipamentoId ?? p.equipamentoId } : {}) });
                      }}
                      className="campo"
                    >
                      <option value="">— Outro (descrever) —</option>
                      {(Object.keys(motivosPorCentro) as CentroParada[]).map((c) => (
                        <optgroup key={c} label={CENTRO[c].label}>
                          {motivosPorCentro[c].map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.codigo} · {m.descricao}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`p-c-${p.k}`}>Centro</label>
                    <select id={`p-c-${p.k}`} value={p.centro} onChange={(e) => mudarParada(p.k, { centro: e.target.value as CentroParada })} className="campo">
                      {(Object.keys(CENTRO) as CentroParada[]).map((c) => (
                        <option key={c} value={c}>
                          {CENTRO[c].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`p-e-${p.k}`}>Equipamento</label>
                    <select id={`p-e-${p.k}`} value={p.equipamentoId} onChange={(e) => mudarParada(p.k, { equipamentoId: e.target.value })} className="campo">
                      <option value="">—</option>
                      {equipamentos.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label htmlFor={`p-o-${p.k}`}>Vezes</label>
                    <input id={`p-o-${p.k}`} inputMode="numeric" value={p.ocorrencias} onChange={(e) => mudarParada(p.k, { ocorrencias: e.target.value.replace(/\D/g, "") })} className="campo" />
                  </div>
                  <div className="sm:col-span-1">
                    <label htmlFor={`p-t-${p.k}`}>Min.</label>
                    <input id={`p-t-${p.k}`} inputMode="decimal" required value={p.minutos} onChange={(e) => mudarParada(p.k, { minutos: e.target.value })} className="campo" />
                  </div>
                  <div className="col-span-2 sm:col-span-12">
                    <label htmlFor={`p-d-${p.k}`}>Observação {p.motivoId ? "" : "*"}</label>
                    <input
                      id={`p-d-${p.k}`}
                      required={!p.motivoId}
                      value={p.descricao}
                      onChange={(e) => mudarParada(p.k, { descricao: e.target.value })}
                      placeholder="O que aconteceu"
                      className="campo"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="text-stone-500">
                    {n + 1}. {CENTRO[p.centro].curto} · {formatarDuracao(num(p.minutos) || 0)}
                    {p.requisicaoId ? " · requisição aberta" : ""}
                  </span>
                  <button type="button" onClick={() => setParadas((l) => l.filter((x) => x.k !== p.k))} className="btn-secundario px-2 py-1 text-xs text-rose-700" aria-label={`Remover parada ${n + 1}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              setParadas((l) => [...l, { k: novaChave(), motivoId: "", equipamentoId: "", centro: "OPE", ocorrencias: "1", minutos: "", descricao: "", requisicaoId: null }])
            }
            className="btn-secundario mt-3"
          >
            <Plus className="h-4 w-4" /> Adicionar parada
          </button>
        </section>

        <section className="cartao">
          <label htmlFor="b-obs">Observações do dia</label>
          <textarea id="b-obs" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} className="campo" />
        </section>

        <section className="cartao" aria-label="Resumo do dia">
          <h2 className="mb-3 font-semibold">Resumo</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Produção", fmtM3(kpis.producaoM3)],
              ["Refugo", fmtM3(kpis.refugoM3)],
              ["Parado", formatarDuracao(kpis.minutosParados)],
              ["Disponibilidade", fmtPct(kpis.disponibilidade)],
              ["Produtividade", fmtPct(kpis.produtividade)],
              ["Qualidade", fmtPct(kpis.qualidade)],
              ["OEE", fmtPct(kpis.oee)],
              ["Rendimento", fmtPct(kpis.rendimento)],
            ].map(([r, v]) => (
              <div key={r} className="rounded-xl bg-stone-50 px-3 py-2">
                <dt className="text-xs text-stone-500">{r}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {erro && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
            {erro}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="btn-secundario">
            Cancelar
          </button>
          <button type="submit" className="btn-primario">
            {pendente ? "Salvando…" : inicial?.id ? "Salvar boletim" : "Lançar boletim"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
