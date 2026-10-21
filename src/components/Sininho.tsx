"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { contarNaoLidas, listarNotificacoes, marcarLida, marcarTodasLidas } from "@/app/actions/notificacoes";

type Item = Awaited<ReturnType<typeof listarNotificacoes>>["itens"][number];

function tempoRelativo(d: Date) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} d`;
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function Sininho({ naoLidasInicial }: { naoLidasInicial: number }) {
  const [naoLidas, setNaoLidas] = useState(naoLidasInicial);
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const atualizarContagem = useCallback(() => {
    contarNaoLidas().then(setNaoLidas).catch(() => {});
  }, []);

  const carregar = useCallback(() => {
    listarNotificacoes()
      .then((r) => {
        setItens(r.itens);
        setNaoLidas(r.naoLidas);
      })
      .catch(() => {});
  }, []);

  // Contagem: a cada minuto, ao voltar para a aba e quando chega um push
  useEffect(() => {
    const id = setInterval(atualizarContagem, 60_000);
    const aoVoltar = () => document.visibilityState === "visible" && atualizarContagem();
    const aoPush = (e: MessageEvent) => {
      if (e.data?.tipo === "notificacao") {
        atualizarContagem();
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    navigator.serviceWorker?.addEventListener("message", aoPush);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      navigator.serviceWorker?.removeEventListener("message", aoPush);
    };
  }, [atualizarContagem, router]);

  // Contador no ícone do app instalado (quando o aparelho suporta)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (naoLidas > 0) nav.setAppBadge?.(naoLidas).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [naoLidas]);

  // Fecha ao clicar fora / Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const alternar = () => {
    if (!aberto) carregar();
    setAberto(!aberto);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-label={naoLidas ? `Notificações (${naoLidas} não lida${naoLidas > 1 ? "s" : ""})` : "Notificações"}
        aria-expanded={aberto}
        className="relative grid h-10 w-10 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <span className="font-semibold">Notificações</span>
            {naoLidas > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-marca-700 hover:underline"
                onClick={() =>
                  startTransition(async () => {
                    await marcarTodasLidas();
                    carregar();
                  })
                }
              >
                <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {itens === null && <li className="px-4 py-8 text-center text-sm text-stone-400">Carregando…</li>}
            {itens?.length === 0 && <li className="px-4 py-8 text-center text-sm text-stone-400">Nenhuma notificação por aqui.</li>}
            {itens?.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? "/notificacoes"}
                  onClick={() => {
                    setAberto(false);
                    if (!n.lida) {
                      setNaoLidas((c) => Math.max(0, c - 1));
                      marcarLida(n.id).catch(() => {});
                    }
                  }}
                  className={`flex gap-3 border-b border-stone-100 px-4 py-3 hover:bg-stone-50 ${n.lida ? "" : "bg-marca-50/60"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-marca-600"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.lida ? "text-stone-700" : "font-semibold text-stone-900"}`}>{n.titulo}</span>
                    <span className="line-clamp-2 block text-xs text-stone-500">{n.mensagem}</span>
                    <span className="mt-0.5 block text-[11px] text-stone-400">{tempoRelativo(n.criadoEm)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/notificacoes"
            onClick={() => setAberto(false)}
            className="block bg-stone-50 px-4 py-2.5 text-center text-sm font-medium text-marca-700 hover:bg-stone-100"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
