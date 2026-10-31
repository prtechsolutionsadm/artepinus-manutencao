import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, lerSessao } from "@/lib/jwt";

/** O site da empresa e o login são abertos; o resto é o sistema (precisa estar logado). */
const ROTAS_PUBLICAS = ["/", "/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.includes(path);
  const sessao = await lerSessao(req.cookies.get(SESSION_COOKIE)?.value);

  if (!publica && !sessao) {
    const login = new URL("/login", req.nextUrl);
    if (path !== "/sistema") login.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (path === "/login" && sessao) {
    return NextResponse.redirect(new URL("/sistema", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
