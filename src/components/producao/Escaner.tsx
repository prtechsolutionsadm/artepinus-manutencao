"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Search } from "lucide-react";
import { numeroDoCodigo } from "@/lib/rastreio";

type Detector = { detect: (fonte: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opcoes: { formats: string[] }) => Detector;

/**
 * Lê o QR da etiqueta pela câmera (BarcodeDetector, disponível no Chrome/Android).
 * Onde não houver, a câmera nativa do celular lê o QR e abre o link; ou digita o código.
 */
export function Escaner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [suportado, setSuportado] = useState<boolean | null>(null);
  const [ligada, setLigada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    setSuportado("BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!ligada) return;
    let parar = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        while (!parar) {
          const lidos = await detector.detect(video.current).catch(() => []);
          const n = lidos.map((l) => numeroDoCodigo(l.rawValue)).find((x) => x);
          if (n) {
            parar = true;
            navigator.vibrate?.(80);
            router.push(`/producao/pacotes/${n}`);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setErro("Não foi possível abrir a câmera. Permita o acesso à câmera ou digite o código.");
        setLigada(false);
      }
    })();
    return () => {
      parar = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [ligada, router]);

  function abrir(e: React.FormEvent) {
    e.preventDefault();
    const n = numeroDoCodigo(codigo);
    if (!n) return setErro("Código inválido. Ex.: PCT-000123 ou 123");
    router.push(`/producao/pacotes/${n}`);
  }

  return (
    <div className="space-y-4">
      {suportado && (
        <section className="cartao overflow-hidden p-0">
          {ligada ? (
            <div className="relative bg-black">
              <video ref={video} playsInline muted className="aspect-square w-full object-cover sm:aspect-video" />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-56 w-56 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              <button type="button" onClick={() => setLigada(false)} className="btn-secundario absolute bottom-3 left-1/2 -translate-x-1/2">
                <CameraOff className="h-4 w-4" /> Fechar câmera
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => (setErro(null), setLigada(true))} className="flex w-full flex-col items-center gap-2 px-6 py-10 text-marca-700">
              <Camera className="h-10 w-10" />
              <span className="text-lg font-semibold">Abrir câmera e ler o QR</span>
              <span className="text-sm text-stone-500">Aponte para a etiqueta do pacote</span>
            </button>
          )}
        </section>
      )}
      {suportado === false && (
        <p className="cartao text-sm text-stone-600">
          Neste aparelho, use a <b>câmera do celular</b> direto na etiqueta: o QR abre a página do pacote. Ou digite o código abaixo.
        </p>
      )}
      <form onSubmit={abrir} className="cartao">
        <label htmlFor="codigo">Código do pacote</label>
        <div className="flex gap-2">
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="PCT-000123"
            autoCapitalize="characters"
            inputMode="text"
            className="campo font-mono"
          />
          <button className="btn-primario shrink-0">
            <Search className="h-4 w-4" /> Abrir
          </button>
        </div>
      </form>
      {erro && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
          {erro}
        </p>
      )}
    </div>
  );
}
