"use client";

import { useMemo, useState } from "react";
import { CircleAlert, Lightbulb, Printer, Search, X } from "lucide-react";
import { textoDaSecao, type Bloco, type Secao } from "@/lib/manual";

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-stone-700">
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case "texto":
            return <p key={i}>{b.texto}</p>;
          case "passos":
            return (
              <ol key={i} className="space-y-2">
                {b.itens.map((t, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-600 text-xs font-bold text-white">{n + 1}</span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
            );
          case "lista":
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-marca-600">
                {b.itens.map((t, n) => (
                  <li key={n}>{t}</li>
                ))}
              </ul>
            );
          case "termos":
            return (
              <dl key={i} className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {b.itens.map(([termo, def]) => (
                  <div key={termo} className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:gap-4">
                    <dt className="font-semibold text-stone-900">{termo}</dt>
                    <dd>{def}</dd>
                  </div>
                ))}
              </dl>
            );
          case "dica":
            return (
              <p key={i} className="flex gap-2.5 rounded-xl bg-marca-50 px-3 py-2.5 text-marca-900 ring-1 ring-marca-100">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />
                <span>{b.texto}</span>
              </p>
            );
          case "atencao":
            return (
              <p key={i} className="flex gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-amber-900 ring-1 ring-amber-200">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{b.texto}</span>
              </p>
            );
        }
      })}
    </div>
  );
}

export function ManualUsuario({ secoes }: { secoes: Secao[] }) {
  const [busca, setBusca] = useState("");
  // Cada palavra digitada precisa aparecer (em qualquer ordem)
  const palavras = normalizar(busca).split(/\s+/).filter((p) => p.length > 1);
  const termo = palavras.join(" ");
  const contem = (texto: string) => {
    const t = normalizar(texto);
    return palavras.every((p) => t.includes(p.replace(/(oes|aes|s)$/, "")));
  };

  // Na busca, mostra só os tópicos que contêm o termo (ou a seção inteira, se o título bater)
  const visiveis = useMemo(() => {
    if (!termo) return secoes;
    return secoes
      .map((s) => {
        if (contem(`${s.titulo} ${s.resumo}`)) return s;
        const topicos = s.topicos.filter((t) => contem(textoDaSecao({ ...s, titulo: "", resumo: "", topicos: [t] })));
        return topicos.length ? { ...s, topicos } : null;
      })
      .filter((s): s is Secao => s !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secoes, termo]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="nao-imprimir min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no manual…"
            aria-label="Buscar no manual"
            className="campo mt-0 pl-9 pr-9"
          />
          {busca && (
            <button onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <nav aria-label="Índice do manual" className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-0.5 lg:overflow-visible">
          {visiveis.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:text-marca-700 lg:block lg:border-0 lg:bg-transparent lg:px-3 lg:py-2 lg:hover:bg-stone-100"
            >
              {s.titulo}
            </a>
          ))}
        </nav>
        <button type="button" onClick={() => window.print()} className="btn-secundario mt-3 hidden w-full lg:flex">
          <Printer className="h-4 w-4" /> Imprimir manual
        </button>
      </aside>

      <div className="min-w-0 space-y-6">
        {visiveis.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center text-sm text-stone-500">
            Nada encontrado para “{busca}”. Tente outra palavra.
          </p>
        )}
        {visiveis.map((s) => (
          <section key={s.id} id={s.id} className="cartao scroll-mt-24 break-inside-avoid-page">
            <h2 className="text-xl font-bold text-stone-900">{s.titulo}</h2>
            <p className="mt-0.5 text-sm text-stone-500">{s.resumo}</p>
            <div className="mt-5 space-y-7">
              {s.topicos.map((t) => (
                <div key={t.titulo}>
                  <h3 className="mb-2.5 text-base font-semibold text-stone-900">{t.titulo}</h3>
                  <Blocos blocos={t.blocos} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
