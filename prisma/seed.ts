// Dados iniciais. Seguro para rodar várias vezes (roda a cada deploy na Vercel):
// só cria o que ainda não existe e nunca altera usuários ou senhas existentes.
// Uso: npm run db:seed   (SEED_DEMO=1 também cria usuários/requisições de exemplo)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { criarAdaptador } from "../src/lib/adaptador";
import serraria from "./dados/serraria.json";

// Mesmo driver da aplicação: no build da Vercel isto também confirma que a conexão funciona
const db = new PrismaClient({ adapter: criarAdaptador() });

const SETORES = ["Administrativo", "Produção", "Serraria", "Acabamento", "Expedição", "Manutenção"];

// Administrador inicial. A senha provisória precisa ser trocada no primeiro acesso.
const ADMIN = { login: "pablo.ribas", nome: "Pablo Ribas", senha: "123456" };

async function main() {
  console.log(`Banco: conectado via ${new URL(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "postgres://x").hostname.endsWith("prisma.io") ? "Prisma Postgres (serverless)" : "TCP"}, ${await db.usuario.count()} usuário(s)`);
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

  await catalogoProducao();

  if (process.env.SEED_DEMO === "1") {
    await demo();
    await demoProducao();
  }
}

/** Equipamentos da linha da serraria, motivos de parada e as 6 estufas (só cria o que falta). */
async function catalogoProducao() {
  const setor = await db.setor.upsert({ where: { nome: "Serraria" }, update: {}, create: { nome: "Serraria" } });
  const porNome = new Map<string, string>();
  let criados = 0;
  for (const [i, nome] of serraria.equipamentosLinha.entries()) {
    const codigo = `SER-L${String(i + 1).padStart(2, "0")}`;
    const existente = await db.equipamento.findFirst({ where: { OR: [{ codigo }, { nome: { equals: nome, mode: "insensitive" } }] } });
    const eq = existente ?? (await db.equipamento.create({ data: { codigo, nome, setorId: setor.id, descricao: "Linha de produção da serraria" } }));
    if (!existente) criados++;
    porNome.set(nome, eq.id);
  }

  const motivosExistentes = new Set((await db.motivoParada.findMany({ select: { codigo: true } })).map((m) => m.codigo));
  const novos = serraria.motivos.filter((m) => !motivosExistentes.has(m.codigo));
  if (novos.length) {
    await db.motivoParada.createMany({
      data: novos.map((m) => ({
        codigo: m.codigo,
        descricao: m.descricao,
        centro: m.centro as "MEC" | "ELE" | "OPE",
        equipamentoId: m.equipamento ? (porNome.get(m.equipamento) ?? null) : null,
      })),
    });
  }

  const setorEstufas = await db.setor.upsert({ where: { nome: "Estufas" }, update: {}, create: { nome: "Estufas" } });
  let estufas = 0;
  for (let n = 1; n <= 6; n++) {
    if (await db.estufa.findUnique({ where: { numero: n } })) continue;
    const nome = `Estufa ${String(n).padStart(2, "0")}`;
    const codigo = `EST-${String(n).padStart(2, "0")}`;
    const eq = (await db.equipamento.findUnique({ where: { codigo } })) ?? (await db.equipamento.create({ data: { codigo, nome, setorId: setorEstufas.id } }));
    const vinculado = await db.estufa.findUnique({ where: { equipamentoId: eq.id } });
    await db.estufa.create({ data: { numero: n, nome, equipamentoId: vinculado ? null : eq.id } });
    estufas++;
  }
  if (criados || novos.length || estufas) {
    console.log(`Produção: ${criados} equipamento(s) da linha, ${novos.length} motivo(s) de parada e ${estufas} estufa(s) criados`);
  }
}

