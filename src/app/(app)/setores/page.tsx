import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { salvarSetor } from "@/app/actions/admin";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Titulo } from "@/components/ui";
import { db } from "@/lib/db";
import { exigirPermissao } from "@/lib/session";

export const metadata: Metadata = { title: "Setores" };

export default async function SetoresPage() {
  await exigirPermissao("setores");
  const setores = await db.setor.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { equipamentos: true, requisicoes: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo>Setores</Titulo>
      <ActionForm action={salvarSetor} limparAoSalvar className="cartao mb-6">
        <label htmlFor="nome">Novo setor</label>
        <div className="flex gap-2">
          <input id="nome" name="nome" required placeholder="Ex.: Serraria" className="campo" />
          <BotaoEnviar className="btn-primario mt-1.5">Adicionar</BotaoEnviar>
        </div>
      </ActionForm>
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {setores.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                <span className="font-medium">{s.nome}</span>
                <span className="flex items-center gap-2 text-xs text-stone-500">
                  {s._count.equipamentos} equipamento{s._count.equipamentos === 1 ? "" : "s"} · {s._count.requisicoes} req.
                  <Pencil className="h-4 w-4 text-stone-400" />
                </span>
              </summary>
              <ActionForm action={salvarSetor} className="mt-3 flex flex-wrap gap-2 [&>input]:w-auto [&>input]:min-w-0 [&>input]:flex-1">
                <input type="hidden" name="id" value={s.id} />
                <input name="nome" defaultValue={s.nome} required className="campo" aria-label="Nome do setor" />
                <BotaoEnviar className="btn-secundario mt-1.5">Salvar</BotaoEnviar>
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
