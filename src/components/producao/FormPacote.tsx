"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Printer } from "lucide-react";
import { criarPacotes } from "@/app/actions/rastreio";
import { fmtM3, m3Pecas } from "@/lib/producao";
import { codigoPacote } from "@/lib/rastreio";

type Opcao = { id: string; rotulo: string };

const CLASSES = ["1ª", "2ª", "3ª", "Industrial", "Exportação"];

export function FormPacote({
  boletins,
  ciclos,
  inicial,
}: {
  boletins: Opcao[];
  ciclos: Opcao[];
  inicial: { origem: "boletim" | "ciclo"; boletimId?: string; cicloId?: string };
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [criados, setCriados] = useState<number[] | null>(null);
  const [origem, setOrigem] = useState(inicial.origem);
  const [f, setF] = useState({
    boletimId: inicial.boletimId ?? boletins[0]?.id ?? "",
    cicloId: inicial.cicloId ?? ciclos[0]?.id ?? "",
    espessura: "",
    largura: "",
    comprimento: "",
    pecas: "",
    quantidade: "1",
    classe: "",
    mercado: "EXTERNO",
    umidade: "",
    localizacao: "",
    observacoes: "",
  });
  const set = (c: keyof typeof f, digitos = false) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [c]: digitos ? e.target.value.replace(/\D/g, "") : e.target.value }));
  const n = (s: string) => Number(s.replace(",", "."));
  const m3 = [f.espessura, f.largura, f.comprimento, f.pecas].every((v) => n(v) > 0) ? m3Pecas(n(f.espessura), n(f.largura), n(f.comprimento), n(f.pecas)) : 0;
  const qtd = Math.max(1, n(f.quantidade) || 1);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await criarPacotes({ ...f, origem, umidade: f.umidade.replace(",", "."), mercado: f.mercado as "EXTERNO" | "INTERNO" });
      if (r.erro) return setErro(r.erro);
      setCriados(r.numeros ?? []);
      // Mantém origem e bitola para o próximo pacote; limpa só as peças
      setF((x) => ({ ...x, pecas: "", quantidade: "1", observacoes: "" }));
    });
  }

  return (
    <div className="space-y-6">
      {criados && criados.length > 0 && (
        <div role="status" className="cartao border-emerald-200 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-emerald-900">
                {criados.length === 1 ? `Pacote ${codigoPacote(criados[0])} formado` : `${criados.length} pacotes formados: ${codigoPacote(criados[0])} a ${codigoPacote(criados[criados.length - 1])}`}
              </div>
              <p className="text-sm text-emerald-800">Imprima a etiqueta com o QR Code e prenda no pacote.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/producao/pacotes/etiquetas?n=${criados.join(",")}`} className="btn-primario">
                  <Printer className="h-4 w-4" /> Imprimir etiqueta{criados.length > 1 ? "s" : ""}
                </Link>
                <Link href={`/producao/pacotes/${criados[0]}`} className="btn-secundario">
                  Ver pacote
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={enviar}>
        <fieldset disabled={pendente} className="min-w-0 space-y-6">
          <section className="cartao">
            <h2 className="mb-3 font-semibold">De onde vem a madeira?</h2>
            <div className="mb-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Origem do pacote">
              {(
                [
                  ["ciclo", "Saída da estufa (seco)", "Pacote formado depois da secagem"],
                  ["boletim", "Direto da serraria (verde)", "Pacote verde, antes da estufa ou para venda verde"],
                ] as const
              ).map(([v, t, d]) => (
                <label key={v} className={`mb-0 flex cursor-pointer gap-3 rounded-xl border p-3 font-normal ${origem === v ? "border-marca-500 bg-marca-50" : "border-stone-200"}`}>
                  <input type="radio" name="origem" value={v} checked={origem === v} onChange={() => setOrigem(v)} className="mt-1" />
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-stone-500">{d}</span>
                  </span>
                </label>
              ))}
            </div>
            {origem === "ciclo" ? (
              <div>
                <label htmlFor="pc-ciclo">Ciclo de estufa *</label>
                <select id="pc-ciclo" required value={f.cicloId} onChange={set("cicloId")} className="campo">
                  <option value="">{ciclos.length ? "Escolha…" : "Nenhum ciclo concluído nos últimos 90 dias"}</option>
                  {ciclos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="pc-boletim">Dia de serraria *</label>
                <select id="pc-boletim" required value={f.boletimId} onChange={set("boletimId")} className="campo">
                  <option value="">{boletins.length ? "Escolha…" : "Nenhum boletim nos últimos 30 dias"}</option>
                  {boletins.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="cartao">
            <h2 className="mb-3 font-semibold">Pacote</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="pc-e">Espessura (mm) *</label>
                <input id="pc-e" inputMode="numeric" required value={f.espessura} onChange={set("espessura", true)} className="campo" />
              </div>
              <div>
                <label htmlFor="pc-l">Largura (mm) *</label>
                <input id="pc-l" inputMode="numeric" required value={f.largura} onChange={set("largura", true)} className="campo" />
              </div>
              <div>
                <label htmlFor="pc-c">Comprimento (mm) *</label>
                <input id="pc-c" inputMode="numeric" required value={f.comprimento} onChange={set("comprimento", true)} className="campo" />
              </div>
              <div>
                <label htmlFor="pc-p">Peças *</label>
                <input id="pc-p" inputMode="numeric" required value={f.pecas} onChange={set("pecas", true)} className="campo" />
              </div>
              <div>
                <label htmlFor="pc-cl">Classe</label>
                <input id="pc-cl" list="pc-classes" value={f.classe} onChange={set("classe")} className="campo" />
                <datalist id="pc-classes">
                  {CLASSES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="pc-m">Mercado</label>
                <select id="pc-m" value={f.mercado} onChange={set("mercado")} className="campo">
                  <option value="EXTERNO">Externo</option>
                  <option value="INTERNO">Interno</option>
                </select>
              </div>
              <div>
                <label htmlFor="pc-u">Umidade (%)</label>
                <input id="pc-u" inputMode="decimal" value={f.umidade} onChange={set("umidade")} className="campo" />
              </div>
              <div>
                <label htmlFor="pc-loc">Local</label>
                <input id="pc-loc" value={f.localizacao} onChange={set("localizacao")} placeholder="Ex.: Galpão 2" className="campo" />
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label htmlFor="pc-obs">Observações</label>
                <input id="pc-obs" value={f.observacoes} onChange={set("observacoes")} className="campo" />
              </div>
            </div>
          </section>

          <section className="cartao flex flex-wrap items-end justify-between gap-4">
            <div>
              <label htmlFor="pc-q">Quantos pacotes iguais?</label>
              <input id="pc-q" inputMode="numeric" value={f.quantidade} onChange={set("quantidade", true)} className="campo w-28" />
            </div>
            <div className="text-right">
              <div className="text-sm text-stone-500">Volume {qtd > 1 ? `de cada pacote · total ${fmtM3(m3 * qtd, 3)}` : "do pacote"}</div>
              <div className="text-2xl font-bold tabular-nums">{fmtM3(m3, 4)}</div>
            </div>
          </section>

          {erro && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
              {erro}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primario">
              {pendente ? "Salvando…" : qtd > 1 ? `Formar ${qtd} pacotes` : "Formar pacote"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
