import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { BotaoLink, Titulo, Vazio } from "@/components/ui";
import { formatarDuracao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { calcularKpis, fmtM3, fmtPct, formatarDia, hojeSP, intervaloMes, mesDe, mesesAntes, nomeMes } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Boletins da serraria" };

export default async function BoletinsPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const eu = await exigirProducao();
  const atual = mesDe(hojeSP());
  const { mes: q } = await searchParams;
  const mes = q && /^\d{4}-\d{2}$/.test(q) ? q : atual;

  const boletins = await db.boletimProducao.findMany({
    where: { data: intervaloMes(mes) },
    orderBy: { data: "desc" },
    include: {
      responsavel: { select: { nome: true } },
      itens: { select: { tipo: true, m3: true } },
      paradas: { select: { centro: true, minutos: true } },
    },
  });
  const total = calcularKpis(boletins);
  const meses = Array.from({ length: 12 }, (_, i) => mesesAntes(atual, i));

  return (
    <>
      <Titulo
        subtitulo="Produção e paradas lançadas pelo encarregado no fim do turno"
        acao={
          podeProducao(eu, "lancar") && (
            <BotaoLink href="/producao/boletins/novo">
              <Plus className="h-4 w-4" /> Novo boletim
            </BotaoLink>
          )
        }
      >
        Boletins da serraria
      </Titulo>

      <nav aria-label="Mês" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {meses.map((m) => (
          <Link
            key={m}
            href={`/producao/boletins?mes=${m}`}
            aria-current={m === mes ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
              m === mes ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
            }`}
          >
            {nomeMes(m)}
          </Link>
        ))}
      </nav>

      {boletins.length > 0 && (
        <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Produção no mês", fmtM3(total.producaoM3)],
            ["Meta acumulada", fmtM3(total.metaM3)],
            ["Tempo parado", formatarDuracao(total.minutosParados)],
            ["OEE do mês", fmtPct(total.oee)],
          ].map(([r, v]) => (
            <div key={r} className="cartao py-3">
              <dt className="text-xs text-stone-500">{r}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {boletins.length === 0 ? (
        <Vazio>Nenhum boletim lançado em {nomeMes(mes)}.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {boletins.map((b) => {
            const k = calcularKpis([b]);
            return (
              <li key={b.id}>
                <Link href={`/producao/boletins/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                  <div className="w-20 shrink-0">
                    <div className="font-semibold">{formatarDia(b.data, { day: "2-digit", month: "2-digit" })}</div>
                    <div className="text-xs capitalize text-stone-500">{formatarDia(b.data, { weekday: "short" })}</div>
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-0.5 text-sm sm:grid-cols-4">
                    <span>
                      <span className="text-stone-500">Prod. </span>
                      <b className="tabular-nums">{fmtM3(k.producaoM3)}</b>
                    </span>
                    <span className="tabular-nums">
                      <span className="text-stone-500">Meta </span>
                      {fmtPct(k.produtividade)}
                    </span>
                    <span className="tabular-nums">
                      <span className="text-stone-500">Parado </span>
                      {formatarDuracao(k.minutosParados)}
                    </span>
                    <span className="tabular-nums">
                      <span className="text-stone-500">OEE </span>
                      <b>{fmtPct(k.oee)}</b>
                    </span>
                    <span className="col-span-2 truncate text-xs text-stone-400 sm:col-span-4">{b.responsavel.nome}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
