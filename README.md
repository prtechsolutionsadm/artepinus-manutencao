# Manutenção Artepinus

Sistema web (PWA) para abrir, acompanhar e manter o histórico das requisições de
manutenção da Artepinus — substituindo as requisições em papel.

**Stack:** Next.js 16 (Node.js) · Prisma ORM 7 · Prisma Postgres · Tailwind CSS 4 · hospedagem na Vercel.

## Funcionalidades

- **Login** por e-mail e senha — o solicitante fica registrado automaticamente na requisição.
- **Perfis**
  - *Solicitante*: abre requisições, comenta, acompanha e cancela as próprias enquanto estão abertas.
  - *Manutenção*: altera status, atribui responsável, agenda, registra o serviço realizado, cadastra equipamentos.
  - *Administrador*: tudo acima + usuários e setores.
- **Status:** Aberta · Em análise · Planejada · Agendada · Em andamento · Aguardando peças · Adiada · Concluída · Cancelada.
  - Agendada exige data; Adiada e Cancelada exigem motivo; Concluída exige descrição do serviço.
- **Histórico completo**: toda mudança de status e todo comentário ficam registrados com autor e data/hora.
- Tipo (corretiva, preventiva, preditiva, melhoria) e prioridade (baixa → urgente).
- Painel inicial com indicadores, urgentes, agenda dos próximos 7 dias e "minhas requisições".
- Listagem com busca (nº, título, equipamento) e filtros; histórico por equipamento.
- Agenda com as manutenções agendadas por dia (e alerta das vencidas).
- Impressão da requisição (para quem ainda precisa do papel).
- **PWA**: instalável no celular ("Adicionar à tela inicial"), com tela de "sem conexão".

## Rodando localmente

Pré-requisito: Node.js 20+. O banco local é um Prisma Postgres rodando na sua máquina (`prisma dev`).

```bash
npm install
npm run db:local            # em outro terminal: sobe o Prisma Postgres local e mostra a URL postgres://
cp .env.example .env        # cole a URL postgres:// em DATABASE_URL e defina AUTH_SECRET
npx prisma migrate dev      # cria as tabelas
npm run db:seed             # cria o admin e os setores
npm run dev                 # http://localhost:3000
```

Login inicial: `admin@artepinus.com.br` / `trocar123` (troque em **Perfil** logo após entrar,
ou defina `ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME` antes de rodar o seed).

Para dados de exemplo: `SEED_DEMO=1 npm run db:seed` (cria `tecnico@…` e `operador@…`, senha `teste123`).

## Deploy (Prisma Postgres + Vercel)

1. **Banco** – crie um Prisma Postgres de uma das duas formas:
   - pela Vercel: no projeto, *Storage → Create Database → Prisma Postgres* (Marketplace). As variáveis
     são adicionadas ao projeto automaticamente; ou
   - em [console.prisma.io](https://console.prisma.io): crie o banco e copie a string de conexão.

   Use a string **TCP direta**, que começa com `postgres://…@db.prisma.io:5432/…`, como `DATABASE_URL`.
   (A string `prisma+postgres://` do Accelerate **não** é usada por este projeto.)
2. **Vercel** – importe este repositório do GitHub. Em *Settings → Environment Variables* confira/adicione:
   - `DATABASE_URL` (a `postgres://` direta)
   - `AUTH_SECRET` (gere com `openssl rand -base64 32`)
3. **Migrations e usuário admin** – com a `DATABASE_URL` de produção no seu `.env` local:
   ```bash
   npm run db:deploy   # aplica as migrations
   npm run db:seed     # cria o admin
   ```
   Opcional: para aplicar migrations a cada deploy, altere o *Build Command* da Vercel para
   `prisma migrate deploy && npm run build`.

## Estrutura

```
prisma/schema.prisma        modelos: Usuario, Setor, Equipamento, Requisicao, HistoricoStatus, Comentario
prisma/seed.ts              admin inicial + setores (+ demo)
src/proxy.ts                bloqueia páginas para quem não está logado
src/lib/session.ts          sessão (cookie JWT httpOnly) e permissões
src/app/actions/            Server Actions (login, requisições, cadastros)
src/app/(app)/              páginas autenticadas
public/sw.js                service worker do PWA
```
