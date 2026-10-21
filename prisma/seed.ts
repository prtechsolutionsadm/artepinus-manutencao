// Cria o administrador inicial e setores básicos. Pode ser rodado mais de uma vez.
// Uso: npm run db:seed   (variáveis opcionais: ADMIN_EMAIL, ADMIN_SENHA, ADMIN_NOME, SEED_DEMO=1)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@artepinus.com.br").toLowerCase();
  const senha = process.env.ADMIN_SENHA ?? "trocar123";

  const setores = ["Administrativo", "Produção", "Serraria", "Acabamento", "Expedição", "Manutenção"];
  for (const nome of setores) {
    await db.setor.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  const manutencao = await db.setor.findUniqueOrThrow({ where: { nome: "Manutenção" } });

  const admin = await db.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nome: process.env.ADMIN_NOME ?? "Administrador",
      perfil: "ADMIN",
      senhaHash: await bcrypt.hash(senha, 10),
      setorId: manutencao.id,
    },
  });
  console.log(`Admin: ${admin.email} (senha inicial: ${process.env.ADMIN_SENHA ? "a definida em ADMIN_SENHA" : senha})`);

  if (process.env.SEED_DEMO === "1") await demo(admin.id);
}

async function demo(adminId: string) {
  const producao = await db.setor.findUniqueOrThrow({ where: { nome: "Produção" } });
  const serraria = await db.setor.findUniqueOrThrow({ where: { nome: "Serraria" } });
  const senhaHash = await bcrypt.hash("teste123", 10);

  const tecnico = await db.usuario.upsert({
    where: { email: "tecnico@artepinus.com.br" },
    update: {},
    create: { email: "tecnico@artepinus.com.br", nome: "João Técnico", perfil: "MANUTENCAO", senhaHash },
  });
  const operador = await db.usuario.upsert({
    where: { email: "operador@artepinus.com.br" },
    update: {},
    create: { email: "operador@artepinus.com.br", nome: "Maria Operadora", perfil: "SOLICITANTE", senhaHash, setorId: producao.id },
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
      solicitanteId: adminId,
      responsavelId: tecnico.id,
      historico: {
        create: [
          { statusNovo: "ABERTA", usuarioId: adminId, observacao: "Requisição aberta" },
          { statusAnterior: "ABERTA", statusNovo: "AGENDADA", usuarioId: tecnico.id },
        ],
      },
    },
  });
  console.log("Dados de demonstração criados (senha dos usuários demo: teste123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
