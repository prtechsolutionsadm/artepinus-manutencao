import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Pencil, Plus, Printer } from "lucide-react";
import { salvarEquipamento } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { CamposEquipamento } from "@/components/CamposEquipamento";
import { Expansivel } from "@/components/Expansivel";
import { ListaRequisicoes, selectItemRequisicao } from "@/components/ListaRequisicoes";
import { Badge } from "@/components/ui";
import { STATUS_PENDENTES, formatarData, formatarDuracao, minutosEntre } from "@/lib/constantes";
import { db } from "@/lib/db";
import { pode } from "@/lib/permissoes";
import { descreverFrequencia } from "@/lib/preventivas";
import { linkEquipamento, qrSvg } from "@/lib/qr";
import { exigirPermissao } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const e = await db.equipamento.findUnique({ where: { id: (await params).id }, select: { codigo: true } });
  return { title: e ? `Equipamento ${e.codigo}` : "Equipamento" };
}

export default async function EquipamentoPage({ params }: Params) {
  const eu = await exigirPermissao("equipamentos");
  const { id } = await params;
  const [equip, setores, historico, stats] = await Promise.all([
    db.equipamento.findUnique({
      where: { id },
      include: {
        setor: true,
        planos: { orderBy: { proximaData: "asc" }, include: { responsavel: { select: { nome: true } } } },
      },
    }),
    db.setor.findMany({ orderBy: { nome: "asc" } }),
    db.requisicao.findMany({ where: { equipamentoId: id }, select: selectItemRequisicao, orderBy: { criadoEm: "desc" }, take: 50 }),
    db.requisicao.findMany({
      where: { equipamentoId: id },
      select: { tipo: true, status: true, criadoEm: true, maquinaParada: true, paradaInicio: true, paradaFim: true, apontamentos: { select: { minutos: true } } },
    }),
  ]);
  if (!equip) notFound();

  const link = await linkEquipamento(equip.codigo);
  const svg = await qrSvg(link);
  const corretivas = stats.filter((r) => r.tipo === "CORRETIVA");
  const minutosParado = stats.reduce((t, r) => t + (r.maquinaParada ? (minutosEntre(r.paradaInicio, r.paradaFim) ?? 0) : 0), 0);
  const minutosTrabalhados = stats.reduce((t, r) => t + r.apontamentos.reduce((s, a) => s + a.minutos, 0), 0);
  const pendentes = stats.filter((r) => STATUS_PENDENTES.includes(r.status)).length;
  const ultimaFalha = corretivas.reduce<Date | null>((m, r) => (!m || r.criadoEm > m ? r.criadoEm : m), null);
  const parada = stats.some((r) => r.maquinaParada && !r.paradaFim && STATUS_PENDENTES.includes(r.status));

  return (
    <div className="space-y-6">
      <Link href="/equipamentos" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> Equipamentos
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="cartao lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-stone-500">{equip.codigo}</span>
            {!equip.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativo</Badge>}
            {parada && <Badge cor="bg-rose-600 text-white ring-rose-700">Parada agora</Badge>}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{equip.nome}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Dado rotulo="Setor">{equip.setor?.nome ?? "—"}</Dado>
            <Dado rotulo="Fabricante">{equip.fabricante ?? "—"}</Dado>
            <Dado rotulo="Modelo">{equip.modelo ?? "—"}</Dado>
            <Dado rotulo="Nº de série">{equip.numeroSerie ?? "—"}</Dado>
          </dl>
          {equip.descricao && <p className="mt-3 text-sm text-stone-600">{equip.descricao}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 sm:grid-cols-4">
            <Numero rotulo="Requisições" valor={stats.length} />
            <Numero rotulo="Falhas (corretivas)" valor={corretivas.length} />
            <Numero rotulo="Tempo parado" valor={formatarDuracao(minutosParado)} />
            <Numero rotulo="Horas de manutenção" valor={formatarDuracao(minutosTrabalhados)} />
          </div>
          <p className="mt-3 text-xs text-stone-500">
            {pendentes} pendente{pendentes === 1 ? "" : "s"} · última falha: {ultimaFalha ? formatarData(ultimaFalha) : "nenhuma registrada"}
          </p>
        </section>

        <section className="cartao flex flex-col items-center text-center">
          <div className="w-44 rounded-xl bg-white p-2 ring-1 ring-stone-200 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-2 font-mono text-sm font-semibold">{equip.codigo}</p>
          <p className="break-all text-xs text-stone-400">{link}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href={`/equipamentos/etiquetas?ids=${equip.id}`} className="btn-secundario">
              <Printer className="h-4 w-4" /> Imprimir etiqueta
            </Link>
            <Link href={`/requisicoes/nova?equipamento=${equip.id}`} className="btn-primario">
              <Plus className="h-4 w-4" /> Requisição
            </Link>
          </div>
        </section>
      </div>

      <section className="cartao">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarClock className="h-4 w-4 text-stone-400" /> Preventivas
          </h2>
          {pode(eu.perfil, "preventivas") && (
            <Link href={`/preventivas?equipamento=${equip.id}`} className="text-sm font-medium text-marca-700 hover:underline">
              + Novo plano
            </Link>
          )}
        </div>
        {equip.planos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum plano de preventiva para este equipamento.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {equip.planos.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className={p.ativo ? "" : "text-stone-400"}>
                  {p.titulo} · {descreverFrequencia(p.intervalo, p.unidade)}
                  {p.responsavel ? ` · ${p.responsavel.nome}` : ""}
                </span>
                <span className="text-teal-700">{p.ativo ? `Próxima: ${formatarData(p.proximaData, true)}` : "Pausado"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Expansivel className="cartao">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
          <Pencil className="h-4 w-4" /> Editar dados do equipamento
        </summary>
        <ActionForm action={salvarEquipamento} className="mt-4">
          <CamposEquipamento e={equip} setores={setores} />
        </ActionForm>
      </Expansivel>

      <section>
        <h2 className="mb-3 font-semibold">Histórico de manutenção</h2>
        <ListaRequisicoes itens={historico} vazio="Nenhuma requisição para este equipamento ainda." />
      </section>
    </div>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{rotulo}</dt>
      <dd className="mt-0.5 text-stone-900">{children}</dd>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div>
      <div className="text-xl font-bold tabular-nums">{valor}</div>
      <div className="text-xs text-stone-500">{rotulo}</div>
    </div>
  );
}
