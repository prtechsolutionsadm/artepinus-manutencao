// Escolhe o driver do banco (sem "server-only": também é usado pelo seed no build).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

export function urlDoBanco() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  if (url.startsWith("prisma+postgres://")) {
    throw new Error("DATABASE_URL deve ser a string TCP direta (postgres://...), não a prisma+postgres://");
  }
  return url;
}

/**
 * Prisma Postgres (db.prisma.io): driver serverless por HTTP/WebSocket, que não segura
 * conexões abertas — na Vercel, cada instância com um pool TCP estourava o limite de conexões.
 * Outros Postgres (local / `prisma dev`): conexão TCP com pool pequeno.
 */
export function criarAdaptador() {
  const url = urlDoBanco();
  if (new URL(url).hostname.endsWith("prisma.io")) return new PrismaPostgresAdapter({ connectionString: url });
  return new PrismaPg({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
}
