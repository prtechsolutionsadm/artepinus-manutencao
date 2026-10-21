# Manutenção Artepinus

Sistema web (PWA) para abrir, acompanhar e manter o histórico das requisições de
manutenção da Artepinus — substituindo as requisições em papel.

**Stack:** Next.js 16 (Node.js) · Prisma ORM 7 · Prisma Postgres · Tailwind CSS 4 · hospedagem na Vercel.

## Funcionalidades

- **Login** no formato `nome.sobrenome` + senha — o solicitante fica registrado automaticamente na requisição.
  Senha provisória definida pelo admin precisa ser trocada no primeiro acesso.
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
- **Relatórios** por período, status, tipo, prioridade e setor, com resumo e gráficos;
  exportação em **PDF** (A4 com logo) e **Excel** (.xlsx formatado, com logo e aba de resumo).
- Impressão da requisição com logo (para quem ainda precisa do papel).
- **Responsivo**: menu superior no desktop, barra inferior + menu "Mais" no celular/tablet.
- **Notificações** no sininho e por **push** no celular/computador (ativar em *Perfil*):
  - equipe de manutenção: requisição nova (destaque para urgente/alta), cancelamento e comentários;
  - solicitante: mudança de status e comentários; responsável: quando a requisição é atribuída a ele;
  - lembrete às 7h (Brasília) das manutenções agendadas para o dia (Cron da Vercel, `vercel.json`).
  - No iPhone o push só funciona com o app instalado na tela de início (iOS 16.4+).
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

Login inicial: `pablo.ribas` / `123456` (o sistema pede a troca da senha no primeiro acesso).

Para dados de exemplo: `SEED_DEMO=1 npm run db:seed` (cria `joao.tecnico` e `maria.operadora`, senha `teste123`).

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
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (gere com `npx web-push generate-vapid-keys`)
   - `CRON_SECRET` (qualquer texto aleatório longo)
3. **Migrations e usuário admin** – automáticos: a Vercel usa o script `vercel-build`, que roda
   `prisma migrate deploy` e o seed (cria setores e o admin só se ainda não existirem) antes do build.

**Logo e dados da empresa:** os logos ficam em `public/` (`logo.svg` completo, `logo-branco.svg`, `marca.svg` só com as
árvores e `logo.png` transparente para o Excel); razão social e CNPJ ficam em `src/lib/empresa.ts`.

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
