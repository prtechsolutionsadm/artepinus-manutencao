"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, X } from "lucide-react";
import { enviarTeste, removerInscricaoPush, salvarInscricaoPush } from "@/app/actions/notificacoes";

type Estado = "carregando" | "sem-suporte" | "instalar-ios" | "bloqueado" | "desativado" | "ativo";

const CHAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const DISPENSADO = "artepinus:push-dispensado";

function chaveParaBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function registro() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

function useEstadoPush() {
  const [estado, setEstado] = useState<Estado>("carregando");
  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !CHAVE) {
        setEstado(ios && !instalado ? "instalar-ios" : "sem-suporte");
        return;
      }
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const inscricao = await (await registro()).pushManager.getSubscription();
      setEstado(inscricao && Notification.permission === "granted" ? "ativo" : "desativado");
    })().catch(() => setEstado("sem-suporte"));
  }, []);
  return [estado, setEstado] as const;
}

async function ativar() {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desativado";
  const reg = await registro();
  await navigator.serviceWorker.ready;
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE) }));
  await salvarInscricaoPush(inscricao.toJSON());
  await enviarTeste();
  return "ativo";
}

/** Cartão completo para a página de perfil. */
export function AtivarPush() {
  const [estado, setEstado] = useEstadoPush();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const executar = async (fn: () => Promise<Estado>) => {
    setOcupado(true);
    setErro("");
    try {
      setEstado(await fn());
    } catch {
      setErro("Não foi possível ativar neste aparelho. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  };

  const desativar = async (): Promise<Estado> => {
    const inscricao = await (await registro()).pushManager.getSubscription();
    if (inscricao) {
      await removerInscricaoPush(inscricao.endpoint);
      await inscricao.unsubscribe();
    }
    return "desativado";
  };

  return (
    <div className="cartao space-y-3">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${estado === "ativo" ? "bg-marca-100 text-marca-700" : "bg-stone-100 text-stone-500"}`}>
          {estado === "ativo" ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div>
          <h2 className="font-semibold">Notificações neste aparelho</h2>
          <p className="text-sm text-stone-500">
            {estado === "carregando" && "Verificando…"}
            {estado === "ativo" && "Ativadas. Você recebe avisos mesmo com o sistema fechado."}
            {estado === "desativado" && "Receba avisos de novas requisições, mudanças de status e lembretes do dia."}
            {estado === "bloqueado" &&
              "As notificações foram bloqueadas no navegador. Libere nas configurações do site (ícone de cadeado ao lado do endereço) e recarregue a página."}
            {estado === "instalar-ios" &&
              "No iPhone, primeiro instale o app: toque em Compartilhar → “Adicionar à Tela de Início” e abra o sistema pelo ícone."}
            {estado === "sem-suporte" && "Este navegador não suporta notificações push. Os avisos continuam aparecendo no sininho."}
          </p>
        </div>
      </div>
      {estado === "desativado" && (
        <button className="btn-primario w-full sm:w-auto" disabled={ocupado} onClick={() => executar(ativar)}>
          <BellRing className="h-4 w-4" /> Ativar notificações
        </button>
      )}
      {estado === "ativo" && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-secundario" disabled={ocupado} onClick={() => executar(async () => (await enviarTeste(), "ativo"))}>
            Enviar notificação de teste
          </button>
          <button className="btn-secundario text-rose-700" disabled={ocupado} onClick={() => executar(desativar)}>
            Desativar neste aparelho
          </button>
        </div>
      )}
      {erro && <p className="text-sm text-rose-700">{erro}</p>}
    </div>
  );
}

/** Faixa discreta no painel inicial, até o usuário ativar ou dispensar. */
export function ConvitePush() {
  const [estado, setEstado] = useEstadoPush();
  const [dispensado, setDispensado] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    try {
      setDispensado(localStorage.getItem(DISPENSADO) === "1");
    } catch {
      setDispensado(false);
    }
  }, []);

  if (dispensado || (estado !== "desativado" && estado !== "instalar-ios")) return null;

  const dispensar = () => {
    setDispensado(true);
    try {
      localStorage.setItem(DISPENSADO, "1");
    } catch {}
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-marca-100 bg-marca-50 p-3 pr-2 sm:p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-marca-700 shadow-sm">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-semibold text-marca-900">Ative as notificações</div>
        <div className="text-marca-700">
          {estado === "instalar-ios"
            ? "No iPhone: Compartilhar → “Adicionar à Tela de Início”, depois ative em Perfil."
            : "Saiba na hora quando houver requisição nova ou mudança de status."}
        </div>
      </div>
      {estado === "desativado" && (
        <button
          className="btn-primario shrink-0 px-3"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            try {
              setEstado(await ativar());
            } catch {
            } finally {
              setOcupado(false);
            }
          }}
        >
          Ativar
        </button>
      )}
      <button onClick={dispensar} aria-label="Dispensar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-marca-700 hover:bg-white/60">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
