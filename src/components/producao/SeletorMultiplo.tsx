"use client";

import { useState } from "react";
import { Search } from "lucide-react";

/** Lista com caixas de seleção e busca (ex.: cargas de toras serradas no dia). */
export function SeletorMultiplo({
  opcoes,
  valor,
  onChange,
  vazio,
  rotulo,
}: {
  opcoes: { id: string; rotulo: string }[];
  valor: string[];
  onChange: (ids: string[]) => void;
  vazio: string;
  rotulo: string;
}) {
  const [busca, setBusca] = useState("");
  const termos = busca.toLowerCase().split(/\s+/).filter(Boolean);
  const visiveis = opcoes.filter((o) => termos.every((t) => o.rotulo.toLowerCase().includes(t)));
  if (opcoes.length === 0) return <p className="text-sm text-stone-500">{vazio}</p>;
  return (
    <div>
      {opcoes.length > 6 && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar…" aria-label={`Filtrar ${rotulo}`} className="campo py-1.5 pl-9" />
        </div>
      )}
      <ul className="max-h-60 divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200" aria-label={rotulo}>
        {visiveis.map((o) => {
          const marcado = valor.includes(o.id);
          return (
            <li key={o.id}>
              <label className={`mb-0 flex cursor-pointer items-center gap-3 px-3 py-2 text-sm font-normal ${marcado ? "bg-marca-50" : "hover:bg-stone-50"}`}>
                <input type="checkbox" checked={marcado} onChange={() => onChange(marcado ? valor.filter((v) => v !== o.id) : [...valor, o.id])} className="h-4 w-4 shrink-0" />
                <span className="min-w-0">{o.rotulo}</span>
              </label>
            </li>
          );
        })}
        {visiveis.length === 0 && <li className="px-3 py-2 text-sm text-stone-500">Nada encontrado.</li>}
      </ul>
      <p className="mt-1 text-xs text-stone-500">{valor.length} selecionada(s)</p>
    </div>
  );
}
