"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { salvarCargaToras } from "@/app/actions/producao";
import { fmtM3, fmtNum, hojeSP, m3Toras } from "@/lib/producao";

type Linha = { k: number; diametro: string; quantidade: string };
export type CargaInicial = {
  id?: string;
  data: string;
  origem: string;
  colheitaId: string | null;
  talhao: string | null;
  motorista: string | null;
  placa: string | null;
  comprimentoMedio: number | null;
  observacoes: string | null;
  itens: { diametro: number; quantidade: number }[];
};

let seq = 0;
const chave = () => ++seq;
const num = (s: string) => Number(s.replace(",", "."));

/** Colheita aberta para escolher na carga: liga a carga à floresta de origem. */
export type ColheitaOpcao = { id: string; rotulo: string; origem: string; talhao: string | null };

export function FormToras({ inicial, colheitas }: { inicial: CargaInicial; colheitas: ColheitaOpcao[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState({
    data: inicial.data,
    origem: inicial.origem,
    colheitaId: inicial.colheitaId ?? "",
    talhao: inicial.talhao ?? "",
    motorista: inicial.motorista ?? "",
    placa: inicial.placa ?? "",
    comprimentoMedio: inicial.comprimentoMedio == null ? "" : String(inicial.comprimentoMedio),
    observacoes: inicial.observacoes ?? "",
  });
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    inicial.itens.length ? inicial.itens.map((i) => ({ k: chave(), diametro: String(i.diametro), quantidade: String(i.quantidade) })) : [{ k: chave(), diametro: "", quantidade: "" }],
  );
  const set = (c: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [c]: e.target.value }));
  const mudar = (k: number, c: "diametro" | "quantidade", v: string) => setLinhas((l) => l.map((x) => (x.k === k ? { ...x, [c]: v.replace(/\D/g, "") } : x)));

  const comp = num(f.comprimentoMedio);
  const qtd = linhas.reduce((s, l) => s + (num(l.quantidade) || 0), 0);
  const m3 = comp > 0 ? linhas.reduce((s, l) => s + (num(l.diametro) && num(l.quantidade) ? m3Toras(num(l.diametro), comp, num(l.quantidade)) : 0), 0) : 0;
  const diam = qtd ? linhas.reduce((s, l) => s + (num(l.diametro) || 0) * (num(l.quantidade) || 0), 0) / qtd : 0;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await salvarCargaToras({
        id: inicial.id ?? null,
        ...f,
        comprimentoMedio: f.comprimentoMedio.replace(",", "."),
        itens: linhas.filter((l) => l.diametro || l.quantidade).map(({ diametro, quantidade }) => ({ diametro, quantidade })),
      });
      if (r.erro) return setErro(r.erro);
      router.push("/producao/toras");
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar}>
      <fieldset disabled={pendente} className="min-w-0 space-y-6">
        <section className="cartao grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <label htmlFor="t-col">Colheita (de qual floresta/talhão vieram as toras)</label>
            <select
              id="t-col"
              value={f.colheitaId}
              onChange={(e) => {
                const c = colheitas.find((x) => x.id === e.target.value);
                setF((x) => ({ ...x, colheitaId: e.target.value, ...(c ? { origem: c.origem, talhao: c.talhao ?? x.talhao } : {}) }));
              }}
              className="campo"
            >
              <option value="">— Sem colheita cadastrada —</option>
              {colheitas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-500">É o que liga o pacote de madeira até a floresta. Cadastre as colheitas em Florestas e colheitas.</p>
          </div>
          <div>
            <label htmlFor="t-data">Data *</label>
            <input id="t-data" type="date" required max={hojeSP()} value={f.data} onChange={set("data")} className="campo" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label htmlFor="t-orig">Origem / fornecedor *</label>
            <input id="t-orig" required value={f.origem} onChange={set("origem")} className="campo" />
          </div>
          <div>
            <label htmlFor="t-tal">Talhão</label>
            <input id="t-tal" value={f.talhao} onChange={set("talhao")} className="campo" />
          </div>
          <div>
            <label htmlFor="t-mot">Motorista</label>
            <input id="t-mot" value={f.motorista} onChange={set("motorista")} className="campo" />
          </div>
          <div>
            <label htmlFor="t-pla">Placa</label>
            <input id="t-pla" value={f.placa} onChange={set("placa")} className="campo uppercase" />
          </div>
          <div>
            <label htmlFor="t-comp">Comprimento médio (m)</label>
            <input id="t-comp" inputMode="decimal" value={f.comprimentoMedio} onChange={set("comprimentoMedio")} className="campo" />
          </div>
        </section>

        <section className="cartao">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Toras por diâmetro</h2>
            <span className="text-sm tabular-nums">
              <b>{fmtNum(qtd)}</b> toras · Ø médio {diam ? fmtNum(diam, 1) : "—"} cm{m3 > 0 && <> · ≈ {fmtM3(m3, 2)}</>}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {linhas.map((l, n) => (
              <li key={l.k} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={`d-${l.k}`}>Diâmetro (cm)</label>
                  <input id={`d-${l.k}`} inputMode="numeric" required value={l.diametro} onChange={(e) => mudar(l.k, "diametro", e.target.value)} className="campo" />
                </div>
                <div className="flex-1">
                  <label htmlFor={`q-${l.k}`}>Quantidade</label>
                  <input id={`q-${l.k}`} inputMode="numeric" required value={l.quantidade} onChange={(e) => mudar(l.k, "quantidade", e.target.value)} className="campo" />
                </div>
                {linhas.length > 1 && (
                  <button type="button" onClick={() => setLinhas((x) => x.filter((y) => y.k !== l.k))} className="btn-secundario mb-0.5 px-2 text-rose-700" aria-label={`Remover linha ${n + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setLinhas((x) => [...x, { k: chave(), diametro: x.length ? String((num(x[x.length - 1].diametro) || 0) + 2 || "") : "", quantidade: "" }])}
            className="btn-secundario mt-3"
          >
            <Plus className="h-4 w-4" /> Adicionar diâmetro
          </button>
          <p className="mt-2 text-xs text-stone-500">Volume estimado como cilindro (diâmetro × comprimento médio); serve para comparação, não substitui a cubagem.</p>
        </section>

        <section className="cartao">
          <label htmlFor="t-obs">Observações</label>
          <textarea id="t-obs" rows={2} value={f.observacoes} onChange={set("observacoes")} className="campo" />
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
            {pendente ? "Salvando…" : inicial.id ? "Salvar carga" : "Registrar carga"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
