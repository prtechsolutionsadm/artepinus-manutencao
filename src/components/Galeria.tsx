"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { removerFoto } from "@/app/actions/requisicoes";

export type FotoGaleria = { id: string; autor: string; quando: string; podeRemover: boolean };

export function Galeria({ fotos }: { fotos: FotoGaleria[] }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [pendente, startTransition] = useTransition();
  const atual = aberta === null ? null : fotos[aberta];

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setAberta(i)}
              className="block aspect-square w-full overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200 transition hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/anexos/${f.id}?mini=1`} alt={`Foto enviada por ${f.autor}`} loading="lazy" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {atual && aberta !== null && (
        <div
          role="dialog"
          aria-modal
          aria-label="Foto"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white"
          onClick={() => setAberta(null)}
        >
          <div className="flex items-center justify-between gap-3 p-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <span className="min-w-0 truncate">
              {atual.autor} · {atual.quando}
            </span>
            <div className="flex items-center gap-1">
              {atual.podeRemover && (
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => {
                    if (!confirm("Remover esta foto?")) return;
                    startTransition(async () => {
                      await removerFoto(atual.id);
                      setAberta(null);
                    });
                  }}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
                  aria-label="Remover foto"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              <a href={`/api/anexos/${atual.id}`} target="_blank" className="rounded-full px-3 py-2 hover:bg-white/10">
                Abrir original
              </a>
              <button type="button" onClick={() => setAberta(null)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Fechar">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/anexos/${atual.id}`} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={(e) => (e.stopPropagation(), setAberta((aberta - 1 + fotos.length) % fotos.length))}
                  className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-black/50 hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima"
                  onClick={(e) => (e.stopPropagation(), setAberta((aberta + 1) % fotos.length))}
                  className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-black/50 hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
