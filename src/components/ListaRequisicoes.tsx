import Link from "next/link";
import { PrioridadeBadge, StatusBadge, Vazio } from "@/components/ui";
import { TIPO, formatarData, numeroRequisicao } from "@/lib/constantes";
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
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {itens.map((r) => (
        <li key={r.id}>
          <Link href={`/requisicoes/${r.id}`} className="block px-4 py-3 hover:bg-stone-50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-stone-500">{numeroRequisicao(r.id)}</span>
              <StatusBadge status={r.status} />
              <PrioridadeBadge prioridade={r.prioridade} />
              <span className="text-xs text-stone-500">{TIPO[r.tipo]}</span>
            </div>
            <div className="mt-1 font-semibold text-stone-900">{r.titulo}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500">
              <span>Aberta em {formatarData(r.criadoEm)} por {r.solicitante.nome}</span>
              {r.setor && <span>Setor: {r.setor.nome}</span>}
              {r.equipamento && (
                <span>
                  Equip.: {r.equipamento.codigo} – {r.equipamento.nome}
                </span>
              )}
              {r.responsavel && <span>Resp.: {r.responsavel.nome}</span>}
              {r.dataAgendada && <span className="font-medium text-cyan-700">Agendada: {formatarData(r.dataAgendada, true)}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
