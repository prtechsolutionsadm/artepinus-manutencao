import Link from "next/link";
import { CalendarClock, ChevronRight, MapPin, Wrench } from "lucide-react";
import { PrioridadeBadge, StatusBadge, Vazio } from "@/components/ui";
import { STATUS_HEX, TIPO, formatarData, numeroRequisicao } from "@/lib/constantes";
import type { Prioridade, StatusRequisicao, TipoManutencao } from "@/generated/prisma/enums";

export type ItemRequisicao = {
  id: number;
  titulo: string;
  status: StatusRequisicao;
  prioridade: Prioridade;
  tipo: TipoManutencao;
  criadoEm: Date;
  dataAgendada: Date | null;
  solicitante: { nome: string };
  responsavel: { nome: string } | null;
  setor: { nome: string } | null;
  equipamento: { codigo: string; nome: string } | null;
};

export const selectItemRequisicao = {
  id: true,
  titulo: true,
  status: true,
  prioridade: true,
  tipo: true,
  criadoEm: true,
  dataAgendada: true,
  solicitante: { select: { nome: true } },
  responsavel: { select: { nome: true } },
  setor: { select: { nome: true } },
  equipamento: { select: { codigo: true, nome: true } },
} as const;

export function ListaRequisicoes({ itens, vazio = "Nenhuma requisição encontrada." }: { itens: ItemRequisicao[]; vazio?: string }) {
  if (itens.length === 0) return <Vazio>{vazio}</Vazio>;
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
      {itens.map((r) => (
        <li key={r.id}>
          <Link href={`/requisicoes/${r.id}`} className="group flex items-stretch gap-3 px-4 py-3.5 transition hover:bg-stone-50/80 sm:px-5">
            <span className="w-1 shrink-0 rounded-full" style={{ background: STATUS_HEX[r.status] }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-xs text-stone-400">{numeroRequisicao(r.id)}</span>
                <StatusBadge status={r.status} />
                {r.prioridade !== "MEDIA" && r.prioridade !== "BAIXA" && <PrioridadeBadge prioridade={r.prioridade} />}
              </div>
              <div className="mt-1 truncate font-semibold text-stone-900">{r.titulo}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                <span>
                  {TIPO[r.tipo]} · {formatarData(r.criadoEm)} · {r.solicitante.nome}
                </span>
                {r.setor && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {r.setor.nome}
                  </span>
                )}
                {r.equipamento && (
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {r.equipamento.codigo}
                  </span>
                )}
                {r.dataAgendada && r.status === "AGENDADA" && (
                  <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                    <CalendarClock className="h-3 w-3" />
                    {formatarData(r.dataAgendada, true)}
                  </span>
                )}
                {r.responsavel && <span>Resp.: {r.responsavel.nome}</span>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 self-center text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
