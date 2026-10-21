import Link from "next/link";
import { PRIORIDADE, STATUS } from "@/lib/constantes";
import type { Prioridade, StatusRequisicao } from "@/generated/prisma/enums";

export function Badge({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cor}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: StatusRequisicao }) {
  return <Badge cor={STATUS[status].cor}>{STATUS[status].label}</Badge>;
}

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  return <Badge cor={PRIORIDADE[prioridade].cor}>{PRIORIDADE[prioridade].label}</Badge>;
}

export function Titulo({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{children}</h1>
      {acao}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-stone-500">
      {children}
    </div>
  );
}

export function BotaoLink({ href, children, secundario }: { href: string; children: React.ReactNode; secundario?: boolean }) {
  return (
    <Link href={href} className={secundario ? "btn-secundario" : "btn-primario"}>
      {children}
    </Link>
  );
}
