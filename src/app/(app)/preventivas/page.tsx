import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Pencil, Plus } from "lucide-react";
import { salvarPlano } from "@/app/actions/planejamento";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { BotaoGerarAgora } from "@/components/BotaoGerarAgora";
import { Expansivel } from "@/components/Expansivel";
import { Badge, PrioridadeBadge, Titulo, Vazio } from "@/components/ui";
import { PRIORIDADE, dateParaDataLocal, formatarData } from "@/lib/constantes";
import { db } from "@/lib/db";
import { PERFIS_RESPONSAVEIS } from "@/lib/permissoes";
import { UNIDADES, descreverFrequencia } from "@/lib/preventivas";
import { exigirPermissao } from "@/lib/session";
import type { Prioridade, UnidadeFrequencia } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Preventivas" };

type Opcao = { id: string; nome: string };
type Plano = {
  id: string;
  equipamentoId: string;
  titulo: string;
  descricao: string | null;
  intervalo: number;
  unidade: UnidadeFrequencia;
  proximaData: Date;
  antecedenciaDias: number;
  prioridade: Prioridade;
  responsavelId: string | null;
  checklistId: string | null;
  ativo: boolean;
};

function Campos({ p, equipamentos, responsaveis, checklists, equipamentoInicial }: { p?: Plano; equipamentos: Opcao[]; responsaveis: Opcao[]; checklists: Opcao[]; equipamentoInicial?: string }) {
  return (
    <>
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label>Equipamento *</label>
          <select name="equipamentoId" required defaultValue={p?.equipamentoId ?? equipamentoInicial ?? ""} className="campo">
            <option value="" disabled>
              Escolha…
            </option>
            {equipamentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label>O que será feito *</label>
          <input name="titulo" required defaultValue={p?.titulo} placeholder="Ex.: Troca de óleo e filtros" className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Instruções</label>
          <textarea name="descricao" rows={2} defaultValue={p?.descricao ?? ""} className="campo" placeholder="Opcional: detalhes para o manutentor" />
        </div>
        <div>
          <label>Repetir a cada *</label>
          <div className="flex gap-2">
            <input name="intervalo" type="number" min={1} max={365} required defaultValue={p?.intervalo ?? 1} className="campo w-24" />
            <select name="unidade" defaultValue={p?.unidade ?? "MESES"} className="campo">
              {Object.entries(UNIDADES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.plural}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label>Próxima execução *</label>
          <input name="proximaData" type="datetime-local" required defaultValue={p ? dateParaDataLocal(p.proximaData) : ""} className="campo" />
        </div>
        <div>
          <label>Gerar a requisição com antecedência de</label>
          <div className="flex items-center gap-2">
            <input name="antecedenciaDias" type="number" min={0} max={30} defaultValue={p?.antecedenciaDias ?? 3} className="campo w-24" />
            <span className="mt-1.5 text-sm text-stone-500">dias</span>
          </div>
        </div>
        <div>
          <label>Prioridade</label>
          <select name="prioridade" defaultValue={p?.prioridade ?? "MEDIA"} className="campo">
            {Object.entries(PRIORIDADE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Responsável</label>
          <select name="responsavelId" defaultValue={p?.responsavelId ?? ""} className="campo">
            <option value="">— Supervisores decidem —</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Checklist</label>
          <select name="checklistId" defaultValue={p?.checklistId ?? ""} className="campo">
            <option value="">— Sem checklist —</option>
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name="ativo" defaultChecked={p?.ativo ?? true} /> Ativo
        </label>
        <BotaoEnviar>{p ? "Salvar" : "Criar plano"}</BotaoEnviar>
      </div>
    </>
  );
}

export default async function PreventivasPage({ searchParams }: { searchParams: Promise<{ equipamento?: string }> }) {
  await exigirPermissao("preventivas");
  const { equipamento } = await searchParams;
  const [planos, equipamentos, responsaveis, checklists] = await Promise.all([
    db.planoPreventivo.findMany({
      orderBy: [{ ativo: "desc" }, { proximaData: "asc" }],
      include: {
        equipamento: { select: { codigo: true, nome: true } },
        responsavel: { select: { nome: true } },
        checklist: { select: { nome: true } },
        requisicoes: { select: { id: true, status: true, dataAgendada: true }, orderBy: { id: "desc" }, take: 1 },
      },
    }),
    db.equipamento.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, select: { id: true, codigo: true, nome: true } }),
    db.usuario.findMany({ where: { ativo: true, perfil: { in: PERFIS_RESPONSAVEIS } }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.checklistModelo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const opcoesEquip = equipamentos.map((e) => ({ id: e.id, nome: `${e.codigo} – ${e.nome}` }));
  const agora = new Date();

  return (
    <>
      <Titulo subtitulo="As requisições são criadas automaticamente, já agendadas, todo dia às 7h">Preventivas</Titulo>

      <Expansivel className="cartao mb-6" abertoInicial={!!equipamento || planos.length === 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
          <Plus className="h-4 w-4" /> Novo plano de preventiva
        </summary>
        <ActionForm action={salvarPlano} limparAoSalvar className="mt-4">
          <Campos equipamentos={opcoesEquip} responsaveis={responsaveis} checklists={checklists} equipamentoInicial={equipamento} />
        </ActionForm>
      </Expansivel>

      {planos.length === 0 ? (
        <Vazio>Nenhum plano de preventiva cadastrado.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          {planos.map((p) => {
            const atrasado = p.ativo && p.proximaData < agora;
            const ultima = p.requisicoes[0];
            return (
              <li key={p.id} className="px-4 py-3.5 sm:px-5">
                <details>
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${p.ativo ? "bg-teal-50 text-teal-600" : "bg-stone-100 text-stone-400"}`}>
                      <CalendarClock className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{p.titulo}</span>
                        {p.prioridade !== "MEDIA" && <PrioridadeBadge prioridade={p.prioridade} />}
                        {!p.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Pausado</Badge>}
                      </span>
                      <span className="mt-0.5 block text-sm text-stone-600">
                        {p.equipamento.codigo} – {p.equipamento.nome}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-500">
                        <span>{descreverFrequencia(p.intervalo, p.unidade)}</span>
                        <span className={atrasado ? "font-semibold text-rose-700" : "font-medium text-teal-700"}>Próxima: {formatarData(p.proximaData, true)}</span>
                        {p.responsavel && <span>Resp.: {p.responsavel.nome}</span>}
                        {p.checklist && <span>Checklist: {p.checklist.nome}</span>}
                      </span>
                    </span>
                    <Pencil className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                  </summary>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    {p.ativo && <BotaoGerarAgora planoId={p.id} />}
                    {ultima && (
                      <Link href={`/requisicoes/${ultima.id}`} className="text-marca-700 hover:underline">
                        Última gerada: #{String(ultima.id).padStart(5, "0")}
                      </Link>
                    )}
                  </div>
                  <ActionForm action={salvarPlano} className="mt-3">
                    <Campos p={p} equipamentos={opcoesEquip} responsaveis={responsaveis} checklists={checklists} />
                  </ActionForm>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
