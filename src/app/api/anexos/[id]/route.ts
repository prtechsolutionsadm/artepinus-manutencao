import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/session";

/** Serve a foto (ou a miniatura com ?mini=1) apenas para usuários logados. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioAtual())) return new NextResponse("Não autorizado", { status: 401 });
  const { id } = await params;
  const mini = req.nextUrl.searchParams.has("mini");
  const anexo = mini
    ? await db.anexo.findUnique({ where: { id }, select: { mime: true, miniatura: true } }).then((a) => a && { mime: a.mime, bytes: a.miniatura })
    : await db.anexo.findUnique({ where: { id }, select: { mime: true, dados: true } }).then((a) => a && { mime: a.mime, bytes: a.dados });
  if (!anexo) return new NextResponse("Não encontrado", { status: 404 });
  const bytes = anexo.bytes;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": anexo.mime,
      // A foto nunca muda; fica no cache do aparelho, mas não em caches compartilhados
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
