import { BotaoEnviar } from "@/components/ActionForm";

export type EquipEditavel = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  setorId: string | null;
  ativo: boolean;
};

export function CamposEquipamento({ e, setores }: { e?: EquipEditavel; setores: { id: string; nome: string }[] }) {
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
        <div>
          <label>Fabricante</label>
          <input name="fabricante" defaultValue={e?.fabricante ?? ""} className="campo" />
        </div>
        <div>
          <label>Modelo</label>
          <input name="modelo" defaultValue={e?.modelo ?? ""} className="campo" />
        </div>
        <div>
          <label>Nº de série</label>
          <input name="numeroSerie" defaultValue={e?.numeroSerie ?? ""} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Observações</label>
          <input name="descricao" defaultValue={e?.descricao ?? ""} placeholder="Ano de compra, localização, cuidados…" className="campo" />
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
