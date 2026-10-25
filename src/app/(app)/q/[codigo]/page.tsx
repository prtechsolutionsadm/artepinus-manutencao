import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, OctagonAlert, Plus } from "lucide-react";
import { ListaRequisicoes, selectItemRequisicao } from "@/components/ListaRequisicoes";
import { STATUS_PENDENTES } from "@/lib/constantes";
import { db } from "@/lib/db";
import { pode } from "@/lib/permissoes";
import { exigirModulo } from "@/lib/session";

export const metadata: Metadata = { title: "Equipamento" };

/** Destino do QR Code colado na máquina: abrir requisição ou ver o que está pendente. */
export default async function QrPage({ params }: { params: Promise<{ codigo: string }> }) {
  const eu = await exigirModulo("manutencao");
  const codigo = decodeURIComponent((await params).codigo).toUpperCase();
  const equip = await db.equipamento.findUnique({ where: { codigo }, include: { setor: { select: { nome: true } } } });
  if (!equip) notFound();
  const pendentes = await db.requisicao.findMany({
    where: { equipamentoId: equip.id, status: { in: STATUS_PENDENTES } },
    select: selectItemRequisicao,
    orderBy: { criadoEm: "desc" },
    take: 10,
  });
  const parada = pendentes.some((r) => r.maquinaParada && !r.paradaFim);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="cartao text-center">
        <div className="font-mono text-sm font-semibold text-stone-500">{equip.codigo}</div>
        <h1 className="mt-1 text-2xl font-bold">{equip.nome}</h1>
        {equip.setor && <div className="text-sm text-stone-500">{equip.setor.nome}</div>}
        {!equip.ativo && <p className="mt-2 text-sm font-medium text-stone-500">Equipamento inativo</p>}
        {parada && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            <OctagonAlert className="h-4 w-4" /> Já registrada como parada
          </p>
        )}
        <div className="mt-5 grid gap-2">
          <Link href={`/requisicoes/nova?equipamento=${equip.id}`} className="btn-primario py-3.5 text-base">
            <Plus className="h-5 w-5" /> Abrir requisição para esta máquina
          </Link>
          {pode(eu.perfil, "equipamentos") && (
            <Link href={`/equipamentos/${equip.id}`} className="btn-secundario py-3">
              <History className="h-4 w-4" /> Ficha e histórico completo
            </Link>
          )}
        </div>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">{pendentes.length ? "Requisições em aberto para esta máquina" : "Nenhuma requisição em aberto"}</h2>
        {pendentes.length > 0 && <ListaRequisicoes itens={pendentes} />}
        {pendentes.length > 0 && <p className="mt-2 text-xs text-stone-500">Se o problema já foi registrado acima, comente nele em vez de abrir outra requisição.</p>}
      </section>
    </div>
  );
}
