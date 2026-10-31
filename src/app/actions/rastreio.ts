"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar, diferencas } from "@/lib/auditoria";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { diaParaDate, formatarDia, hojeSP, m3Pecas } from "@/lib/producao";
import { codigoColheita, codigoPacote } from "@/lib/rastreio";
import { exigirUsuario } from "@/lib/session";
import type { EstadoForm } from "./auth";

export type Resultado = { erro?: string; id?: string | number; numeros?: number[] };

const vazioParaNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const opcional = <T extends z.ZodTypeAny>(t: T) => z.preprocess(vazioParaNull, t.nullable());
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const positivo = (msg: string) => z.coerce.number({ message: msg }).positive(msg);

async function exigirAcao(acao: "lancar" | "gerir") {
  const eu = await exigirUsuario();
  return { eu, ok: podeProducao(eu, acao) };
}

// ============================ Florestas e colheitas ============================

const origemSchema = z.object({
  id: opcional(z.string()),
  nome: z.string().trim().min(2, "Informe o nome da floresta/fazenda").max(120),
  tipo: z.enum(["PROPRIA", "ARRENDADA", "TERCEIRO"]),
  proprietario: opcional(z.string().trim().max(120)),
  municipio: opcional(z.string().trim().max(80)),
  uf: opcional(z.string().trim().toUpperCase().length(2, "UF com 2 letras")),
  especie: opcional(z.string().trim().max(80)),
  anoPlantio: opcional(z.coerce.number().int().min(1900).max(2100)),
  areaHa: opcional(z.coerce.number().positive()),
  observacoes: opcional(z.string().trim().max(1000)),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarOrigem(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const parse = origemSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, ...dados } = parse.data;
  if (id) {
    const antes = await db.origemFlorestal.findUnique({ where: { id } });
    if (!antes) return { erro: "Floresta não encontrada" };
    await db.origemFlorestal.update({ where: { id }, data: dados });
    const mudou = diferencas(antes, dados, ["nome", "tipo", "proprietario", "municipio", "uf", "especie", "anoPlantio", "areaHa", "ativo"]);
    if (Object.keys(mudou).length) {
      await auditar({ usuarioId: eu.id, acao: "origem.editar", entidade: "OrigemFlorestal", entidadeId: id, resumo: `Editou a floresta ${dados.nome}`, detalhes: mudou });
    }
  } else {
    const nova = await db.origemFlorestal.create({ data: dados });
    await auditar({ usuarioId: eu.id, acao: "origem.criar", entidade: "OrigemFlorestal", entidadeId: nova.id, resumo: `Cadastrou a floresta ${nova.nome}` });
  }
  revalidatePath("/producao/florestas");
  return { ok: id ? "Floresta atualizada" : "Floresta cadastrada" };
}

const colheitaSchema = z.object({
  id: opcional(z.string()),
  origemId: z.string().min(1, "Escolha a floresta"),
  talhao: opcional(z.string().trim().max(60)),
  inicio: dia,
  fim: opcional(dia),
  equipe: opcional(z.string().trim().max(120)),
  idadeAnos: opcional(z.coerce.number().int().min(1).max(100)),
  volumeEstimadoM3: opcional(z.coerce.number().positive()),
  documento: opcional(z.string().trim().max(120)),
  observacoes: opcional(z.string().trim().max(1000)),
});

export async function salvarColheita(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const parse = colheitaSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, inicio, fim, ...resto } = parse.data;
  if (inicio > hojeSP()) return { erro: "O início da colheita não pode ser futuro" };
  if (fim && fim < inicio) return { erro: "O fim é anterior ao início" };
  const dados = { ...resto, inicio: diaParaDate(inicio), fim: fim ? diaParaDate(fim) : null };
  if (id) {
    const antes = await db.colheita.findUnique({ where: { id } });
    if (!antes) return { erro: "Colheita não encontrada" };
    if (antes.responsavelId !== eu.id && !podeProducao(eu, "gerir")) return { erro: "Só o supervisor edita colheitas de outra pessoa" };
    await db.colheita.update({ where: { id }, data: dados });
    await auditar({ usuarioId: eu.id, acao: "colheita.editar", entidade: "Colheita", entidadeId: id, resumo: `Editou a colheita ${codigoColheita(antes.numero)}` });
  } else {
    const nova = await db.colheita.create({ data: { ...dados, responsavelId: eu.id } });
    await auditar({ usuarioId: eu.id, acao: "colheita.criar", entidade: "Colheita", entidadeId: nova.id, resumo: `Registrou a colheita ${codigoColheita(nova.numero)} (início ${formatarDia(nova.inicio)})` });
  }
  revalidatePath("/producao/florestas");
  return { ok: id ? "Colheita atualizada" : "Colheita registrada" };
}

// ============================ Pacotes ============================

