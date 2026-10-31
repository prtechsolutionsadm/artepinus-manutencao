"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function somar(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function nomeLongo(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
}

/**
 * Escolha do mês: setas para o anterior/próximo e um calendário de meses.
 * `base` é o caminho da página; os outros parâmetros (`extra`) são mantidos.
 * `comDados` marca com um ponto os meses que têm lançamentos.
 */
export function SeletorMes({
  mes,
  atual,
  base,
  extra = {},
  comDados = [],
}: {
  mes: string;
  atual: string;
  base: string;
  extra?: Record<string, string | undefined>;
  comDados?: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [ano, setAno] = useState(Number(mes.slice(0, 4)));
  const caixa = useRef<HTMLDivElement>(null);
  const href = (m: string) => {
    const q = new URLSearchParams(Object.entries({ ...extra, mes: m }).filter(([, v]) => v) as [string, string][]);
    return `${base}?${q}`;
  };
  const anterior = somar(mes, -1);
  const proximo = somar(mes, 1);
  const dados = new Set(comDados);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const botao = "grid h-9 w-9 place-items-center text-stone-600 hover:bg-stone-50 hover:text-stone-900";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <div ref={caixa} className="relative flex items-stretch rounded-md border border-stone-300 bg-white">
        <Link href={href(anterior)} aria-label="Mês anterior" className={`${botao} rounded-l-md border-r border-stone-200`}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => (setAno(Number(mes.slice(0, 4))), setAberto((x) => !x))}
          aria-expanded={aberto}
          aria-haspopup="dialog"
          className="flex items-center justify-center gap-2 px-3 text-sm font-semibold hover:bg-stone-50 sm:min-w-44"
        >
          <CalendarDays className="hidden h-4 w-4 text-stone-400 sm:block" />
          <span className="first-letter:uppercase">{nomeLongo(mes)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
        </button>
        {proximo <= atual ? (
          <Link href={href(proximo)} aria-label="Próximo mês" className={`${botao} rounded-r-md border-l border-stone-200`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-hidden className={`${botao} cursor-not-allowed rounded-r-md border-l border-stone-200 text-stone-300 hover:bg-transparent hover:text-stone-300`}>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}

        {aberto && (
          <div role="dialog" aria-label="Escolher mês" className="absolute left-0 top-full z-30 mt-2 w-72 rounded-md border border-stone-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior" className="grid h-8 w-8 place-items-center rounded-md hover:bg-stone-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold tabular-nums">{ano}</span>
              <button
                type="button"
                onClick={() => setAno((a) => a + 1)}
                disabled={ano >= Number(atual.slice(0, 4))}
                aria-label="Próximo ano"
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-stone-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {MESES.map((nome, i) => {
                const m = `${ano}-${String(i + 1).padStart(2, "0")}`;
                const futuro = m > atual;
                const sel = m === mes;
                return futuro ? (
                  <span key={m} className="rounded-md py-2 text-center text-sm text-stone-300">
                    {nome}
                  </span>
                ) : (
                  <Link
                    key={m}
                    href={href(m)}
                    onClick={() => setAberto(false)}
                    aria-current={sel ? "date" : undefined}
                    className={`relative rounded-md py-2 text-center text-sm font-medium ${sel ? "bg-marca-700 text-white" : "text-stone-700 hover:bg-stone-100"}`}
                  >
                    {nome}
                    {dados.has(m) && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${sel ? "bg-white" : "bg-marca-600"}`} />}
                  </Link>
                );
              })}
            </div>
            {comDados.length > 0 && <p className="mt-2 text-[11px] text-stone-400">• meses com lançamentos</p>}
          </div>
        )}
      </div>
      {mes !== atual && (
        <Link href={href(atual)} className="text-sm font-medium text-marca-700 hover:underline">
          Este mês
        </Link>
      )}
    </div>
  );
}
