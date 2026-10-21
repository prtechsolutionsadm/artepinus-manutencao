# Manutenção Artepinus

Next.js 16 (App Router) + Prisma 7 (client gerado em `src/generated/prisma`, adapter `@prisma/adapter-pg`) + Postgres/Neon. Interface e código em português.

- Checks: `npx tsc --noEmit` e `npm run build`.
- Mudou `prisma/schema.prisma`? Rode `npx prisma migrate dev --name <nome>` e commite a migration.
- Mutations ficam em `src/app/actions/*` (Server Actions validadas com zod; sempre checar permissão com `exigirUsuario`/`ehEquipe`).
- Mudanças de status sempre geram um registro em `HistoricoStatus`.
- Datas: o servidor roda em UTC; use os helpers de `src/lib/constantes.ts` (horário de Brasília).