const pacoteSchema = z
  .object({
    origem: z.enum(["boletim", "ciclo"]),
    boletimId: opcional(z.string()),
    cicloId: opcional(z.string()),
    espessura: positivo("Espessura inválida").int().max(500),
    largura: positivo("Largura inválida").int().max(1000),
    comprimento: positivo("Comprimento inválido").int().max(12000),
    pecas: positivo("Informe as peças do pacote").int().max(100000),
    quantidade: z.coerce.number().int().min(1, "Quantidade de pacotes inválida").max(50, "No máximo 50 pacotes de uma vez"),
    classe: opcional(z.string().trim().max(40)),
    mercado: z.enum(["EXTERNO", "INTERNO"]),
    umidade: opcional(z.coerce.number().min(0).max(200)),
    localizacao: opcional(z.string().trim().max(80)),
    observacoes: opcional(z.string().trim().max(500)),
  })
  .refine((d) => (d.origem === "boletim" ? !!d.boletimId : !!d.cicloId), { message: "Escolha de onde vem a madeira do pacote" });

export type DadosPacote = z.input<typeof pacoteSchema>;

/** Forma um ou mais pacotes iguais e registra o primeiro evento da linha do tempo. */
export async function criarPacotes(entrada: DadosPacote): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão para formar pacotes" };
  const parse = pacoteSchema.safeParse(entrada);
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { origem, boletimId, cicloId, quantidade, ...p } = parse.data;

  let descricao: string;
  if (origem === "boletim") {
    const b = await db.boletimProducao.findUnique({ where: { id: boletimId! }, select: { data: true } });
    if (!b) return { erro: "Boletim não encontrado" };
    descricao = `Formado verde com a madeira serrada em ${formatarDia(b.data)}`;
  } else {
    const c = await db.cicloSecagem.findUnique({ where: { id: cicloId! }, include: { estufa: { select: { nome: true } } } });
    if (!c) return { erro: "Ciclo de estufa não encontrado" };
    if (c.status === "CANCELADO") return { erro: "Este ciclo foi cancelado" };
    descricao = `Formado com a madeira seca da ${c.estufa.nome}${c.numero ? ` (ciclo nº ${c.numero})` : ""}`;
  }
  const m3 = m3Pecas(p.espessura, p.largura, p.comprimento, p.pecas);
  const status = origem === "boletim" ? "VERDE" : "SECO";

  const criados = await db.$transaction(
    Array.from({ length: quantidade }, () =>
      db.pacote.create({
        data: {
          ...p,
          m3,
          status,
          boletimId: origem === "boletim" ? boletimId : null,
          cicloId: origem === "ciclo" ? cicloId : null,
          criadoPorId: eu.id,
          eventos: { create: { tipo: "CRIADO", descricao: `${descricao}${p.localizacao ? ` · local: ${p.localizacao}` : ""}`, usuarioId: eu.id } },
        },
        select: { id: true, numero: true },
      }),
    ),
  );
  const numeros = criados.map((c) => c.numero);
  await auditar({
    usuarioId: eu.id,
    acao: "pacote.criar",
    entidade: "Pacote",
    entidadeId: criados[0].id,
    resumo: `Formou ${quantidade} pacote(s) ${p.espessura}×${p.largura}×${p.comprimento} mm: ${codigoPacote(numeros[0])}${quantidade > 1 ? ` a ${codigoPacote(numeros[numeros.length - 1])}` : ""}`,
  });
  revalidatePath("/producao", "layout");
  return { numeros };
}

const eventoSchema = z.object({
  numero: z.coerce.number().int().positive(),
  acao: z.enum(["estufa", "expedir", "local", "observacao", "cancelar"]),
  cicloId: opcional(z.string()),
  cliente: opcional(z.string().trim().max(120)),
  notaFiscal: opcional(z.string().trim().max(40)),
  destino: opcional(z.string().trim().max(120)),
  localizacao: opcional(z.string().trim().max(80)),
  texto: opcional(z.string().trim().max(500)),
});

