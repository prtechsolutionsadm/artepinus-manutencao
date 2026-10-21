import type { Metadata } from "next";
import { ArrowLeft, Camera, Check, Clock, ListChecks, OctagonAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  aplicarChecklist,
  atualizarStatus,
  cancelarPropria,
  comentar,
  enviarFotos,
  marcarItemChecklist,
  registrarHoras,
  removerHoras,
} from "@/app/actions/requisicoes";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Galeria } from "@/components/Galeria";
import { SeletorFotos } from "@/components/SeletorFotos";
import { PrioridadeBadge, StatusBadge } from "@/components/ui";
import {
  STATUS,
  STATUS_FINAIS,
  STATUS_ORDEM,
  TIPO,
  dateParaDataLocal,
  formatarData,
  formatarDuracao,
  minutosEntre,
  numeroRequisicao,
} from "@/lib/constantes";
import { db } from "@/lib/db";
import { CREDITO, EMPRESA, direitos } from "@/lib/empresa";
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
      anexos: { select: { id: true, tipo: true, autorId: true, criadoEm: true, autor: { select: { nome: true } } }, orderBy: { criadoEm: "asc" } },
      apontamentos: { include: { usuario: { select: { nome: true } } }, orderBy: { inicio: "desc" } },
      checklist: { include: { feitoPor: { select: { nome: true } } }, orderBy: { ordem: "asc" } },
      plano: { select: { id: true, titulo: true } },
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
  const apontaHoras = pode(eu.perfil, "apontarHoras");
  const envolvido = equipe || req.solicitanteId === eu.id || req.responsavel?.id === eu.id;
  const encerrada = STATUS_FINAIS.includes(req.status);

  const fotoGaleria = (tipo: "PROBLEMA" | "SERVICO") =>
    req.anexos
      .filter((a) => a.tipo === tipo)
      .map((a) => ({ id: a.id, autor: a.autor.nome, quando: formatarData(a.criadoEm, true), podeRemover: a.autorId === eu.id || podeCancelar }));
  const fotosProblema = fotoGaleria("PROBLEMA");
  const fotosServico = fotoGaleria("SERVICO");

  const minutosParada = req.maquinaParada ? minutosEntre(req.paradaInicio, req.paradaFim) : null;
  const totalHoras = req.apontamentos.reduce((t, a) => t + a.minutos, 0);
  const feitos = req.checklist.filter((i) => i.feito).length;
  const [modelosChecklist, manutentores] = apontaHoras
    ? await Promise.all([
        db.checklistModelo.findMany({ where: { ativo: true }, select: { id: true, nome: true, _count: { select: { itens: true } } }, orderBy: { nome: "asc" } }),
        atribuiOutros
          ? db.usuario.findMany({ where: { ativo: true, perfil: { in: PERFIS_RESPONSAVEIS } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
          : Promise.resolve([]),
      ])
    : [[], []];
  const agoraLocal = dateParaDataLocal(new Date());

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
          {req.plano && (
            <p className="mt-1 text-sm text-stone-500">
              Preventiva gerada pelo plano{" "}
              <Link href="/preventivas" className="font-medium text-marca-700 hover:underline">
                {req.plano.titulo}
              </Link>
            </p>
          )}
          {req.maquinaParada && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ${
                req.paradaFim ? "bg-stone-50 text-stone-700 ring-stone-200" : "bg-rose-50 text-rose-800 ring-rose-200"
              }`}
            >
              <OctagonAlert className="h-4 w-4 shrink-0" />
              {req.paradaFim
                ? `Máquina ficou parada ${formatarDuracao(minutosParada)} (de ${formatarData(req.paradaInicio, true)} a ${formatarData(req.paradaFim, true)})`
                : `Máquina parada há ${formatarDuracao(minutosParada)} (desde ${formatarData(req.paradaInicio, true)})`}
            </div>
          )}
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
            <Dado rotulo="Horas trabalhadas">{totalHoras ? formatarDuracao(totalHoras) : "—"}</Dado>
          </dl>

          {req.solucao && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
              <div className="text-xs font-semibold uppercase text-emerald-800">Serviço realizado</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{req.solucao}</p>
            </div>
          )}
          <p className="mt-5 hidden border-t border-stone-200 pt-2 text-center text-[10px] text-stone-400 print:block">
            {direitos()} {CREDITO}
          </p>
        </article>

        {(fotosProblema.length > 0 || fotosServico.length > 0 || (envolvido && !encerrada)) && (
          <section className="cartao space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Camera className="h-4 w-4 text-stone-400" /> Fotos
            </h2>
            {fotosProblema.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Problema</h3>
                <Galeria fotos={fotosProblema} />
              </div>
            )}
            {fotosServico.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Serviço realizado</h3>
                <Galeria fotos={fotosServico} />
              </div>
            )}
            {envolvido && (
              <ActionForm action={enviarFotos} limparAoSalvar className="nao-imprimir space-y-3 border-t border-stone-100 pt-4">
                <input type="hidden" name="id" value={req.id} />
                {equipe && (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2 font-normal">
                      <input type="radio" name="tipo" value="PROBLEMA" defaultChecked={!["EM_ANDAMENTO", "CONCLUIDA"].includes(req.status)} /> Do problema
                    </label>
                    <label className="flex items-center gap-2 font-normal">
                      <input type="radio" name="tipo" value="SERVICO" defaultChecked={["EM_ANDAMENTO", "CONCLUIDA"].includes(req.status)} /> Do serviço realizado
                    </label>
                  </div>
                )}
                <SeletorFotos />
                <BotaoEnviar className="btn-primario">Enviar fotos</BotaoEnviar>
              </ActionForm>
            )}
          </section>
        )}

        {(req.checklist.length > 0 || (apontaHoras && !encerrada && modelosChecklist.length > 0)) && (
          <section className="cartao">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <ListChecks className="h-4 w-4 text-stone-400" /> Checklist
              </h2>
              {req.checklist.length > 0 && (
                <span className={`text-sm font-medium ${feitos === req.checklist.length ? "text-emerald-700" : "text-stone-500"}`}>
                  {feitos} de {req.checklist.length}
                </span>
              )}
            </div>
            {req.checklist.length > 0 && (
              <>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(feitos / req.checklist.length) * 100}%` }} />
                </div>
                <ul className="divide-y divide-stone-100">
                  {req.checklist.map((item) => (
                    <li key={item.id}>
                      <form action={marcarItemChecklist.bind(null, item.id, !item.feito)}>
                        <button
                          type="submit"
                          disabled={!apontaHoras || encerrada}
                          className="flex w-full items-start gap-3 py-2.5 text-left disabled:cursor-default"
                        >
                          <span
                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                              item.feito ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white"
                            }`}
                          >
                            {item.feito && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${item.feito ? "text-stone-500 line-through" : "text-stone-800"}`}>{item.texto}</span>
                            {item.feito && item.feitoPor && (
                              <span className="block text-xs text-stone-400">
                                {item.feitoPor.nome} · {formatarData(item.feitoEm, true)}
                              </span>
                            )}
                          </span>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {apontaHoras && !encerrada && modelosChecklist.length > 0 && (
              <ActionForm action={aplicarChecklist} className="nao-imprimir mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
                <input type="hidden" name="id" value={req.id} />
                <div className="min-w-0 flex-1">
                  <label htmlFor="modeloId">{req.checklist.length ? "Adicionar outro checklist" : "Aplicar checklist"}</label>
                  <select id="modeloId" name="modeloId" required defaultValue="" className="campo">
                    <option value="" disabled>
                      Escolha…
                    </option>
                    {modelosChecklist.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m._count.itens} itens)
                      </option>
                    ))}
                  </select>
                </div>
                <BotaoEnviar className="btn-secundario">Aplicar</BotaoEnviar>
              </ActionForm>
            )}
          </section>
        )}

        {(req.apontamentos.length > 0 || apontaHoras) && (
          <section className="cartao">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4 text-stone-400" /> Horas trabalhadas
              </h2>
              {totalHoras > 0 && <span className="text-sm font-semibold">{formatarDuracao(totalHoras)}</span>}
            </div>
            {req.apontamentos.length > 0 && (
              <ul className="mb-3 divide-y divide-stone-100">
                {req.apontamentos.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div>
                        <span className="font-medium">{a.usuario.nome}</span> · {formatarDuracao(a.minutos)}
                      </div>
                      <div className="text-xs text-stone-500">
                        {formatarData(a.inicio, true)}
                        {a.descricao ? ` · ${a.descricao}` : ""}
                      </div>
                    </div>
                    {(a.usuarioId === eu.id || atribuiOutros) && (
                      <form action={removerHoras.bind(null, a.id)} className="nao-imprimir">
                        <button aria-label="Remover lançamento" className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {apontaHoras && (
              <ActionForm action={registrarHoras} limparAoSalvar className="nao-imprimir grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 sm:grid-cols-4">
                <input type="hidden" name="id" value={req.id} />
                <div className="col-span-2">
                  <label htmlFor="inicio">Quando começou</label>
                  <input id="inicio" name="inicio" type="datetime-local" required max={agoraLocal} defaultValue={agoraLocal} className="campo" />
                </div>
                <div>
                  <label htmlFor="horas">Horas</label>
                  <input id="horas" name="horas" type="number" min={0} max={24} defaultValue={1} inputMode="numeric" className="campo" />
                </div>
                <div>
                  <label htmlFor="minutos">Minutos</label>
                  <input id="minutos" name="minutos" type="number" min={0} max={59} step={5} defaultValue={0} inputMode="numeric" className="campo" />
                </div>
                {manutentores.length > 0 && (
                  <div className="col-span-2">
                    <label htmlFor="usuarioId">Quem trabalhou</label>
                    <select id="usuarioId" name="usuarioId" defaultValue="" className="campo">
                      <option value="">Eu ({eu.nome})</option>
                      {manutentores
                        .filter((m) => m.id !== eu.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div className={manutentores.length > 0 ? "col-span-2" : "col-span-2 sm:col-span-4"}>
                  <label htmlFor="descHoras">O que foi feito (opcional)</label>
                  <input id="descHoras" name="descricao" maxLength={500} className="campo" />
                </div>
                <div className="col-span-2 flex justify-end sm:col-span-4">
                  <BotaoEnviar className="btn-secundario">Registrar horas</BotaoEnviar>
                </div>
              </ActionForm>
            )}
          </section>
        )}

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
            <fieldset className="space-y-3 rounded-xl border border-stone-200 p-3">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" name="maquinaParada" defaultChecked={req.maquinaParada} className="h-4 w-4 accent-rose-600" /> Máquina parada
              </label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="paradaInicio">Parada desde</label>
                  <input id="paradaInicio" name="paradaInicio" type="datetime-local" max={agoraLocal} defaultValue={dateParaDataLocal(req.paradaInicio)} className="campo" />
                </div>
                <div>
                  <label htmlFor="paradaFim">Voltou a operar em</label>
                  <input id="paradaFim" name="paradaFim" type="datetime-local" max={agoraLocal} defaultValue={dateParaDataLocal(req.paradaFim)} className="campo" />
                  <p className="mt-1 text-xs text-stone-500">Ao concluir, se vazio, usa a hora da conclusão.</p>
                </div>
              </div>
            </fieldset>
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
