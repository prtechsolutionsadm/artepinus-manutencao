import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, lerSessao } from "@/lib/jwt";

const ROTAS_PUBLICAS = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.includes(path);
  const sessao = await lerSessao(req.cookies.get(SESSION_COOKIE)?.value);

  if (!publica && !sessao) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (publica && sessao) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
