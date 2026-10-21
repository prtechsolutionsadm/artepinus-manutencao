import type { Metadata } from "next";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { salvarChecklist } from "@/app/actions/planejamento";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Badge, Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { exigirPermissao } from "@/lib/session";

export const metadata: Metadata = { title: "Checklists" };

function Campos({ m }: { m?: { id: string; nome: string; ativo: boolean; itens: { texto: string }[] } }) {
  return (
    <>
      <input type="hidden" name="id" value={m?.id ?? ""} />
      <div>
        <label>Nome *</label>
        <input name="nome" required defaultValue={m?.nome} placeholder="Ex.: Preventiva mensal – serra circular" className="campo" />
      </div>
      <div>
        <label>Itens (um por linha) *</label>
        <textarea
          name="itens"
          required
          rows={Math.max(5, (m?.itens.length ?? 0) + 1)}
          defaultValue={m?.itens.map((i) => i.texto).join("\n")}
          placeholder={"Verificar tensão das correias\nLubrificar rolamentos\nConferir afiação das lâminas\nTestar botão de emergência"}
          className="campo font-mono text-sm"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name="ativo" defaultChecked={m?.ativo ?? true} /> Ativo
        </label>
        <BotaoEnviar>{m ? "Salvar" : "Criar checklist"}</BotaoEnviar>
      </div>
    </>
  );
}

export default async function ChecklistsPage() {
  await exigirPermissao("preventivas");
  const modelos = await db.checklistModelo.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { itens: { orderBy: { ordem: "asc" } }, _count: { select: { planos: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Titulo subtitulo="Listas de verificação aplicadas nas requisições e nas preventivas">Checklists</Titulo>
      <details className="cartao mb-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
          <Plus className="h-4 w-4" /> Novo checklist
        </summary>
        <ActionForm action={salvarChecklist} limparAoSalvar className="mt-4 space-y-3">
          <Campos />
        </ActionForm>
      </details>

      {modelos.length === 0 ? (
        <Vazio>Nenhum checklist cadastrado ainda.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          {modelos.map((m) => (
            <li key={m.id} className="px-4 py-3 sm:px-5">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                  <ListChecks className="h-4 w-4 text-stone-400" />
                  <span className="font-medium">{m.nome}</span>
                  <span className="text-xs text-stone-500">
                    {m.itens.length} itens{m._count.planos ? ` · usado em ${m._count.planos} plano${m._count.planos > 1 ? "s" : ""}` : ""}
                  </span>
                  {!m.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativo</Badge>}
                  <Pencil className="ml-auto h-4 w-4 text-stone-400" />
                </summary>
                <ActionForm action={salvarChecklist} className="mt-3 space-y-3">
                  <Campos m={m} />
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
