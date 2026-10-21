import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { atualizarStatus, cancelarPropria, comentar } from "@/app/actions/requisicoes";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { PrioridadeBadge, StatusBadge } from "@/components/ui";
import { STATUS, STATUS_ORDEM, TIPO, dateParaDataLocal, formatarData, numeroRequisicao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { EMPRESA } from "@/lib/empresa";
import { exigirUsuario } from "@/lib/session";
import { PERFIS_RESPONSAVEIS, pode } from "@/lib/permissoes";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Requisição ${numeroRequisicao(Number(id) || 0)}` };
}

export default async function RequisicaoPage({ params }: Params) {
  const eu = await exigirUsuario();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const req = await db.requisicao.findUnique({
    where: { id },
    include: {
      solicitante: { select: { nome: true } },
      responsavel: { select: { id: true, nome: true } },
      setor: true,
      equipamento: true,
      historico: { include: { usuario: { select: { nome: true } } }, orderBy: { criadoEm: "asc" } },
      comentarios: { include: { autor: { select: { nome: true } } }, orderBy: { criadoEm: "asc" } },
    },
  });
  if (!req) notFound();

  const equipe = pode(eu.perfil, "atenderRequisicoes");
  const atribuiOutros = pode(eu.perfil, "atribuirResponsavel");
  const podeCancelar = pode(eu.perfil, "cancelarRequisicoes");
  // Quem atribui escolhe entre supervisores e manutentores; o manutentor só assume para si.
  const tecnicos = equipe
    ? atribuiOutros
      ? await db.usuario.findMany({
          where: { ativo: true, perfil: { in: PERFIS_RESPONSAVEIS } },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : [{ id: eu.id, nome: `${eu.nome} (eu)` }]
    : [];
  if (req.responsavel && !tecnicos.some((t) => t.id === req.responsavel!.id)) tecnicos.unshift(req.responsavel);
  const statusPermitidos = STATUS_ORDEM.filter((s) => s !== "CANCELADA" || podeCancelar || req.status === "CANCELADA");
  const podeDesatribuir = atribuiOutros || !req.responsavel || req.responsavel.id === eu.id;

  const linhaDoTempo = [
    ...req.historico.map((h) => ({ tipo: "status" as const, data: h.criadoEm, h })),
    ...req.comentarios.map((c) => ({ tipo: "comentario" as const, data: c.criadoEm, c })),
  ].sort((a, b) => a.data.getTime() - b.data.getTime());

  return (
    <div className="grid gap-6 lg:grid-cols-3 print:block">
      <div className="space-y-6 lg:col-span-2">
        <div className="nao-imprimir flex items-center justify-between">
          <Link href="/requisicoes" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900">
            <ArrowLeft className="h-4 w-4" /> Requisições
          </Link>
          <BotaoImprimir />
        </div>

        <article className="cartao">
          <div className="mb-4 hidden items-center gap-3 border-b-2 border-marca-600 pb-3 print:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMPRESA.logo} alt="" className="h-14 w-auto" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-marca-600">
                {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}
              </div>
              <div className="text-lg font-bold">Requisição de Manutenção {numeroRequisicao(req.id)}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-stone-500">{numeroRequisicao(req.id)}</span>
            <StatusBadge status={req.status} />
            <PrioridadeBadge prioridade={req.prioridade} />
            <span className="text-sm text-stone-500">{TIPO[req.tipo]}</span>
          </div>
          <h1 className="mt-2 text-xl font-bold">{req.titulo}</h1>
          <p className="mt-3 whitespace-pre-wrap text-stone-700">{req.descricao}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-200 pt-4 text-sm sm:gap-x-6">
            <Dado rotulo="Solicitante">{req.solicitante.nome}</Dado>
            <Dado rotulo="Aberta em">{formatarData(req.criadoEm, true)}</Dado>
            <Dado rotulo="Setor">{req.setor?.nome ?? "—"}</Dado>
            <Dado rotulo="Local">{req.local ?? "—"}</Dado>
            <Dado rotulo="Equipamento">{req.equipamento ? `${req.equipamento.codigo} – ${req.equipamento.nome}` : "—"}</Dado>
            <Dado rotulo="Responsável">{req.responsavel?.nome ?? "Não atribuído"}</Dado>
            <Dado rotulo="Data agendada">{formatarData(req.dataAgendada, true)}</Dado>
            <Dado rotulo="Início da execução">{formatarData(req.dataInicio, true)}</Dado>
            <Dado rotulo="Concluída em">{formatarData(req.dataConclusao, true)}</Dado>
          </dl>

          {req.solucao && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
              <div className="text-xs font-semibold uppercase text-emerald-800">Serviço realizado</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{req.solucao}</p>
            </div>
          )}
        </article>

        <section>
          <h2 className="mb-3 font-semibold">Histórico</h2>
          <ol className="relative space-y-4 border-l-2 border-stone-200 pl-5">
            {linhaDoTempo.map((item) =>
              item.tipo === "status" ? (
                <li key={item.h.id} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-marca-500 ring-4 ring-stone-100" />
                  <div className="text-xs text-stone-500">
                    {formatarData(item.data, true)} · {item.h.usuario.nome}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-sm">
                    {item.h.statusAnterior && item.h.statusAnterior !== item.h.statusNovo ? (
                      <>
                        <StatusBadge status={item.h.statusAnterior} /> → <StatusBadge status={item.h.statusNovo} />
                      </>
                    ) : (
                      <StatusBadge status={item.h.statusNovo} />
                    )}
                  </div>
                  {item.h.observacao && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{item.h.observacao}</p>}
                </li>
              ) : (
                <li key={item.c.id} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-stone-400 ring-4 ring-stone-100" />
                  <div className="text-xs text-stone-500">
                    {formatarData(item.data, true)} · {item.c.autor.nome} comentou
                  </div>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-stone-800 ring-1 ring-stone-200">
                    {item.c.texto}
                  </p>
                </li>
              )
            )}
          </ol>
        </section>

        <ActionForm action={comentar} limparAoSalvar className="cartao nao-imprimir">
          <input type="hidden" name="id" value={req.id} />
          <label htmlFor="texto">Adicionar comentário</label>
          <textarea id="texto" name="texto" rows={3} required className="campo" placeholder="Informações adicionais, fotos enviadas, dúvidas…" />
          <div className="mt-3 flex justify-end">
            <BotaoEnviar className="btn-secundario">Comentar</BotaoEnviar>
          </div>
        </ActionForm>
      </div>

      <aside className="nao-imprimir space-y-6">
        {equipe && (
          <ActionForm action={atualizarStatus} className="cartao space-y-3">
            <h2 className="font-semibold">Atualizar requisição</h2>
            <input type="hidden" name="id" value={req.id} />
            <div>
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={req.status} className="campo">
                {statusPermitidos.map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="responsavelId">Responsável</label>
              <select id="responsavelId" name="responsavelId" defaultValue={req.responsavel?.id ?? ""} className="campo">
                {podeDesatribuir && <option value="">— Não atribuído —</option>}
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dataAgendada">Data agendada</label>
              <input
                id="dataAgendada"
                name="dataAgendada"
                type="datetime-local"
                defaultValue={dateParaDataLocal(req.dataAgendada)}
                className="campo"
              />
              <p className="mt-1 text-xs text-stone-500">Obrigatória para “Agendada”.</p>
            </div>
            <div>
              <label htmlFor="solucao">Serviço realizado</label>
              <textarea id="solucao" name="solucao" rows={3} defaultValue={req.solucao ?? ""} className="campo" />
              <p className="mt-1 text-xs text-stone-500">Obrigatório para “Concluída”.</p>
            </div>
            <div>
              <label htmlFor="observacao">Observação / motivo</label>
              <textarea id="observacao" name="observacao" rows={2} className="campo" placeholder="Fica registrado no histórico" />
              <p className="mt-1 text-xs text-stone-500">Obrigatório para “Adiada” e “Cancelada”.</p>
            </div>
            <BotaoEnviar className="btn-primario w-full">Salvar</BotaoEnviar>
          </ActionForm>
        )}

        {!equipe && req.solicitanteId === eu.id && req.status === "ABERTA" && (
          <details className="cartao">
            <summary className="cursor-pointer font-semibold text-rose-700">Cancelar requisição</summary>
            <ActionForm action={cancelarPropria} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={req.id} />
              <label htmlFor="motivo">Motivo</label>
              <textarea id="motivo" name="motivo" rows={2} required className="campo" />
              <BotaoEnviar className="btn-perigo w-full">Confirmar cancelamento</BotaoEnviar>
            </ActionForm>
          </details>
        )}
      </aside>
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
