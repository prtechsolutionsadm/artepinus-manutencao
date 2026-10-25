"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { marcarItemCiclo } from "@/app/actions/producao";

type Item = { id: string; secao: string | null; texto: string; conforme: boolean | null; observacao: string | null; marcadoPor: string | null };

/** Checklist da estufa: OK / Não conforme por item, com observação. */
export function ChecklistCiclo({ itens: iniciais, editavel }: { itens: Item[]; editavel: boolean }) {
  const [itens, setItens] = useState(iniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function marcar(id: string, conforme: boolean | null, observacao?: string) {
    const antes = itens;
    setItens((l) => l.map((i) => (i.id === id ? { ...i, conforme, ...(observacao !== undefined ? { observacao } : {}) } : i)));
    iniciar(async () => {
      const r = await marcarItemCiclo(id, conforme, observacao);
      if (r.erro) {
        setErro(r.erro);
        setItens(antes);
      }
    });
  }

  const secoes = [...new Set(itens.map((i) => i.secao ?? ""))];
  const feitos = itens.filter((i) => i.conforme !== null).length;
  const nao = itens.filter((i) => i.conforme === false).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">
          {feitos} de {itens.length} conferidos
        </span>
        {nao > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">{nao} não conforme(s)</span>}
        <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-[#1baf7a]" style={{ width: `${itens.length ? (feitos / itens.length) * 100 : 0}%` }} />
        </div>
      </div>
      {erro && <p role="alert" className="mb-2 text-sm text-rose-700">{erro}</p>}
      {secoes.map((s) => (
        <div key={s} className="mb-4">
          {s && <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">{s}</h3>}
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {itens
              .filter((i) => (i.secao ?? "") === s)
              .map((i) => (
                <li key={i.id} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex-1 text-sm ${i.conforme === false ? "font-medium text-rose-800" : ""}`}>{i.texto}</span>
                    {editavel ? (
                      <span className="flex shrink-0 gap-1" role="group" aria-label={i.texto}>
                        <button
                          type="button"
                          aria-pressed={i.conforme === true}
                          onClick={() => marcar(i.id, i.conforme === true ? null : true)}
                          className={`grid h-9 w-11 place-items-center rounded-lg text-xs font-bold ring-1 ring-inset ${i.conforme === true ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-500 ring-stone-200"}`}
                        >
                          <Check className="h-4 w-4" />
                          <span className="sr-only">OK</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={i.conforme === false}
                          onClick={() => marcar(i.id, i.conforme === false ? null : false)}
                          className={`grid h-9 w-11 place-items-center rounded-lg text-xs font-bold ring-1 ring-inset ${i.conforme === false ? "bg-rose-600 text-white ring-rose-600" : "bg-white text-stone-500 ring-stone-200"}`}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Não conforme</span>
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold">{i.conforme === null ? "—" : i.conforme ? "OK" : "NÃO"}</span>
                    )}
                  </div>
                  {editavel && i.conforme === false ? (
                    <input
                      defaultValue={i.observacao ?? ""}
                      placeholder="Observação (o que está errado)"
                      aria-label={`Observação: ${i.texto}`}
                      onBlur={(e) => e.target.value !== (i.observacao ?? "") && marcar(i.id, false, e.target.value)}
                      className="campo mt-2 py-1.5 text-sm"
                    />
                  ) : (
                    i.observacao && <p className="mt-1 text-xs text-stone-500">{i.observacao}</p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
