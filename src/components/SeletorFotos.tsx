"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { comprimirImagem } from "@/lib/imagem-cliente";

type Props = { maximo?: number; nome?: string; rotulo?: string };

/**
 * Escolha de fotos (câmera ou galeria). As imagens são comprimidas no aparelho e
 * colocadas num <input type="file" name="fotos"> escondido, que vai junto com o formulário.
 */
export function SeletorFotos({ maximo = 6, nome = "fotos", rotulo = "Adicionar fotos" }: Props) {
  const [fotos, setFotos] = useState<{ arquivo: File; url: string }[]>([]);
  const [processando, setProcessando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const escolher = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  // Mantém o input escondido sincronizado com as fotos escolhidas
  useEffect(() => {
    if (!campo.current) return;
    const dt = new DataTransfer();
    fotos.forEach((f) => dt.items.add(f.arquivo));
    campo.current.files = dt.files;
  }, [fotos]);

  // Formulário limpo (após salvar): limpa as prévias
  useEffect(() => {
    const form = campo.current?.form;
    if (!form) return;
    const limpar = () => setFotos((atual) => (atual.forEach((f) => URL.revokeObjectURL(f.url)), []));
    form.addEventListener("reset", limpar);
    return () => form.removeEventListener("reset", limpar);
  }, []);

  const adicionar = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setProcessando(true);
    const novos = await Promise.all(
      [...lista].slice(0, Math.max(0, maximo - fotos.length)).map(async (f) => {
        const arquivo = await comprimirImagem(f);
        return { arquivo, url: URL.createObjectURL(arquivo) };
      })
    );
    setFotos((atual) => [...atual, ...novos].slice(0, maximo));
    setProcessando(false);
  };

  const remover = (i: number) =>
    setFotos((atual) => {
      URL.revokeObjectURL(atual[i].url);
      return atual.filter((_, n) => n !== i);
    });

  const cheio = fotos.length >= maximo;
  return (
    <div>
      <input ref={campo} type="file" name={nome} multiple hidden tabIndex={-1} aria-hidden />
      <input ref={escolher} type="file" accept="image/*" multiple hidden onChange={(e) => (adicionar(e.target.files), (e.target.value = ""))} />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => (adicionar(e.target.files), (e.target.value = ""))}
      />

      <div className="flex flex-wrap gap-2">
        {fotos.map((f, i) => (
          <div key={f.url} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remover(i)}
              aria-label={`Remover foto ${i + 1}`}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {processando && (
          <div className="grid h-20 w-20 place-items-center rounded-xl bg-stone-100 text-stone-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      {!cheio && (
        <div className={`flex flex-wrap gap-2 ${fotos.length || processando ? "mt-2" : ""}`}>
          <button type="button" onClick={() => camera.current?.click()} className="btn-secundario sm:hidden">
            <Camera className="h-4 w-4" /> Tirar foto
          </button>
          <button type="button" onClick={() => escolher.current?.click()} className="btn-secundario">
            <ImagePlus className="h-4 w-4" /> {rotulo}
          </button>
          <span className="self-center text-xs text-stone-400">até {maximo}</span>
        </div>
      )}
    </div>
  );
}
