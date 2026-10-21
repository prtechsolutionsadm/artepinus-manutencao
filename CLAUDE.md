# Manutenção Artepinus

Next.js 16 (App Router) + Prisma 7 (client gerado em `src/generated/prisma`, adapter `@prisma/adapter-pg`) + Prisma Postgres (conexão TCP direta em `DATABASE_URL`; local com `npm run db:local`). Interface e código em português.

- Checks: `npx tsc --noEmit` e `npm run build`.
- Mudou `prisma/schema.prisma`? Rode `npx prisma migrate dev --name <nome>` e commite a migration.
- Mutations ficam em `src/app/actions/*` (Server Actions validadas com zod; sempre checar permissão com `exigirPermissao`/`pode` de `src/lib/permissoes.ts`).
- Mudanças de status sempre geram um registro em `HistoricoStatus`.
- Datas: o servidor roda em UTC; use os helpers de `src/lib/constantes.ts` (horário de Brasília).
- Toda ação que altera dados registra em `Auditoria` via `auditar()` de `src/lib/auditoria.ts`.
- Nova requisição: `criarRequisicaoCompleta()` em `src/lib/requisicoes.ts` (usada pelo formulário e pela fila offline `/api/requisicoes/offline`).
- Fotos passam por `processarFoto()` (sharp: 1600px, JPEG, sem EXIF) e são servidas por `/api/anexos/[id]` só para logados.
