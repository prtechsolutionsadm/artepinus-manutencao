import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Flame, Plus } from "lucide-react";
import { Badge, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDuracao, minutosEntre } from "@/lib/constantes";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { STATUS_CICLO, fmtM3, fmtNum } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Estufas" };

const volume = (c: { cargas: { m3: number }[] }) => c.cargas.reduce((s, x) => s + x.m3, 0);

export default async function EstufasPage() {
  const eu = await exigirProducao();
  const lancar = podeProducao(eu, "lancar");
  const [estufas, historico] = await Promise.all([
    db.estufa.findMany({
      where: { ativo: true },
      orderBy: { numero: "asc" },
      include: {
        ciclos: {
          where: { status: "EM_SECAGEM" },
          take: 1,
          include: { cargas: { select: { m3: true } }, checklist: { select: { conforme: true } } },
        },
      },
    }),
    db.cicloSecagem.findMany({
      where: { status: { not: "EM_SECAGEM" } },
      orderBy: { entrada: "desc" },
      take: 30,
      include: { estufa: { select: { nome: true } }, cargas: { select: { m3: true } } },
    }),
  ]);

  return (
    <>
      <Titulo
        subtitulo="Ciclos de secagem em andamento, checklist e histórico"
        acao={
          lancar && (
            <Link href="/producao/estufas/ciclos/novo" className="btn-primario">
              <Plus className="h-4 w-4" /> Iniciar ciclo
            </Link>
          )
        }
      >
        Estufas
      </Titulo>

      {estufas.length === 0 ? (
        <Vazio>Nenhuma estufa cadastrada. Cadastre em Produção → Cadastros.</Vazio>
      ) : (
        <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {estufas.map((e) => {
            const c = e.ciclos[0];
            if (!c) {
              return (
                <li key={e.id} className="cartao flex flex-col">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{e.nome}</h2>
                    <Badge cor="bg-stone-100 text-stone-600 ring-stone-200">Livre</Badge>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-stone-500">Sem ciclo em andamento{e.capacidadeM3 ? ` · capacidade ${fmtM3(e.capacidadeM3, 1)}` : ""}.</p>
                  {lancar && (
                    <Link href={`/producao/estufas/ciclos/novo?estufa=${e.id}`} className="btn-secundario mt-3 self-start">
                      <Plus className="h-4 w-4" /> Iniciar ciclo
                    </Link>
                  )}
                </li>
              );
            }
            const decorrido = minutosEntre(c.entrada) ?? 0;
            const total = c.previsaoSaida ? minutosEntre(c.entrada, c.previsaoSaida) : null;
            const atrasado = c.previsaoSaida ? c.previsaoSaida < new Date() : false;
            const conferidos = c.checklist.filter((i) => i.conforme !== null).length;
            const nao = c.checklist.filter((i) => i.conforme === false).length;
            const m3 = volume(c);
            return (
              <li key={e.id}>
                <Link href={`/producao/estufas/ciclos/${c.id}`} className="cartao block h-full hover:border-marca-300">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-semibold">
                      <Flame className="h-4 w-4 text-[#eb6834]" /> {e.nome}
                    </h2>
                    <Badge cor={atrasado ? "bg-rose-50 text-rose-800 ring-rose-200" : STATUS_CICLO.EM_SECAGEM.cor}>{atrasado ? "Passou da previsão" : "Em secagem"}</Badge>
                  </div>
                  <div className="mt-3 text-2xl font-bold tabular-nums">{formatarDuracao(decorrido)}</div>
                  <div className="text-sm text-stone-500">
                    desde {formatarData(c.entrada, true)}
                    {c.numero ? ` · ciclo nº ${c.numero}` : ""}
                  </div>
                  {total ? (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-label="Andamento do ciclo">
                      <div className={`h-full rounded-full ${atrasado ? "bg-rose-500" : "bg-[#eb6834]"}`} style={{ width: `${Math.min(100, (decorrido / total) * 100)}%` }} />
                    </div>
                  ) : null}
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-stone-500">Volume</dt>
                      <dd className="font-medium tabular-nums">
                        {fmtM3(m3, 1)}
                        {e.capacidadeM3 ? <span className="text-xs text-stone-400"> / {fmtNum(e.capacidadeM3, 0)}</span> : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Previsão de saída</dt>
                      <dd className="font-medium">{c.previsaoSaida ? formatarData(c.previsaoSaida, true) : "—"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-stone-500">Checklist</dt>
                      <dd className="font-medium">
                        {conferidos}/{c.checklist.length} conferidos{nao ? <span className="text-rose-700"> · {nao} não conforme(s)</span> : null}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-3 text-lg font-semibold">Histórico de ciclos</h2>
      {historico.length === 0 ? (
        <Vazio>Nenhum ciclo encerrado ainda.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {historico.map((c) => (
            <li key={c.id}>
              <Link href={`/producao/estufas/ciclos/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.estufa.nome}</span>
                    {c.numero && <span className="text-sm text-stone-500">ciclo nº {c.numero}</span>}
                    <Badge cor={STATUS_CICLO[c.status].cor}>{STATUS_CICLO[c.status].label}</Badge>
                  </div>
                  <div className="text-sm text-stone-500">
                    {formatarData(c.entrada, true)} → {c.saida ? formatarData(c.saida, true) : "—"}
                    {c.saida && ` · ${formatarDuracao(minutosEntre(c.entrada, c.saida))}`} · {fmtM3(volume(c), 1)}
                    {c.umidadeFinal != null && ` · umidade final ${fmtNum(c.umidadeFinal, 1)}%`}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
