import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { BotaoLink, Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { fmtM3, fmtNum, formatarDia, hojeSP, intervaloMes, m3Toras, mesDe, mesesAntes, nomeMes } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Recebimento de toras" };

export default async function TorasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const eu = await exigirProducao();
  const atual = mesDe(hojeSP());
  const { mes: q } = await searchParams;
  const mes = q && /^\d{4}-\d{2}$/.test(q) ? q : atual;
  const cargas = await db.cargaToras.findMany({
    where: { data: intervaloMes(mes) },
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    include: { itens: true, responsavel: { select: { nome: true } } },
  });
  const resumo = cargas.map((c) => {
    const qtd = c.itens.reduce((s, i) => s + i.quantidade, 0);
    return {
      c,
      qtd,
      diam: qtd ? c.itens.reduce((s, i) => s + i.diametro * i.quantidade, 0) / qtd : null,
      m3: c.comprimentoMedio ? c.itens.reduce((s, i) => s + m3Toras(i.diametro, c.comprimentoMedio!, i.quantidade), 0) : null,
    };
  });
  const totalQtd = resumo.reduce((s, r) => s + r.qtd, 0);
  const totalM3 = resumo.reduce((s, r) => s + (r.m3 ?? 0), 0);

  // Distribuição por diâmetro no mês
  const porDiametro = new Map<number, number>();
  for (const c of cargas) for (const i of c.itens) porDiametro.set(i.diametro, (porDiametro.get(i.diametro) ?? 0) + i.quantidade);
  const faixas = [...porDiametro].sort((a, b) => a[0] - b[0]);
  const maior = Math.max(1, ...faixas.map((f) => f[1]));

  return (
    <>
      <Titulo
        subtitulo="Cargas recebidas no pátio, por diâmetro"
        acao={
          podeProducao(eu, "lancar") && (
            <BotaoLink href="/producao/toras/nova">
              <Plus className="h-4 w-4" /> Nova carga
            </BotaoLink>
          )
        }
      >
        Recebimento de toras
      </Titulo>
      <nav aria-label="Mês" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {Array.from({ length: 12 }, (_, i) => mesesAntes(atual, i)).map((m) => (
          <Link
            key={m}
            href={`/producao/toras?mes=${m}`}
            aria-current={m === mes ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${m === mes ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"}`}
          >
            {nomeMes(m)}
          </Link>
        ))}
      </nav>

      {cargas.length === 0 ? (
        <Vazio>Nenhuma carga registrada em {nomeMes(mes)}.</Vazio>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Cargas", fmtNum(cargas.length)],
                ["Toras", fmtNum(totalQtd)],
                ["Volume estimado", totalM3 ? fmtM3(totalM3, 1) : "—"],
              ].map(([r, v], i) => (
                <div key={r} className={`cartao min-w-0 py-3 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
                  <dt className="text-xs text-stone-500">{r}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {resumo.map(({ c, qtd, diam, m3 }) => (
                <li key={c.id}>
                  <Link href={`/producao/toras/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                    <div className="w-14 shrink-0 font-semibold">{formatarDia(c.data, { day: "2-digit", month: "2-digit" })}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {c.origem}
                        {c.talhao && <span className="font-normal text-stone-500"> · talhão {c.talhao}</span>}
                      </div>
                      <div className="text-sm text-stone-500">
                        {fmtNum(qtd)} toras · Ø {diam ? fmtNum(diam, 1) : "—"} cm{m3 ? ` · ≈ ${fmtM3(m3, 1)}` : ""}
                        {c.placa && ` · ${c.placa}`}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <section className="cartao h-fit">
            <h2 className="mb-3 font-semibold">Toras por diâmetro</h2>
            <ul className="space-y-1.5">
              {faixas.map(([d, n]) => (
                <li key={d} className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0 tabular-nums text-stone-500">{d} cm</span>
                  <div className="h-3 flex-1">
                    <div className="h-full rounded-r-[4px] bg-[#2a78d6]" style={{ width: `${Math.max(2, (n / maior) * 100)}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
