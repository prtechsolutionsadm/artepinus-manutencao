"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CloudOff, Loader2 } from "lucide-react";
import { criarRequisicao } from "@/app/actions/requisicoes";
import { SeletorFotos } from "@/components/SeletorFotos";
import { PRIORIDADE, TIPO } from "@/lib/constantes";
import { enfileirar } from "@/lib/fila-offline";

type Props = {
  setores: { id: string; nome: string }[];
  equipamentos: { id: string; codigo: string; nome: string; setor: string | null }[];
  equipamentoInicial?: string;
};

/**
 * Formulário de nova requisição. Sem internet (ou se o envio falhar por conexão),
 * guarda no aparelho e envia sozinho quando a conexão voltar.
 */
export function FormNovaRequisicao({ setores, equipamentos, equipamentoInicial }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvaOffline, setSalvaOffline] = useState(false);

  const guardarOffline = async (dados: FormData) => {
    await enfileirar(dados);
    ref.current?.reset();
    setSalvaOffline(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setErro("");
    setSalvaOffline(false);
    setEnviando(true);
    try {
      if (!navigator.onLine) return await guardarOffline(dados);
      const r = await criarRequisicao(dados);
      if (r.erro) return setErro(r.erro);
      router.push(`/requisicoes/${r.id}`);
    } catch {
      // Falha de rede no meio do envio: não perde o que foi digitado
      await guardarOffline(dados);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form ref={ref} onSubmit={enviar} className="cartao space-y-4">
      {salvaOffline && (
        <div role="status" className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <CloudOff className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Sem internet: requisição guardada no aparelho</div>
            Ela será enviada automaticamente quando a conexão voltar. Você pode abrir outra se precisar.
          </div>
        </div>
      )}
      <fieldset disabled={enviando} className="min-w-0 space-y-4">
        <div>
          <label htmlFor="titulo">O que precisa ser feito? *</label>
          <input id="titulo" name="titulo" required minLength={3} maxLength={120} placeholder="Ex.: Lixadeira 02 fazendo barulho no rolamento" className="campo" />
        </div>
        <div>
          <label htmlFor="descricao">Descrição detalhada *</label>
          <textarea id="descricao" name="descricao" required minLength={5} rows={4} placeholder="Descreva o problema, quando começou…" className="campo" />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3 font-normal has-checked:border-rose-400 has-checked:bg-rose-50">
          <input type="checkbox" name="maquinaParada" className="mt-0.5 h-5 w-5 accent-rose-600" />
          <span>
            <span className="block font-semibold text-rose-800">A máquina está parada</span>
            <span className="block text-sm text-rose-700/80">Marca o início do tempo de máquina parada e avisa a manutenção com prioridade.</span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="equipamentoId">Equipamento</label>
            <select id="equipamentoId" name="equipamentoId" defaultValue={equipamentoInicial ?? ""} className="campo">
              <option value="">— Não se aplica / não sei —</option>
              {equipamentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} – {e.nome}
                  {e.setor ? ` (${e.setor})` : ""}
                </option>
              ))}
            </select>
          </div>
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
            <label htmlFor="local">Local</label>
            <input id="local" name="local" maxLength={120} placeholder="Ex.: Galpão 2, perto da expedição" className="campo" />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-stone-700">Fotos do problema</span>
          <div className="mt-1.5">
            <SeletorFotos />
          </div>
        </div>

        {erro && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
            {erro}
          </p>
        )}
        <div className="flex justify-end">
          <button type="submit" className="btn-primario w-full py-3 sm:w-auto">
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Abrir requisição
          </button>
        </div>
      </fieldset>
    </form>
  );
}
