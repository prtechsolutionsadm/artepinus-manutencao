// Utilitários de imagem que rodam no navegador (sem "server-only").

/** Reduz a foto para no máximo 1600px e regrava em JPEG, antes de enviar. */
export async function comprimirImagem(arquivo: File, maximo = 1600, qualidade = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", qualidade));
    if (!blob) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Formato que o navegador não decodifica: envia como veio (o servidor tenta converter)
    return arquivo;
  }
}
