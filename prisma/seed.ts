// Dados iniciais. Seguro para rodar várias vezes (roda a cada deploy na Vercel):
// só cria o que ainda não existe e nunca altera usuários ou senhas existentes.
// Uso: npm run db:seed   (SEED_DEMO=1 também cria usuários/requisições de exemplo)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL }),
});

const SETORES = ["Administrativo", "Produção", "Serraria", "Acabamento", "Expedição", "Manutenção"];

// Administrador inicial. A senha provisória precisa ser trocada no primeiro acesso.
const ADMIN = { login: "pablo.ribas", nome: "Pablo Ribas", senha: "123456" };

async function main() {
  if ((await db.setor.count()) === 0) {
    await db.setor.createMany({ data: SETORES.map((nome) => ({ nome })) });
    console.log("Setores iniciais criados");
  }

  if (!(await db.usuario.findUnique({ where: { login: ADMIN.login } }))) {
    await db.usuario.create({
      data: {
        login: ADMIN.login,
        nome: ADMIN.nome,
        perfil: "ADMIN",
        senhaHash: await bcrypt.hash(ADMIN.senha, 10),
        trocarSenha: true,
      },
    });
    console.log(`Admin criado: ${ADMIN.login} (troca de senha obrigatória no primeiro acesso)`);
  }

  if (process.env.SEED_DEMO === "1") await demo();
}

async function demo() {
  const admin = await db.usuario.findUniqueOrThrow({ where: { login: ADMIN.login } });
  const producao = await db.setor.findUniqueOrThrow({ where: { nome: "Produção" } });
  const serraria = await db.setor.findUniqueOrThrow({ where: { nome: "Serraria" } });
  const senhaHash = await bcrypt.hash("teste123", 10);

  const tecnico = await db.usuario.upsert({
    where: { login: "joao.tecnico" },
    update: {},
    create: { login: "joao.tecnico", nome: "João Técnico", perfil: "MANUTENCAO", senhaHash },
  });
  const operador = await db.usuario.upsert({
    where: { login: "maria.operadora" },
    update: {},
    create: { login: "maria.operadora", nome: "Maria Operadora", perfil: "SOLICITANTE", senhaHash },
  });

  const serra = await db.equipamento.upsert({
    where: { codigo: "SER-01" },
    update: {},
    create: { codigo: "SER-01", nome: "Serra circular múltipla", setorId: serraria.id },
  });
  await db.equipamento.upsert({
    where: { codigo: "LIX-02" },
    update: {},
    create: { codigo: "LIX-02", nome: "Lixadeira de cinta", setorId: producao.id },
  });

  if ((await db.requisicao.count()) > 0) return;
  await db.requisicao.create({
    data: {
      titulo: "Serra com vibração excessiva",
      descricao: "Desde ontem a serra está vibrando muito ao cortar peças largas.",
      prioridade: "ALTA",
      solicitanteId: operador.id,
      setorId: serraria.id,
      equipamentoId: serra.id,
      historico: { create: { statusNovo: "ABERTA", usuarioId: operador.id, observacao: "Requisição aberta" } },
    },
  });
  await db.requisicao.create({
    data: {
      titulo: "Preventiva mensal do compressor",
      descricao: "Troca de óleo e verificação de filtros.",
      tipo: "PREVENTIVA",
      status: "AGENDADA",
      dataAgendada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      solicitanteId: admin.id,
      responsavelId: tecnico.id,
      historico: {
        create: [
          { statusNovo: "ABERTA", usuarioId: admin.id, observacao: "Requisição aberta" },
          { statusAnterior: "ABERTA", statusNovo: "AGENDADA", usuarioId: tecnico.id },
        ],
      },
    },
  });
  console.log("Dados de demonstração criados (logins joao.tecnico / maria.operadora, senha teste123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