async function demo() {
  const admin = await db.usuario.findUniqueOrThrow({ where: { login: ADMIN.login } });
  const producao = await db.setor.findUniqueOrThrow({ where: { nome: "Produção" } });
  const serraria = await db.setor.findUniqueOrThrow({ where: { nome: "Serraria" } });
  const senhaHash = await bcrypt.hash("teste123", 10);

  const tecnico = await db.usuario.upsert({
    where: { login: "joao.tecnico" },
    update: {},
    create: { login: "joao.tecnico", nome: "João Técnico", perfil: "MANUTENTOR", senhaHash },
  });
  await db.usuario.upsert({
    where: { login: "ana.gerente" },
    update: {},
    create: { login: "ana.gerente", nome: "Ana Gerente", perfil: "GERENTE", senhaHash },
  });
  await db.usuario.upsert({
    where: { login: "paulo.supervisor" },
    update: {},
    create: { login: "paulo.supervisor", nome: "Paulo Supervisor", perfil: "SUPERVISOR", senhaHash },
  });
  const operador = await db.usuario.upsert({
    where: { login: "maria.operadora" },
    update: {},
    create: { login: "maria.operadora", nome: "Maria Operadora", perfil: "OPERADOR", senhaHash },
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
  console.log("Dados de demonstração criados (logins ana.gerente, paulo.supervisor, joao.tecnico, maria.operadora; senha teste123)");
}

/** Um mês e meio de boletins, um ciclo de estufa, cargas de toras e estoque (só com SEED_DEMO=1). */
async function demoProducao() {
  const senhaHash = await bcrypt.hash("teste123", 10);
  const encarregado = await db.usuario.upsert({
    where: { login: "carlos.encarregado" },
    update: {},
    create: { login: "carlos.encarregado", nome: "Carlos Encarregado", perfil: "SEM_ACESSO", perfilProducao: "APONTADOR", senhaHash },
  });
  await db.usuario.update({ where: { login: "paulo.supervisor" }, data: { perfilProducao: "SUPERVISOR" } }).catch(() => null);
  if ((await db.boletimProducao.count()) > 0) return;

  const motivos = await db.motivoParada.findMany();
  let semente = 7;
  const aleatorio = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646;
  const hoje = new Date(Date.now() - 3 * 3600e3);
  const mes = (d: Date) => d.toISOString().slice(0, 7);
  for (const m of new Set([mes(hoje), mes(new Date(hoje.getTime() - 45 * 864e5))])) {
    await db.metaProducao.upsert({ where: { mes: m }, update: {}, create: { mes: m, metaDiariaM3: 60, horasDia: 8.8, rendimentoMeta: 0.45 } });
  }
  const bitolas = [
    [25, 100, 3000],
    [25, 125, 3000],
    [32, 150, 2700],
    [50, 100, 2400],
    [19, 85, 2100],
  ];
  for (let i = 45; i >= 1; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - i));
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const itens = bitolas.map(([e, l, c], n) => {
      const pecas = Math.round((n < 2 ? 1500 : 700) * (0.6 + aleatorio() * 0.6));
      return { tipo: "BOM" as "BOM" | "APROVEITAMENTO" | "REFUGO", mercado: "EXTERNO" as "EXTERNO" | "INTERNO", espessura: e, largura: l, comprimento: c, pecas, m3: (e * l * c * pecas) / 1e9 };
    });
    itens.push({ tipo: "APROVEITAMENTO", mercado: "INTERNO", espessura: 19, largura: 70, comprimento: 1500, pecas: Math.round(400 * aleatorio()), m3: 0 });
    itens.push({ tipo: "REFUGO", mercado: "INTERNO", espessura: 25, largura: 100, comprimento: 1000, pecas: Math.round(250 * aleatorio()), m3: 0 });
    for (const it of itens) it.m3 = (it.espessura * it.largura * it.comprimento * it.pecas) / 1e9;
    const paradas = Array.from({ length: 1 + Math.floor(aleatorio() * 4) }, () => {
      const m = motivos[Math.floor(aleatorio() * motivos.length)];
      return { motivoId: m.id, equipamentoId: m.equipamentoId, centro: m.centro, ocorrencias: 1 + Math.floor(aleatorio() * 3), minutos: 5 + Math.round(aleatorio() * 50) };
    });
    const producao = itens.reduce((s, x) => s + x.m3, 0);
    await db.boletimProducao.create({
      data: {
        data: d,
        responsavelId: encarregado.id,
        metaM3: 60,
        horasProgramadas: 8.8,
        torasQtd: Math.round(producao * 7),
        torasM3: Math.round((producao / (0.4 + aleatorio() * 0.1)) * 10) / 10,
        diametroMedio: 24 + Math.round(aleatorio() * 6),
        comprimentoMedio: 3,
        itens: { create: itens },
        paradas: { create: paradas },
      },
    });
  }

  const estufa = await db.estufa.findUnique({ where: { numero: 1 } });
  if (estufa) {
    let ordem = 0;
    await db.cicloSecagem.create({
      data: {
        estufaId: estufa.id,
        numero: 412,
        entrada: new Date(Date.now() - 50 * 3600e3),
        previsaoSaida: new Date(Date.now() + 70 * 3600e3),
        umidadeInicial: 62,
        plantao: "Juliano / Marcos",
        responsavelId: encarregado.id,
        cargas: { create: [{ espessura: 25, largura: "85-100-125", comprimento: 3, grades: 18, m3: 42.5 }, { espessura: 32, largura: "150", comprimento: 2.7, grades: 6, m3: 15.2 }] },
        checklist: { create: ["Verificar o supervisório do Ecopower", "Verificar inversores de frequência", "Banho vapor"].map((texto) => ({ texto, secao: "A cada novo ciclo", ordem: ordem++ })) },
      },
    });
  }
  await db.cargaToras.create({
    data: {
      data: new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - 1)),
      origem: "Fazenda Santa Rita",
      talhao: "12B",
      placa: "ABC1D23",
      comprimentoMedio: 3,
      responsavelId: encarregado.id,
      itens: { create: [18, 20, 22, 24, 26, 28, 30, 34].map((diametro, n) => ({ diametro, quantidade: [12, 30, 45, 60, 52, 38, 20, 8][n] })) },
    },
  });
  await db.levantamentoEstoque.create({
    data: {
      data: new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - 2)),
      tipo: "EMPACOTADA",
      responsavelId: encarregado.id,
      itens: { create: [{ espessura: 25, largura: "100", comprimento: 3, pacotes: 14, m3: 38.4 }, { espessura: 32, largura: "150", comprimento: 2.7, pacotes: 6, m3: 21.1 }] },
    },
  });
  console.log("Produção de demonstração criada (login carlos.encarregado, senha teste123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