/** Ações feitas na tela do pacote (depois de escanear o QR). Cada uma vira um evento. */
export async function registrarEventoPacote(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const parse = eventoSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const d = parse.data;
  const { eu, ok } = await exigirAcao(d.acao === "cancelar" ? "gerir" : "lancar");
  if (!ok) return { erro: "Sem permissão" };
  const pacote = await db.pacote.findUnique({ where: { numero: d.numero } });
  if (!pacote) return { erro: "Pacote não encontrado" };
  const codigo = codigoPacote(pacote.numero);
  const encerrado = pacote.status === "EXPEDIDO" || pacote.status === "CANCELADO";

  const evento = async (tipo: "ENTRADA_ESTUFA" | "EXPEDIDO" | "MOVIMENTADO" | "OBSERVACAO" | "CANCELADO", descricao: string, dados: object = {}) => {
    await db.pacote.update({ where: { id: pacote.id }, data: { ...dados, eventos: { create: { tipo, descricao, usuarioId: eu.id } } } });
    await auditar({ usuarioId: eu.id, acao: `pacote.${d.acao}`, entidade: "Pacote", entidadeId: pacote.id, resumo: `${codigo}: ${descricao}` });
  };

  switch (d.acao) {
    case "estufa": {
      if (pacote.status !== "VERDE") return { erro: "Só pacotes verdes entram na estufa" };
      const ciclo = d.cicloId ? await db.cicloSecagem.findUnique({ where: { id: d.cicloId }, include: { estufa: true } }) : null;
      if (!ciclo || ciclo.status !== "EM_SECAGEM") return { erro: "Escolha um ciclo em secagem" };
      await evento("ENTRADA_ESTUFA", `Entrou na ${ciclo.estufa.nome}${ciclo.numero ? ` (ciclo nº ${ciclo.numero})` : ""}`, { status: "EM_ESTUFA", cicloId: ciclo.id });
      // A madeira do dia do pacote passa a fazer parte do ciclo (rastreabilidade)
      if (pacote.boletimId) await db.cicloSecagem.update({ where: { id: ciclo.id }, data: { boletins: { connect: { id: pacote.boletimId } } } });
      break;
    }
    case "expedir": {
      if (encerrado) return { erro: "Pacote já expedido ou cancelado" };
      if (pacote.status === "EM_ESTUFA") return { erro: "O pacote ainda está na estufa" };
      if (!d.cliente) return { erro: "Informe o cliente" };
      const desc = [`Expedido para ${d.cliente}`, d.notaFiscal && `NF ${d.notaFiscal}`, d.destino && `destino ${d.destino}`].filter(Boolean).join(" · ");
      await evento("EXPEDIDO", desc, { status: "EXPEDIDO", cliente: d.cliente, notaFiscal: d.notaFiscal, destino: d.destino, expedidoEm: new Date() });
      break;
    }
    case "local":
      if (encerrado) return { erro: "Pacote já expedido ou cancelado" };
      if (!d.localizacao) return { erro: "Informe o novo local" };
      await evento("MOVIMENTADO", `Movido para ${d.localizacao}`, { localizacao: d.localizacao });
      break;
    case "observacao":
      if (!d.texto) return { erro: "Escreva a observação" };
      await evento("OBSERVACAO", d.texto);
      break;
    case "cancelar":
      if (encerrado) return { erro: "Pacote já expedido ou cancelado" };
      await evento("CANCELADO", d.texto ? `Cancelado: ${d.texto}` : "Cancelado", { status: "CANCELADO" });
      break;
  }
  revalidatePath(`/producao/pacotes/${pacote.numero}`);
  revalidatePath("/producao/pacotes");
  return { ok: "Registrado" };
}

const expedicaoSchema = z.object({
  numeros: z.array(z.coerce.number().int().positive()).min(1, "Selecione os pacotes").max(200),
  cliente: z.string().trim().min(2, "Informe o cliente").max(120),
  notaFiscal: opcional(z.string().trim().max(40)),
  destino: opcional(z.string().trim().max(120)),
});

/** Expede vários pacotes de uma vez (carregamento de um caminhão). */
export async function expedirPacotes(entrada: z.input<typeof expedicaoSchema>): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const parse = expedicaoSchema.safeParse(entrada);
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { numeros, cliente, notaFiscal, destino } = parse.data;
  const pacotes = await db.pacote.findMany({ where: { numero: { in: numeros } }, select: { id: true, numero: true, status: true } });
  const invalidos = pacotes.filter((p) => p.status !== "VERDE" && p.status !== "SECO");
  if (invalidos.length) return { erro: `Não dá para expedir: ${invalidos.map((p) => codigoPacote(p.numero)).join(", ")} (na estufa, expedido ou cancelado)` };
  const descricao = [`Expedido para ${cliente}`, notaFiscal && `NF ${notaFiscal}`, destino && `destino ${destino}`].filter(Boolean).join(" · ");
  const agora = new Date();
  await db.$transaction([
    db.pacote.updateMany({ where: { id: { in: pacotes.map((p) => p.id) } }, data: { status: "EXPEDIDO", cliente, notaFiscal, destino, expedidoEm: agora } }),
    db.eventoPacote.createMany({ data: pacotes.map((p) => ({ pacoteId: p.id, tipo: "EXPEDIDO" as const, descricao, usuarioId: eu.id, criadoEm: agora })) }),
  ]);
  await auditar({
    usuarioId: eu.id,
    acao: "pacote.expedir",
    entidade: "Pacote",
    resumo: `Expediu ${pacotes.length} pacote(s) para ${cliente}${notaFiscal ? ` (NF ${notaFiscal})` : ""}`,
    detalhes: { pacotes: pacotes.map((p) => codigoPacote(p.numero)) },
  });
  revalidatePath("/producao", "layout");
  return { numeros: pacotes.map((p) => p.numero) };
}
