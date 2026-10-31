"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2 } from "lucide-react";
import { salvarCiclo } from "@/app/actions/producao";
import { SeletorMultiplo } from "@/components/producao/SeletorMultiplo";
import { fmtM3 } from "@/lib/producao";

type Carga = { k: number; espessura: string; largura: string; comprimento: string; grades: string; m3: string };

export type CicloInicial = {
  id?: string;
  estufaId: string;
  numero: number | null;
  entrada: string;
  previsaoSaida: string;
  umidadeInicial: number | null;
  plantao: string | null;
  proximaCarga: string | null;
  observacoes: string | null;
  cargas: { espessura: number; largura: string; comprimento: number; grades: number; m3: number }[];
  boletimIds: string[];
};

let seq = 0;
const chave = () => ++seq;
const num = (s: string) => Number(s.replace(",", "."));
const txt = (v: number | string | null | undefined) => (v == null ? "" : String(v));

export function FormCiclo({
  inicial,
  estufas,
  boletins,
}: {
  inicial: CicloInicial;
  estufas: { id: string; nome: string; ocupada: boolean }[];
  boletins: { id: string; rotulo: string }[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState({
    estufaId: inicial.estufaId,
    numero: txt(inicial.numero),
    entrada: inicial.entrada,
    previsaoSaida: inicial.previsaoSaida,
    umidadeInicial: txt(inicial.umidadeInicial),
    plantao: inicial.plantao ?? "",
    proximaCarga: inicial.proximaCarga ?? "",
    observacoes: inicial.observacoes ?? "",
  });
  const [cargas, setCargas] = useState<Carga[]>(() =>
    inicial.cargas.length
      ? inicial.cargas.map((c) => ({ k: chave(), espessura: String(c.espessura), largura: c.largura, comprimento: String(c.comprimento), grades: String(c.grades), m3: String(c.m3) }))
      : [{ k: chave(), espessura: "", largura: "", comprimento: "", grades: "", m3: "" }],
  );
  const [boletimIds, setBoletimIds] = useState<string[]>(inicial.boletimIds);
  const total = cargas.reduce((s, c) => s + (num(c.m3) || 0), 0);
  const set = (campo: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [campo]: e.target.value }));
  const mudar = (k: number, campo: keyof Carga, v: string) => setCargas((l) => l.map((c) => (c.k === k ? { ...c, [campo]: v } : c)));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await salvarCiclo({
        id: inicial.id ?? null,
        ...f,
        umidadeInicial: f.umidadeInicial.replace(",", "."),
        boletimIds,
        cargas: cargas
          .filter((c) => c.espessura || c.m3 || c.grades)
          .map((c) => ({ espessura: c.espessura, largura: c.largura, comprimento: c.comprimento.replace(",", "."), grades: c.grades, m3: c.m3.replace(",", ".") })),
      });
      if (r.erro) return setErro(r.erro);
      router.push(`/producao/estufas/ciclos/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar}>
      <fieldset disabled={pendente} className="min-w-0 space-y-6">
        <section className="cartao grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="c-estufa">Estufa *</label>
            <select id="c-estufa" required value={f.estufaId} onChange={set("estufaId")} className="campo">
              <option value="">Escolha…</option>
              {estufas.map((e) => (
                <option key={e.id} value={e.id} disabled={e.ocupada && e.id !== inicial.estufaId}>
                  {e.nome}
                  {e.ocupada && e.id !== inicial.estufaId ? " (em secagem)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-num">Nº do ciclo</label>
            <input id="c-num" inputMode="numeric" value={f.numero} onChange={set("numero")} className="campo" />
          </div>
          <div>
            <label htmlFor="c-umi">Umidade inicial (%)</label>
            <input id="c-umi" inputMode="decimal" value={f.umidadeInicial} onChange={set("umidadeInicial")} className="campo" />
          </div>
          <div>
            <label htmlFor="c-ent">Entrada *</label>
            <input id="c-ent" type="datetime-local" required value={f.entrada} onChange={set("entrada")} className="campo" />
          </div>
          <div>
            <label htmlFor="c-prev">Previsão de saída</label>
            <input id="c-prev" type="datetime-local" value={f.previsaoSaida} onChange={set("previsaoSaida")} className="campo" />
          </div>
          <div>
            <label htmlFor="c-pl">Plantão (responsáveis)</label>
            <input id="c-pl" value={f.plantao} onChange={set("plantao")} className="campo" />
          </div>
        </section>

        <section className="cartao">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Madeira na estufa</h2>
            <span className="text-sm font-medium tabular-nums">Total {fmtM3(total, 3)}</span>
          </div>
          <ul className="space-y-3">
            {cargas.map((c, n) => (
              <li key={c.k} className="rounded-xl border border-stone-200 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div>
                    <label htmlFor={`g-e-${c.k}`}>Espessura (mm)</label>
                    <input id={`g-e-${c.k}`} inputMode="numeric" required value={c.espessura} onChange={(e) => mudar(c.k, "espessura", e.target.value.replace(/\D/g, ""))} className="campo" />
                  </div>
                  <div>
                    <label htmlFor={`g-l-${c.k}`}>Largura</label>
                    <input id={`g-l-${c.k}`} required placeholder="85-100-125" value={c.largura} onChange={(e) => mudar(c.k, "largura", e.target.value)} className="campo" />
                  </div>
                  <div>
                    <label htmlFor={`g-c-${c.k}`}>Comprimento (m)</label>
                    <input id={`g-c-${c.k}`} inputMode="decimal" required value={c.comprimento} onChange={(e) => mudar(c.k, "comprimento", e.target.value)} className="campo" />
                  </div>
                  <div>
                    <label htmlFor={`g-g-${c.k}`}>Grades</label>
                    <input id={`g-g-${c.k}`} inputMode="numeric" required value={c.grades} onChange={(e) => mudar(c.k, "grades", e.target.value.replace(/\D/g, ""))} className="campo" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`g-m-${c.k}`}>Volume (m³)</label>
                    <input id={`g-m-${c.k}`} inputMode="decimal" required value={c.m3} onChange={(e) => mudar(c.k, "m3", e.target.value)} className="campo" />
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <button type="button" onClick={() => setCargas((l) => [...l, { ...c, k: chave(), grades: "", m3: "" }])} className="btn-secundario px-2 py-1 text-xs">
                    <Copy className="h-3.5 w-3.5" /> Repetir
                  </button>
                  {cargas.length > 1 && (
                    <button type="button" onClick={() => setCargas((l) => l.filter((x) => x.k !== c.k))} className="btn-secundario px-2 py-1 text-xs text-rose-700" aria-label={`Remover linha ${n + 1}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setCargas((l) => [...l, { k: chave(), espessura: "", largura: "", comprimento: "", grades: "", m3: "" }])} className="btn-secundario mt-3">
            <Plus className="h-4 w-4" /> Adicionar bitola
          </button>
        </section>

        <section className="cartao">
          <h2 className="mb-1 font-semibold">Madeira de quais dias?</h2>
          <p className="mb-3 text-sm text-stone-500">Marque os dias de serraria cuja madeira entrou nesta estufa — liga os pacotes secos ao dia em que foram serrados e às toras.</p>
          <SeletorMultiplo opcoes={boletins} valor={boletimIds} onChange={setBoletimIds} rotulo="Boletins da serraria" vazio="Nenhum boletim lançado nos últimos 30 dias." />
        </section>

        <section className="cartao grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-prox">Próxima carga</label>
            <input id="c-prox" value={f.proximaCarga} onChange={set("proximaCarga")} placeholder="Ex.: 25 mm mista, 3,0 m" className="campo" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="c-obs">Observações</label>
            <textarea id="c-obs" rows={3} value={f.observacoes} onChange={set("observacoes")} className="campo" />
          </div>
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
            {pendente ? "Salvando…" : inicial.id ? "Salvar ciclo" : "Iniciar ciclo"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
