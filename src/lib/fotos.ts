import "server-only";
import sharp from "sharp";

export const MAX_FOTOS_POR_ENVIO = 6;
const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Normaliza a foto: corrige a rotação, limita a 1600px, regrava em JPEG e remove os
 * metadados (EXIF/GPS). Gera também a miniatura usada nas listas.
 */
export async function processarFoto(arquivo: File) {
  if (!TIPOS.includes(arquivo.type)) throw new Error("Formato de imagem não suportado");
  if (arquivo.size > MAX_BYTES) throw new Error("Foto muito grande");
  const original = Buffer.from(await arquivo.arrayBuffer());
  const base = sharp(original, { failOn: "none" }).rotate();
  const { data, info } = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const miniatura = await base.clone().resize({ width: 360, height: 360, fit: "cover" }).jpeg({ quality: 70 }).toBuffer();
  return { mime: "image/jpeg", dados: data, miniatura, largura: info.width, altura: info.height, tamanho: data.length };
}

/** Arquivos de imagem válidos de um FormData (campo "fotos"). */
export function fotosDoForm(form: FormData) {
  return form
    .getAll("fotos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_FOTOS_POR_ENVIO);
}
