"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CloudOff, CloudUpload, Trash2, X } from "lucide-react";
import { EVENTO_FILA, descartarDaFila, listarFila, sincronizarFila, type ItemFila } from "@/lib/fila-offline";

/**
 * Envia a fila de requisições feitas sem internet assim que a conexão volta,
 * mantém as páginas offline atualizadas e mostra o que ainda está pendente.
 */
export function SincronizadorOffline() {
  const router = useRouter();
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [online, setOnline] = useState(true);
  const [enviadas, setEnviadas] = useState(0);
  const [aberto, setAberto] = useState(false);

  const atualizar = useCallback(() => {
    listarFila().then(setFila);
  }, []);

  const sincronizar = useCallback(async () => {
    const r = await sincronizarFila();
    if (r.enviadas) {
      setEnviadas(r.enviadas);
      router.refresh();
    }
    atualizar();
  }, [atualizar, router]);

  useEffect(() => {
    setOnline(navigator.onLine);
    atualizar();
    sincronizar();
    const aquecer = () => navigator.serviceWorker?.controller?.postMessage({ tipo: "aquecer" });
    aquecer();
    navigator.serviceWorker?.addEventListener("controllerchange", aquecer);
    const aoOnline = () => (setOnline(true), sincronizar(), aquecer());
    const aoOffline = () => setOnline(false);
    window.addEventListener("online", aoOnline);
    window.addEventListener("offline", aoOffline);
    window.addEventListener(EVENTO_FILA, atualizar);
    const t = setInterval(() => navigator.onLine && sincronizar(), 60_000);
    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", aquecer);
      window.removeEventListener("online", aoOnline);
      window.removeEventListener("offline", aoOffline);
      window.removeEventListener(EVENTO_FILA, atualizar);
      clearInterval(t);
    };
  }, [atualizar, sincronizar]);

  useEffect(() => {
    if (!enviadas) return;
    const t = setTimeout(() => setEnviadas(0), 6000);
    return () => clearTimeout(t);
  }, [enviadas]);

  if (enviadas) {
    return (
      <div role="status" className="nao-imprimir mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
        <CloudUpload className="h-4 w-4" /> {enviadas} requisiç{enviadas > 1 ? "ões feitas" : "ão feita"} sem internet {enviadas > 1 ? "foram enviadas" : "foi enviada"}.
        <button onClick={() => setEnviadas(0)} className="ml-auto" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  if (!online && fila.length === 0) {
    return (
      <div className="nao-imprimir mb-4 flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700 ring-1 ring-stone-200">
        <CloudOff className="h-4 w-4" /> Sem internet. Você pode abrir requisições; elas serão enviadas quando a conexão voltar.
      </div>
    );
  }
  if (fila.length === 0) return null;

  return (
    <div className="nao-imprimir mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
      <div className="flex flex-wrap items-center gap-2">
        <CloudOff className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {fila.length} requisiç{fila.length > 1 ? "ões aguardando" : "ão aguardando"} {online ? "envio" : "internet"}
        </span>
        <button onClick={() => setAberto(!aberto)} className="font-medium underline">
          {aberto ? "Ocultar" : "Ver"}
        </button>
        {online && (
          <button onClick={sincronizar} className="font-medium underline">
            Enviar agora
          </button>
        )}
      </div>
      {aberto && (
        <ul className="mt-2 divide-y divide-amber-200 border-t border-amber-200">
          {fila.map((i) => (
            <li key={i.chave} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{i.titulo}</span>
                <span className="block text-xs text-amber-800/80">
                  {new Date(i.criadoEm).toLocaleString("pt-BR")}
                  {i.fotos.length ? ` · ${i.fotos.length} foto(s)` : ""}
                  {i.erro ? ` · Erro: ${i.erro}` : ""}
                </span>
              </span>
              <button
                onClick={() => confirm("Descartar esta requisição? Ela não será enviada.") && descartarDaFila(i.chave)}
                aria-label="Descartar"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-amber-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
