import type { Metadata } from "next";
import Link from "next/link";
import { salvarEquipamento } from "@/app/actions/admin";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Badge, Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Equipamentos" };

type Equip = { id: string; codigo: string; nome: string; descricao: string | null; setorId: string | null; ativo: boolean };

function CamposEquipamento({ e, setores }: { e?: Equip; setores: { id: string; nome: string }[] }) {
  return (
    <>
      <input type="hidden" name="id" value={e?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label>Código / TAG *</label>
          <input name="codigo" defaultValue={e?.codigo} required placeholder="LIX-02" className="campo uppercase" />
        </div>
        <div className="sm:col-span-2">
          <label>Nome *</label>
          <input name="nome" defaultValue={e?.nome} required placeholder="Lixadeira de cinta" className="campo" />
        </div>
        <div>
          <label>Setor</label>
          <select name="setorId" defaultValue={e?.setorId ?? ""} className="campo">
            <option value="">—</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label>Descrição</label>
          <input name="descricao" defaultValue={e?.descricao ?? ""} placeholder="Fabricante, modelo, nº de série…" className="campo" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name="ativo" defaultChecked={e?.ativo ?? true} /> Ativo
        </label>
        <BotaoEnviar>{e ? "Salvar" : "Cadastrar"}</BotaoEnviar>
      </div>
    </>
  );
}

export default async function EquipamentosPage() {
  await exigirUsuario(["ADMIN", "MANUTENCAO"]);
  const [equipamentos, setores] = await Promise.all([
    db.equipamento.findMany({
      orderBy: [{ ativo: "desc" }, { codigo: "asc" }],
      include: { setor: true, _count: { select: { requisicoes: true } } },
    }),
    db.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <>
      <Titulo>Equipamentos</Titulo>
      <details className="cartao mb-6">
        <summary className="cursor-pointer font-semibold text-marca-700">+ Cadastrar equipamento</summary>
        <ActionForm action={salvarEquipamento} limparAoSalvar className="mt-4">
          <CamposEquipamento setores={setores} />
        </ActionForm>
      </details>

      {equipamentos.length === 0 ? (
        <Vazio>Nenhum equipamento cadastrado.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {equipamentos.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{e.codigo}</span>
                  <span>{e.nome}</span>
                  {e.setor && <span className="text-xs text-stone-500">· {e.setor.nome}</span>}
                  {!e.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativo</Badge>}
                  <span className="ml-auto text-xs text-stone-500">✏️</span>
                </summary>
                <div className="mt-2 text-sm">
                  <Link href={`/requisicoes?q=${encodeURIComponent(e.codigo)}`} className="text-marca-600 hover:underline">
                    Ver histórico de manutenção ({e._count.requisicoes})
                  </Link>
                </div>
                <ActionForm action={salvarEquipamento} className="mt-3">
                  <CamposEquipamento e={e} setores={setores} />
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
