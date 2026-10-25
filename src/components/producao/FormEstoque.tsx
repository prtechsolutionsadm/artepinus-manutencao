"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2 } from "lucide-react";
import { salvarLevantamento } from "@/app/actions/producao";
import { TIPO_ESTOQUE, fmtM3, hojeSP } from "@/lib/producao";
import type { TipoEstoque } from "@/generated/prisma/enums";

type Linha = { k: number; espessura: string; largura: string; comprimento: string; grades: string; pacotes: string; m3: string };
export type LevantamentoInicial = {
  id?: string;
  data: string;
  tipo: TipoEstoque;
  observacoes: string | null;
  itens: { espessura: number; largura: string; comprimento: number; grades: number | null; pacotes: number | null; m3: number }[];
};

let seq = 0;
const chave = () => ++seq;
const num = (s: string) => Number(s.replace(",", "."));
const vazio = (): Linha => ({ k: chave(), espessura: "", largura: "", comprimento: "", grades: "", pacotes: "", m3: "" });

export function FormEstoque({ inicial }: { inicial: LevantamentoInicial }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState(inicial.data);
  const [tipo, setTipo] = useState<TipoEstoque>(inicial.tipo);
  const [obs, setObs] = useState(inicial.observacoes ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    inicial.itens.length
      ? inicial.itens.map((i) => ({
          k: chave(),
          espessura: String(i.espessura),
          largura: i.largura,
          comprimento: String(i.comprimento),
          grades: i.grades == null ? "" : String(i.grades),
          pacotes: i.pacotes == null ? "" : String(i.pacotes),
          m3: String(i.m3),
        }))
      : [vazio()],
  );
  const mudar = (k: number, c: keyof Linha, v: string) => setLinhas((l) => l.map((x) => (x.k === k ? { ...x, [c]: v } : x)));
  const total = linhas.reduce((s, l) => s + (num(l.m3) || 0), 0);
  const unidade = tipo === "VERDE" ? "grades" : "pacotes";

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await salvarLevantamento({
        id: inicial.id ?? null,
        data,
        tipo,
        observacoes: obs,
        itens: linhas
          .filter((l) => l.espessura || l.m3)
          .map((l) => ({ espessura: l.espessura, largura: l.largura, comprimento: l.comprimento.replace(",", "."), grades: l.grades, pacotes: l.pacotes, m3: l.m3.replace(",", ".") })),
      });
      if (r.erro) return setErro(r.erro);
      router.push("/producao/estoque");
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar}>
      <fieldset disabled={pendente} className="min-w-0 space-y-6">
        <section className="cartao grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="e-data">Data do levantamento *</label>
            <input id="e-data" type="date" required max={hojeSP()} value={data} onChange={(e) => setData(e.target.value)} className="campo" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="e-tipo">Estoque *</label>
            <select id="e-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEstoque)} className="campo">
              {(Object.keys(TIPO_ESTOQUE) as TipoEstoque[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_ESTOQUE[t]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="cartao">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Bitolas</h2>
            <span className="text-sm font-medium tabular-nums">Total {fmtM3(total, 3)}</span>
          </div>
          <ul className="space-y-3">
            {linhas.map((l, n) => (
              <li key={l.k} className="rounded-xl border border-stone-200 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div>
                    <label htmlFor={`s-e-${l.k}`}>Espessura (mm)</label>
                    <input id={`s-e-${l.k}`} inputMode="numeric" required value={l.espessura} onChange={(e) => mudar(l.k, "espessura", e.target.value.replace(/\D/g, ""))} className="campo" />
                  </div>
                  <div>
                    <label htmlFor={`s-l-${l.k}`}>Largura</label>
                    <input id={`s-l-${l.k}`} required placeholder="100 ou Mista" value={l.largura} onChange={(e) => mudar(l.k, "largura", e.target.value)} className="campo" />
                  </div>
                  <div>
                    <label htmlFor={`s-c-${l.k}`}>Comprimento (m)</label>
                    <input id={`s-c-${l.k}`} inputMode="decimal" required value={l.comprimento} onChange={(e) => mudar(l.k, "comprimento", e.target.value)} className="campo" />
                  </div>
                  <div>
                    <label htmlFor={`s-u-${l.k}`}>{unidade === "grades" ? "Grades" : "Pacotes"}</label>
                    <input
                      id={`s-u-${l.k}`}
                      inputMode="numeric"
                      value={l[unidade]}
                      onChange={(e) => mudar(l.k, unidade, e.target.value.replace(/\D/g, ""))}
                      className="campo"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`s-m-${l.k}`}>Volume (m³) *</label>
                    <input id={`s-m-${l.k}`} inputMode="decimal" required value={l.m3} onChange={(e) => mudar(l.k, "m3", e.target.value)} className="campo" />
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <button type="button" onClick={() => setLinhas((x) => [...x, { ...l, k: chave(), grades: "", pacotes: "", m3: "" }])} className="btn-secundario px-2 py-1 text-xs">
                    <Copy className="h-3.5 w-3.5" /> Repetir
                  </button>
                  {linhas.length > 1 && (
                    <button type="button" onClick={() => setLinhas((x) => x.filter((y) => y.k !== l.k))} className="btn-secundario px-2 py-1 text-xs text-rose-700" aria-label={`Remover linha ${n + 1}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setLinhas((x) => [...x, vazio()])} className="btn-secundario mt-3">
            <Plus className="h-4 w-4" /> Adicionar bitola
          </button>
        </section>

        <section className="cartao">
          <label htmlFor="e-obs">Observações</label>
          <textarea id="e-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} className="campo" />
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
            {pendente ? "Salvando…" : inicial.id ? "Salvar levantamento" : "Registrar levantamento"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
