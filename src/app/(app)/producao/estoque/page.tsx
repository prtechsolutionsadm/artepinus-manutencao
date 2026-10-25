import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { BotaoLink, Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { TIPO_ESTOQUE, fmtM3, fmtNum, formatarDia } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";
import type { TipoEstoque } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Estoque de madeira" };

export default async function EstoquePage() {
  const eu = await exigirProducao();
  const levantamentos = await db.levantamentoEstoque.findMany({
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    take: 60,
    include: { itens: true, responsavel: { select: { nome: true } } },
  });
  const tipos = Object.keys(TIPO_ESTOQUE) as TipoEstoque[];
  const ultimo = Object.fromEntries(tipos.map((t) => [t, levantamentos.find((l) => l.tipo === t)])) as Record<TipoEstoque, (typeof levantamentos)[number] | undefined>;
  const m3 = (l: { itens: { m3: number }[] }) => l.itens.reduce((s, i) => s + i.m3, 0);

  return (
    <>
      <Titulo
        subtitulo="Levantamentos do pátio (madeira verde) e da madeira seca empacotada"
        acao={
          podeProducao(eu, "lancar") && (
            <BotaoLink href="/producao/estoque/novo">
              <Plus className="h-4 w-4" /> Novo levantamento
            </BotaoLink>
          )
        }
      >
        Estoque de madeira
      </Titulo>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {tipos.map((t) => {
          const l = ultimo[t];
          // Agrupa por espessura para a visão rápida
          const porEsp = new Map<number, number>();
          for (const i of l?.itens ?? []) porEsp.set(i.espessura, (porEsp.get(i.espessura) ?? 0) + i.m3);
          const linhas = [...porEsp].sort((a, b) => a[0] - b[0]);
          const maior = Math.max(1e-9, ...linhas.map((x) => x[1]));
          return (
            <section key={t} className="cartao">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{TIPO_ESTOQUE[t]}</h2>
                {l && <span className="text-xs text-stone-500">em {formatarDia(l.data)}</span>}
              </div>
              {l ? (
                <>
                  <div className="mb-3 text-2xl font-bold tabular-nums">{fmtM3(m3(l), 1)}</div>
                  <ul className="space-y-1.5">
                    {linhas.map(([e, v]) => (
                      <li key={e} className="flex items-center gap-2 text-xs">
                        <span className="w-12 shrink-0 tabular-nums text-stone-500">{e} mm</span>
                        <div className="h-3 flex-1">
                          <div className="h-full rounded-r-[4px] bg-[#2a78d6]" style={{ width: `${Math.max(2, (v / maior) * 100)}%` }} />
                        </div>
                        <span className="w-16 shrink-0 text-right font-semibold tabular-nums">{fmtNum(v, 1)} m³</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-stone-500">Nenhum levantamento ainda.</p>
              )}
            </section>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
      {levantamentos.length === 0 ? (
        <Vazio>Nenhum levantamento registrado.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {levantamentos.map((l) => (
            <li key={l.id}>
              <Link href={`/producao/estoque/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <div className="w-20 shrink-0 font-semibold">{formatarDia(l.data)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{TIPO_ESTOQUE[l.tipo]}</div>
                  <div className="text-sm text-stone-500">
                    {fmtM3(m3(l), 2)} · {l.itens.length} bitola(s) · {l.responsavel.nome}
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
