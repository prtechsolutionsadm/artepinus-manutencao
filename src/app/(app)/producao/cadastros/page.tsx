import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { salvarEstufa, salvarMeta, salvarMotivo } from "@/app/actions/producao";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Badge, Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { CENTRO, fmtNum, fmtPct, hojeSP, mesDe, mesesAntes, nomeMes } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";
import type { CentroParada } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Cadastros da produção" };

type Equip = { id: string; codigo: string; nome: string };
type Motivo = { id: string; codigo: number; descricao: string; centro: CentroParada; equipamentoId: string | null; ativo: boolean };
type Estufa = { id: string; numero: number; nome: string; capacidadeM3: number | null; equipamentoId: string | null; ativo: boolean };

function SelectEquipamento({ equipamentos, valor }: { equipamentos: Equip[]; valor?: string | null }) {
  return (
    <select name="equipamentoId" defaultValue={valor ?? ""} className="campo">
      <option value="">—</option>
      {equipamentos.map((e) => (
        <option key={e.id} value={e.id}>
          {e.codigo} · {e.nome}
        </option>
      ))}
    </select>
  );
}

function CamposMotivo({ m, equipamentos }: { m?: Motivo; equipamentos: Equip[] }) {
  return (
    <>
      <input type="hidden" name="id" value={m?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-6">
        <div>
          <label>Código *</label>
          <input name="codigo" inputMode="numeric" required defaultValue={m?.codigo} className="campo" />
        </div>
        <div className="sm:col-span-3">
          <label>Descrição *</label>
          <input name="descricao" required defaultValue={m?.descricao} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Centro</label>
          <select name="centro" defaultValue={m?.centro ?? "OPE"} className="campo">
            {(Object.keys(CENTRO) as CentroParada[]).map((c) => (
              <option key={c} value={c}>
                {CENTRO[c].label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label>Equipamento</label>
          <SelectEquipamento equipamentos={equipamentos} valor={m?.equipamentoId} />
        </div>
        <div className="flex items-end justify-between gap-3 sm:col-span-2">
          <label className="mb-2.5 flex items-center gap-2 font-normal">
            <input type="checkbox" name="ativo" defaultChecked={m?.ativo ?? true} /> Ativo
          </label>
          <BotaoEnviar>{m ? "Salvar" : "Cadastrar"}</BotaoEnviar>
        </div>
      </div>
    </>
  );
}

function CamposEstufa({ e, equipamentos }: { e?: Estufa; equipamentos: Equip[] }) {
  return (
    <>
      <input type="hidden" name="id" value={e?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-6">
        <div>
          <label>Número *</label>
          <input name="numero" inputMode="numeric" required defaultValue={e?.numero} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Nome *</label>
          <input name="nome" required defaultValue={e?.nome} className="campo" />
        </div>
        <div>
          <label>Capacidade (m³)</label>
          <input name="capacidadeM3" inputMode="decimal" defaultValue={e?.capacidadeM3 ?? ""} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Equipamento (manutenção)</label>
          <SelectEquipamento equipamentos={equipamentos} valor={e?.equipamentoId} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name="ativo" defaultChecked={e?.ativo ?? true} /> Ativa
        </label>
        <BotaoEnviar>{e ? "Salvar" : "Cadastrar"}</BotaoEnviar>
      </div>
    </>
  );
}

export default async function CadastrosProducaoPage() {
  await exigirProducao("gerir");
  const [motivos, estufas, metas, equipamentos] = await Promise.all([
    db.motivoParada.findMany({ orderBy: { codigo: "asc" }, include: { equipamento: { select: { nome: true } } } }),
    db.estufa.findMany({ orderBy: { numero: "asc" }, include: { equipamento: { select: { codigo: true } } } }),
    db.metaProducao.findMany({ orderBy: { mes: "desc" }, take: 12 }),
    db.equipamento.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, select: { id: true, codigo: true, nome: true } }),
  ]);
  const atual = mesDe(hojeSP());
  const proximo = mesesAntes(atual, -1);
  const metaAtual = metas.find((m) => m.mes === atual);

  return (
    <>
      <Titulo subtitulo="Metas, estufas e motivos de parada da serraria">Cadastros da produção</Titulo>

      <section className="cartao mb-6">
        <h2 className="mb-1 font-semibold">Meta de produção</h2>
        <p className="mb-3 text-sm text-stone-500">Pré-preenche os boletins do mês e é a base da produtividade (produção ÷ meta).</p>
        <ActionForm action={salvarMeta} className="grid gap-3 sm:grid-cols-5 sm:items-end">
          <div>
            <label htmlFor="mes">Mês</label>
            <select id="mes" name="mes" defaultValue={metaAtual ? proximo : atual} className="campo">
              {[proximo, atual, mesesAntes(atual, 1), mesesAntes(atual, 2)].map((m) => (
                <option key={m} value={m}>
                  {nomeMes(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="metaDiariaM3">Meta diária (m³) *</label>
            <input id="metaDiariaM3" name="metaDiariaM3" inputMode="decimal" required defaultValue={metaAtual?.metaDiariaM3} className="campo" />
          </div>
          <div>
            <label htmlFor="horasDia">Horas por dia *</label>
            <input id="horasDia" name="horasDia" inputMode="decimal" required defaultValue={metaAtual?.horasDia ?? 8.8} className="campo" />
          </div>
          <div>
            <label htmlFor="rendimentoMeta">Rendimento meta (%)</label>
            <input id="rendimentoMeta" name="rendimentoMeta" inputMode="decimal" defaultValue={metaAtual?.rendimentoMeta ? metaAtual.rendimentoMeta * 100 : ""} className="campo" />
          </div>
          <BotaoEnviar>Salvar meta</BotaoEnviar>
        </ActionForm>
        {metas.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {metas.map((m) => (
              <li key={m.id} className="rounded-xl bg-stone-50 px-3 py-1.5">
                <b>{nomeMes(m.mes)}</b>: {fmtNum(m.metaDiariaM3, 1)} m³/dia · {fmtNum(m.horasDia, 1)} h{m.rendimentoMeta ? ` · rend. ${fmtPct(m.rendimentoMeta)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Estufas</h2>
        <details className="cartao mb-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
            <Plus className="h-4 w-4" /> Nova estufa
          </summary>
          <ActionForm action={salvarEstufa} limparAoSalvar className="mt-4">
            <CamposEstufa equipamentos={equipamentos} />
          </ActionForm>
        </details>
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {estufas.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                  <span className="font-medium">{e.nome}</span>
                  {e.capacidadeM3 && <span className="text-sm text-stone-500">{fmtNum(e.capacidadeM3, 1)} m³</span>}
                  {e.equipamento && <span className="font-mono text-xs text-stone-400">{e.equipamento.codigo}</span>}
                  {!e.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativa</Badge>}
                  <Pencil className="ml-auto h-4 w-4 text-stone-400" />
                </summary>
                <ActionForm action={salvarEstufa} className="mt-3">
                  <CamposEstufa e={e} equipamentos={equipamentos} />
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Motivos de parada</h2>
        <p className="mb-3 text-sm text-stone-500">Códigos da planilha da serraria. Desative em vez de excluir para manter o histórico.</p>
        <details className="cartao mb-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
            <Plus className="h-4 w-4" /> Novo motivo
          </summary>
          <ActionForm action={salvarMotivo} limparAoSalvar className="mt-4">
            <CamposMotivo equipamentos={equipamentos} />
          </ActionForm>
        </details>
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {motivos.map((m) => (
            <li key={m.id} className="px-4 py-2.5">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-2">
                  <span className="w-8 shrink-0 font-mono text-sm text-stone-500">{m.codigo}</span>
                  <span className="min-w-0 flex-1 truncate">{m.descricao}</span>
                  <span className="hidden truncate text-xs text-stone-400 sm:inline">{m.equipamento?.nome}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-stone-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: CENTRO[m.centro].hex }} />
                    {CENTRO[m.centro].curto}
                  </span>
                  {!m.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativo</Badge>}
                  <Pencil className="h-4 w-4 shrink-0 text-stone-400" />
                </summary>
                <ActionForm action={salvarMotivo} className="mt-3">
                  <CamposMotivo m={m} equipamentos={equipamentos} />
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
