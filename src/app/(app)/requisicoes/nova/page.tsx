import type { Metadata } from "next";
import { criarRequisicao } from "@/app/actions/requisicoes";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Titulo } from "@/components/ui";
import { PRIORIDADE, TIPO } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Nova requisição" };

export default async function NovaRequisicaoPage() {
  const eu = await exigirUsuario();
  const [setores, equipamentos] = await Promise.all([
    db.setor.findMany({ orderBy: { nome: "asc" } }),
    db.equipamento.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" }, include: { setor: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo>Nova requisição de manutenção</Titulo>
      <ActionForm action={criarRequisicao} className="cartao space-y-4">
        <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
          Solicitante: <strong className="text-stone-900">{eu.nome}</strong> · Data: {new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </div>
        <div>
          <label htmlFor="titulo">O que precisa ser feito? *</label>
          <input id="titulo" name="titulo" required maxLength={120} placeholder="Ex.: Lixadeira 02 fazendo barulho no rolamento" className="campo" />
        </div>
        <div>
          <label htmlFor="descricao">Descrição detalhada *</label>
          <textarea id="descricao" name="descricao" required rows={5} placeholder="Descreva o problema, quando começou, se a máquina está parada…" className="campo" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" defaultValue="CORRETIVA" className="campo">
              {Object.entries(TIPO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prioridade">Prioridade</label>
            <select id="prioridade" name="prioridade" defaultValue="MEDIA" className="campo">
              {Object.entries(PRIORIDADE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="setorId">Setor</label>
            <select id="setorId" name="setorId" defaultValue="" className="campo">
              <option value="">Mesmo do equipamento</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="equipamentoId">Equipamento</label>
            <select id="equipamentoId" name="equipamentoId" defaultValue="" className="campo">
              <option value="">— Não se aplica / não sei —</option>
              {equipamentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} – {e.nome}
                  {e.setor ? ` (${e.setor.nome})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="local">Local</label>
          <input id="local" name="local" maxLength={120} placeholder="Ex.: Galpão 2, próximo à expedição" className="campo" />
        </div>
        <div className="flex justify-end">
          <BotaoEnviar>Abrir requisição</BotaoEnviar>
        </div>
      </ActionForm>
    </div>
  );
}
