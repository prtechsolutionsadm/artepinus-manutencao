import { SignJWT, jwtVerify } from "jose";
import type { Perfil } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "artepinus_sessao";

export type Sessao = {
  userId: string;
  nome: string;
  perfil: Perfil;
};

function chave() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function assinarSessao(sessao: Sessao, expira: Date) {
  return new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(chave());
}

export async function lerSessao(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    return {
      userId: payload.userId as string,
      nome: payload.nome as string,
      perfil: payload.perfil as Perfil,
    };
  } catch {
    return null;
  }
}
