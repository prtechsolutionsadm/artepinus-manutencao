import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, OctagonAlert, Plus, QrCode, Wrench } from "lucide-react";
import { salvarEquipamento } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { CamposEquipamento } from "@/components/CamposEquipamento";
import { Expansivel } from "@/components/Expansivel";
import { Badge, Titulo, Vazio } from "@/components/ui";
import { STATUS_PENDENTES } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirPermissao } from "@/lib/session";

export const metadata: Metadata = { title: "Equipamentos" };

export default async function EquipamentosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirPermissao("equipamentos");
  const { q } = await searchParams;
  const busca = q?.trim();
  const [equipamentos, setores] = await Promise.all([
    db.equipamento.findMany({
      where: busca
        ? { OR: [{ codigo: { contains: busca, mode: "insensitive" } }, { nome: { contains: busca, mode: "insensitive" } }] }
        : undefined,
      orderBy: [{ ativo: "desc" }, { codigo: "asc" }],
      include: {
        setor: true,
        _count: { select: { requisicoes: true, planos: { where: { ativo: true } } } },
        requisicoes: { where: { status: { in: STATUS_PENDENTES } }, select: { maquinaParada: true, paradaFim: true } },
      },
    }),
    db.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <>
      <Titulo
        subtitulo="Clique num equipamento para ver a ficha, o histórico e o QR Code"
        acao={
          <Link href="/equipamentos/etiquetas" className="btn-secundario">
            <QrCode className="h-4 w-4" /> Etiquetas QR
          </Link>
        }
      >
        Equipamentos
      </Titulo>

      <Expansivel className="cartao mb-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
          <Plus className="h-4 w-4" /> Cadastrar equipamento
        </summary>
        <ActionForm action={salvarEquipamento} limparAoSalvar className="mt-4">
          <CamposEquipamento setores={setores} />
        </ActionForm>
      </Expansivel>

      <form method="get" className="mb-4">
        <input name="q" type="search" defaultValue={q} placeholder="Buscar por código ou nome…" className="campo max-w-md" />
      </form>

      {equipamentos.length === 0 ? (
        <Vazio>Nenhum equipamento encontrado.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          {equipamentos.map((e) => {
            const parada = e.requisicoes.some((r) => r.maquinaParada && !r.paradaFim);
            return (
              <li key={e.id}>
                <Link href={`/equipamentos/${e.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${parada ? "bg-rose-50 text-rose-600" : "bg-stone-100 text-stone-500"}`}>
                    {parada ? <OctagonAlert className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{e.codigo}</span>
                      <span className="truncate">{e.nome}</span>
                      {!e.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativo</Badge>}
                      {parada && <Badge cor="bg-rose-600 text-white ring-rose-700">Parada</Badge>}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {e.setor?.nome ?? "Sem setor"} · {e._count.requisicoes} requisiç{e._count.requisicoes === 1 ? "ão" : "ões"}
                      {e.requisicoes.length > 0 && ` · ${e.requisicoes.length} pendente${e.requisicoes.length > 1 ? "s" : ""}`}
                      {e._count.planos > 0 && ` · ${e._count.planos} preventiva${e._count.planos > 1 ? "s" : ""}`}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-500" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
