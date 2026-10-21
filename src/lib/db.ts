import { PrismaClient } from "@/generated/prisma/client";
import { criarAdaptador } from "@/lib/adaptador";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter: criarAdaptador() });

// Reaproveita o mesmo cliente entre requisições (dev e instâncias quentes da Vercel)
globalForPrisma.prisma = db;
