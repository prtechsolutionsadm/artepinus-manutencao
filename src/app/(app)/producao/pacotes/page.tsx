import type { Metadata } from "next";
import Link from "next/link";
import { Plus, QrCode } from "lucide-react";
import { ListaPacotes } from "@/components/producao/ListaPacotes";
import { BotaoLink, Titulo, Vazio } from "@/components/ui";
import { formatarData } from "@/lib/constantes";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { fmtM3, fmtNum } from "@/lib/producao";
import { STATUS_EM_ESTOQUE, STATUS_PACOTE, bitola, numeroDoCodigo } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusPacote } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Pacotes" };

const FILTROS: { valor: string; rotulo: string }[] = [
  { valor: "estoque", rotulo: "Em estoque" },
  { valor: "VERDE", rotulo: "Verdes" },
  { valor: "EM_ESTUFA", rotulo: "Na estufa" },
  { valor: "SECO", rotulo: "Secos" },
  { valor: "EXPEDIDO", rotulo: "Expedidos" },
  { valor: "todos", rotulo: "Todos" },
];

export default async function PacotesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; boletim?: string; ciclo?: string }> }) {
  const eu = await exigirProducao();
  const { status = "estoque", q = "", boletim, ciclo } = await searchParams;
  const where: Prisma.PacoteWhereInput = {};
  if (boletim) where.boletimId = boletim;
  if (ciclo) where.cicloId = ciclo;
  if (status === "estoque") where.status = { in: STATUS_EM_ESTOQUE };
  else if (status in STATUS_PACOTE) where.status = status as StatusPacote;
  const busca = q.trim();
  if (busca) {
    const n = numeroDoCodigo(busca);
    const medidas = busca.match(/^(\d+)\s*[x×*]\s*(\d+)(?:\s*[x×*]\s*(\d+))?$/i);
    if (n && !medidas) where.numero = n;
    else if (medidas) Object.assign(where, { espessura: Number(medidas[1]), largura: Number(medidas[2]), ...(medidas[3] ? { comprimento: Number(medidas[3]) } : {}) });
    else where.OR = [{ cliente: { contains: busca, mode: "insensitive" } }, { localizacao: { contains: busca, mode: "insensitive" } }, { classe: { contains: busca, mode: "insensitive" } }];
  }

  const [pacotes, resumo] = await Promise.all([
    db.pacote.findMany({
      where,
      orderBy: { numero: "desc" },
      take: 300,
      include: { boletim: { select: { data: true } }, ciclo: { select: { numero: true, estufa: { select: { nome: true } } } } },
    }),
    db.pacote.groupBy({ by: ["status"], where: { status: { in: STATUS_EM_ESTOQUE } }, _count: true, _sum: { m3: true } }),
  ]);
  const porStatus = Object.fromEntries(resumo.map((r) => [r.status, r]));

  return (
    <>
      <Titulo
        subtitulo="Cada pacote com etiqueta QR: da floresta à expedição"
        acao={
          <div className="flex flex-wrap gap-2">
            <Link href="/producao/escanear" className="btn-secundario">
              <QrCode className="h-4 w-4" /> Ler QR
            </Link>
            {podeProducao(eu, "lancar") && (
              <BotaoLink href="/producao/pacotes/novo">
                <Plus className="h-4 w-4" /> Formar pacote
              </BotaoLink>
            )}
          </div>
        }
      >
        Pacotes
      </Titulo>

      <dl className="mb-5 grid grid-cols-3 gap-3">
        {STATUS_EM_ESTOQUE.map((s) => (
          <div key={s} className="cartao min-w-0 py-3">
            <dt className="flex items-center gap-1.5 truncate text-xs text-stone-500">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_PACOTE[s].hex }} />
              {STATUS_PACOTE[s].label.split(" ·")[0]}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{fmtNum(porStatus[s]?._count ?? 0)}</dd>
            <dd className="truncate text-xs text-stone-500">{fmtM3(porStatus[s]?._sum.m3 ?? 0, 1)}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <nav aria-label="Situação" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={`/producao/pacotes?status=${f.valor}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`}
              aria-current={status === f.valor ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
                status === f.valor ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {f.rotulo}
            </Link>
          ))}
        </nav>
        <form className="w-full sm:ml-auto sm:w-72">
          <input type="hidden" name="status" value={status} />
          <input name="q" type="search" defaultValue={busca} placeholder="Código, bitola (25x100) ou cliente" aria-label="Buscar pacotes" className="campo py-1.5" />
        </form>
      </div>

      {pacotes.length === 0 ? (
        <Vazio>
          Nenhum pacote encontrado.{" "}
          {podeProducao(eu, "lancar") && (
            <Link href="/producao/pacotes/novo" className="font-medium text-marca-700 underline">
              Formar um pacote
            </Link>
          )}
        </Vazio>
      ) : (
        <ListaPacotes
          podeExpedir={podeProducao(eu, "lancar")}
          linhas={pacotes.map((p) => ({
            numero: p.numero,
            status: p.status,
            bitola: bitola(p),
            pecas: p.pecas,
            m3: p.m3,
            classe: p.classe,
            local: p.localizacao,
            quando: formatarData(p.criadoEm),
            origem: p.ciclo ? `${p.ciclo.estufa.nome}${p.ciclo.numero ? ` nº ${p.ciclo.numero}` : ""}` : p.boletim ? `serrado ${p.boletim.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : "—",
          }))}
        />
      )}
      {pacotes.length === 300 && <p className="mt-2 text-xs text-stone-500">Mostrando os 300 mais recentes. Use a busca para encontrar outros.</p>}
    </>
  );
}
