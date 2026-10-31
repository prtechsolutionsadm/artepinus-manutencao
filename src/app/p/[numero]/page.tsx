import { redirect } from "next/navigation";

/** Link curto gravado no QR da etiqueta: abre a história do pacote (o login é exigido pelo proxy). */
export default async function LinkPacote({ params }: { params: Promise<{ numero: string }> }) {
  const n = Number((await params).numero);
  redirect(Number.isInteger(n) && n > 0 ? `/producao/pacotes/${n}` : "/producao/escanear");
}
