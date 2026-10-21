import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Prisma Postgres via conexão TCP direta (postgres://...@db.prisma.io), que já tem pool embutido.
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (connectionString?.startsWith("prisma+postgres://")) {
    throw new Error("DATABASE_URL deve ser a string TCP direta (postgres://...), não a prisma+postgres://");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
