"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar, diferencas } from "@/lib/auditoria";
import { dataLocalParaDate, formatarData, formatarDuracao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { podeProducao, temModulo } from "@/lib/permissoes";
import {
  CENTRO,
  CHECKLIST_ESTUFA,
  arred,
  diaParaDate,
  formatarDia,
  hojeSP,
  m3Pecas,
} from "@/lib/producao";
import { criarRequisicaoCompleta } from "@/lib/requisicoes";
import { exigirUsuario } from "@/lib/session";
import type { EstadoForm } from "./auth";

export type Resultado = { erro?: string; id?: string | number };

const vazioParaNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const opcional = <T extends z.ZodTypeAny>(t: T) => z.preprocess(vazioParaNull, t.nullable());
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const positivo = (msg: string) => z.coerce.number({ message: msg }).positive(msg);

function erroUnico(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}

async function exigirAcao(acao: "lancar" | "gerir") {
  const eu = await exigirUsuario();
  return { eu, ok: podeProducao(eu, acao) };
}

// ============================ Boletim da serraria ============================

const boletimSchema = z.object({
  id: opcional(z.string()),
  data: dia,
  metaM3: z.coerce.number().min(0, "Meta inválida"),
  horasProgramadas: z.coerce.number().positive("Informe as horas programadas").max(24, "No máximo 24 horas"),
  torasQtd: opcional(z.coerce.number().int().min(0)),
  torasM3: opcional(z.coerce.number().min(0)),
  diametroMedio: opcional(z.coerce.number().min(0)),
  comprimentoMedio: opcional(z.coerce.number().min(0)),
  observacoes: opcional(z.string().trim().max(2000)),
  itens: z
    .array(
      z.object({
        tipo: z.enum(["BOM", "APROVEITAMENTO", "REFUGO"]),
        mercado: z.enum(["EXTERNO", "INTERNO"]),
        espessura: positivo("Espessura inválida").int(),
        largura: positivo("Largura inválida").int(),
        comprimento: positivo("Comprimento inválido").int(),
        pecas: positivo("Informe as peças").int(),
      }),
    )
    .max(200),
  paradas: z
    .array(
      z.object({
        motivoId: opcional(z.string()),
        equipamentoId: opcional(z.string()),
        centro: z.enum(["MEC", "ELE", "OPE"]),
        ocorrencias: z.coerce.number().int().min(1).default(1),
        minutos: positivo("Informe os minutos parados"),
        descricao: opcional(z.string().trim().max(500)),
        requisicaoId: opcional(z.coerce.number().int()),
      }),
    )
    .max(200),
  /** Cargas de toras serradas no dia (rastreabilidade). */
  cargaIds: z.array(z.string()).max(60).default([]),
});

export type DadosBoletim = z.input<typeof boletimSchema>;

export async function salvarBoletim(entrada: DadosBoletim): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão para lançar produção" };
  const parse = boletimSchema.safeParse(entrada);
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, itens, paradas, cargaIds, ...campos } = parse.data;
  if (campos.data > hojeSP()) return { erro: "A data do boletim não pode ser futura" };
  if (itens.length === 0 && paradas.length === 0) return { erro: "Lance a produção ou as paradas do dia" };
  const minutosParados = paradas.reduce((s, p) => s + p.minutos, 0);
  if (minutosParados > campos.horasProgramadas * 60) {
    return { erro: `As paradas somam ${formatarDuracao(minutosParados)}, mais que as ${campos.horasProgramadas} h programadas` };
  }

  const dados = {
    ...campos,
    data: diaParaDate(campos.data),
    itens: { create: itens.map((i) => ({ ...i, m3: m3Pecas(i.espessura, i.largura, i.comprimento, i.pecas) })) },
    paradas: { create: paradas },
  };
  const totalM3 = arred(dados.itens.create.reduce((s, i) => s + i.m3, 0), 3);

  try {
    if (id) {
      const antes = await db.boletimProducao.findUnique({ where: { id } });
      if (!antes) return { erro: "Boletim não encontrado" };
      if (antes.responsavelId !== eu.id && !podeProducao(eu, "gerir")) return { erro: "Só o supervisor de produção edita boletins de outra pessoa" };
      await db.$transaction([
        db.itemProducao.deleteMany({ where: { boletimId: id } }),
        db.paradaProducao.deleteMany({ where: { boletimId: id } }),
        db.boletimProducao.update({ where: { id }, data: { ...dados, cargas: { set: cargaIds.map((c) => ({ id: c })) } } }),
      ]);
      await auditar({
        usuarioId: eu.id,
        acao: "boletim.editar",
        entidade: "BoletimProducao",
        entidadeId: id,
        resumo: `Editou o boletim da serraria de ${formatarDia(dados.data)} (${totalM3} m³, ${paradas.length} parada(s))`,
        detalhes: diferencas(antes, { ...campos, data: dados.data }, ["data", "metaM3", "horasProgramadas", "torasQtd", "torasM3", "observacoes"]),
      });
      revalidatePath("/producao", "layout");
      return { id };
    }
    const novo = await db.boletimProducao.create({ data: { ...dados, responsavelId: eu.id, cargas: { connect: cargaIds.map((c) => ({ id: c })) } } });
    await auditar({
      usuarioId: eu.id,
      acao: "boletim.criar",
      entidade: "BoletimProducao",
      entidadeId: novo.id,
      resumo: `Lançou o boletim da serraria de ${formatarDia(novo.data)} (${totalM3} m³, ${paradas.length} parada(s))`,
    });
    revalidatePath("/producao", "layout");
    return { id: novo.id };
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um boletim para esta data — abra-o na lista para editar" };
    throw e;
  }
}

export async function excluirBoletim(id: string): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const b = await db.boletimProducao.delete({ where: { id } }).catch(() => null);
  if (!b) return { erro: "Boletim não encontrado" };
  await auditar({ usuarioId: eu.id, acao: "boletim.excluir", entidade: "BoletimProducao", entidadeId: id, resumo: `Excluiu o boletim da serraria de ${formatarDia(b.data)}` });
  revalidatePath("/producao", "layout");
  return {};
}

/** Parada mecânica/elétrica vira requisição de manutenção (corretiva) já ligada ao boletim. */
export async function abrirRequisicaoDaParada(paradaId: string): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok || !temModulo(eu, "manutencao")) return { erro: "Sem acesso ao módulo de manutenção" };
  const p = await db.paradaProducao.findUnique({
    where: { id: paradaId },
    include: { motivo: true, boletim: { select: { id: true, data: true } }, equipamento: { select: { id: true } } },
  });
  if (!p) return { erro: "Parada não encontrada" };
  if (p.requisicaoId) return { id: p.requisicaoId };

  const titulo = (p.motivo ? `Parada: ${p.motivo.descricao}` : `Parada ${CENTRO[p.centro].label.toLowerCase()} na serraria`).slice(0, 120);
  const descricao = [
    `Parada registrada no boletim da serraria de ${formatarDia(p.boletim.data)}.`,
    `Centro: ${CENTRO[p.centro].label} · ${p.ocorrencias} ocorrência(s) · ${formatarDuracao(p.minutos)} parado.`,
    p.motivo ? `Motivo nº ${p.motivo.codigo}: ${p.motivo.descricao}.` : null,
    p.descricao ? `Observação: ${p.descricao}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const req = await criarRequisicaoCompleta(
    eu,
    {
      titulo,
      descricao,
      tipo: "CORRETIVA",
      prioridade: "ALTA",
      local: "Serraria",
      setorId: null,
      equipamentoId: p.equipamentoId ?? p.motivo?.equipamentoId ?? null,
      maquinaParada: false,
      registradaEm: null,
      chaveOffline: null,
    },
    [],
    "online",
  );
  await db.paradaProducao.update({ where: { id: p.id }, data: { requisicaoId: req.id } });
  revalidatePath(`/producao/boletins/${p.boletim.id}`);
  return { id: req.id };
}

// ============================ Cadastros ============================

const motivoSchema = z.object({
  id: opcional(z.string()),
  codigo: z.coerce.number().int().positive("Código inválido"),
  descricao: z.string().trim().min(3, "Descreva o motivo").max(150),
  centro: z.enum(["MEC", "ELE", "OPE"]),
  equipamentoId: opcional(z.string()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarMotivo(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const parse = motivoSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, ...dados } = parse.data;
  try {
    if (id) {
      const antes = await db.motivoParada.findUniqueOrThrow({ where: { id } });
      await db.motivoParada.update({ where: { id }, data: dados });
      const mudou = diferencas(antes, dados, ["codigo", "descricao", "centro", "equipamentoId", "ativo"]);
      if (Object.keys(mudou).length) {
        await auditar({ usuarioId: eu.id, acao: "motivo.editar", entidade: "MotivoParada", entidadeId: id, resumo: `Editou o motivo de parada ${dados.codigo}`, detalhes: mudou });
      }
    } else {
      const novo = await db.motivoParada.create({ data: dados });
      await auditar({ usuarioId: eu.id, acao: "motivo.criar", entidade: "MotivoParada", entidadeId: novo.id, resumo: `Cadastrou o motivo de parada ${novo.codigo} – ${novo.descricao}` });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Já existe um motivo com este código" };
    throw e;
  }
  revalidatePath("/producao/cadastros");
  return { ok: id ? "Motivo atualizado" : "Motivo cadastrado" };
}

const estufaSchema = z.object({
  id: opcional(z.string()),
  numero: z.coerce.number().int().positive("Número inválido"),
  nome: z.string().trim().min(2, "Informe o nome").max(60),
  capacidadeM3: opcional(z.coerce.number().positive("Capacidade inválida")),
  equipamentoId: opcional(z.string()),
  ativo: z.preprocess((v) => v === "on", z.boolean()),
});

export async function salvarEstufa(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const parse = estufaSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, ...dados } = parse.data;
  try {
    if (id) {
      const antes = await db.estufa.findUniqueOrThrow({ where: { id } });
      await db.estufa.update({ where: { id }, data: dados });
      const mudou = diferencas(antes, dados, ["numero", "nome", "capacidadeM3", "equipamentoId", "ativo"]);
      if (Object.keys(mudou).length) {
        await auditar({ usuarioId: eu.id, acao: "estufa.editar", entidade: "Estufa", entidadeId: id, resumo: `Editou a ${dados.nome}`, detalhes: mudou });
      }
    } else {
      const nova = await db.estufa.create({ data: dados });
      await auditar({ usuarioId: eu.id, acao: "estufa.criar", entidade: "Estufa", entidadeId: nova.id, resumo: `Cadastrou a ${nova.nome}` });
    }
  } catch (e) {
    if (erroUnico(e)) return { erro: "Número de estufa ou equipamento já usado por outra estufa" };
    throw e;
  }
  revalidatePath("/producao", "layout");
  return { ok: id ? "Estufa atualizada" : "Estufa cadastrada" };
}

const metaSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido"),
  metaDiariaM3: z.coerce.number().positive("Informe a meta diária em m³"),
  horasDia: z.coerce.number().positive("Informe as horas por dia").max(24),
  rendimentoMeta: opcional(z.coerce.number().min(1, "Rendimento em %, ex.: 45").max(100, "Rendimento em %, ex.: 45")),
});

export async function salvarMeta(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const parse = metaSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { mes, ...resto } = parse.data;
  const dados = { ...resto, rendimentoMeta: resto.rendimentoMeta == null ? null : resto.rendimentoMeta / 100 };
  const antes = await db.metaProducao.findUnique({ where: { mes } });
  const meta = await db.metaProducao.upsert({ where: { mes }, update: dados, create: { mes, ...dados } });
  await auditar({
    usuarioId: eu.id,
    acao: antes ? "meta.editar" : "meta.criar",
    entidade: "MetaProducao",
    entidadeId: meta.id,
    resumo: `${antes ? "Alterou" : "Definiu"} a meta de produção de ${mes}: ${dados.metaDiariaM3} m³/dia em ${dados.horasDia} h`,
    detalhes: antes ? diferencas(antes, dados, ["metaDiariaM3", "horasDia", "rendimentoMeta"]) : undefined,
  });
  revalidatePath("/producao", "layout");
  return { ok: "Meta salva" };
}

// ============================ Estufas: ciclos de secagem ============================

const cargaSchema = z.object({
  espessura: positivo("Espessura inválida").int(),
  largura: z.string().trim().min(1, "Informe a largura").max(40),
  comprimento: positivo("Comprimento inválido"),
  grades: positivo("Informe as grades").int(),
  m3: positivo("Informe o volume em m³"),
});

const cicloSchema = z.object({
  id: opcional(z.string()),
  estufaId: z.string().min(1, "Escolha a estufa"),
  numero: opcional(z.coerce.number().int().positive()),
  entrada: z.string().min(1, "Informe a entrada"),
  previsaoSaida: opcional(z.string()),
  umidadeInicial: opcional(z.coerce.number().min(0).max(200)),
  plantao: opcional(z.string().trim().max(200)),
  proximaCarga: opcional(z.string().trim().max(300)),
  observacoes: opcional(z.string().trim().max(2000)),
  cargas: z.array(cargaSchema).min(1, "Informe a madeira que entrou na estufa").max(60),
  /** Dias de serraria cuja madeira entrou no ciclo (rastreabilidade). */
  boletimIds: z.array(z.string()).max(60).default([]),
});

export type DadosCiclo = z.input<typeof cicloSchema>;

export async function salvarCiclo(entrada: DadosCiclo): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const parse = cicloSchema.safeParse(entrada);
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, cargas, boletimIds, ...c } = parse.data;
  const dados = {
    ...c,
    entrada: dataLocalParaDate(c.entrada),
    previsaoSaida: c.previsaoSaida ? dataLocalParaDate(c.previsaoSaida) : null,
  };
  if (!dados.entrada) return { erro: "Data de entrada inválida" };
  if (dados.previsaoSaida && dados.previsaoSaida < dados.entrada) return { erro: "A previsão de saída é anterior à entrada" };
  const estufa = await db.estufa.findUnique({ where: { id: c.estufaId } });
  if (!estufa) return { erro: "Estufa não encontrada" };
  const outro = await db.cicloSecagem.findFirst({ where: { estufaId: c.estufaId, status: "EM_SECAGEM", ...(id ? { id: { not: id } } : {}) } });
  if (outro) return { erro: `A ${estufa.nome} já tem um ciclo em secagem — conclua-o antes` };

  const volume = arred(cargas.reduce((s, x) => s + x.m3, 0), 3);
  if (id) {
    const antes = await db.cicloSecagem.findUnique({ where: { id } });
    if (!antes) return { erro: "Ciclo não encontrado" };
    await db.$transaction([
      db.cargaCiclo.deleteMany({ where: { cicloId: id } }),
      db.cicloSecagem.update({
        where: { id },
        data: { ...dados, entrada: dados.entrada, cargas: { create: cargas }, boletins: { set: boletimIds.map((b) => ({ id: b })) } },
      }),
    ]);
    await auditar({ usuarioId: eu.id, acao: "ciclo.editar", entidade: "CicloSecagem", entidadeId: id, resumo: `Editou o ciclo da ${estufa.nome} (${volume} m³)` });
    revalidatePath("/producao", "layout");
    return { id };
  }
  let ordem = 0;
  const novo = await db.cicloSecagem.create({
    data: {
      ...dados,
      entrada: dados.entrada,
      responsavelId: eu.id,
      cargas: { create: cargas },
      boletins: { connect: boletimIds.map((b) => ({ id: b })) },
      checklist: { create: CHECKLIST_ESTUFA.flatMap((s) => s.itens.map((texto) => ({ secao: s.secao, texto, ordem: ordem++ }))) },
    },
  });
  await auditar({ usuarioId: eu.id, acao: "ciclo.criar", entidade: "CicloSecagem", entidadeId: novo.id, resumo: `Iniciou ciclo de secagem na ${estufa.nome} (${volume} m³)` });
  revalidatePath("/producao", "layout");
  return { id: novo.id };
}

export async function marcarItemCiclo(itemId: string, conforme: boolean | null, observacao?: string): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const item = await db.itemChecklistCiclo.findUnique({ where: { id: itemId }, include: { ciclo: { select: { id: true, status: true } } } });
  if (!item) return { erro: "Item não encontrado" };
  if (item.ciclo.status !== "EM_SECAGEM") return { erro: "O ciclo já foi encerrado" };
  await db.itemChecklistCiclo.update({
    where: { id: itemId },
    data: {
      conforme,
      observacao: observacao === undefined ? undefined : observacao.trim().slice(0, 300) || null,
      marcadoPorId: conforme === null ? null : eu.id,
      marcadoEm: conforme === null ? null : new Date(),
    },
  });
  revalidatePath(`/producao/estufas/ciclos/${item.ciclo.id}`);
  return {};
}

const encerrarSchema = z.object({
  id: z.string(),
  saida: z.string().min(1, "Informe a data/hora de saída"),
  umidadeFinal: opcional(z.coerce.number().min(0).max(200)),
  observacoes: opcional(z.string().trim().max(2000)),
});

export async function concluirCiclo(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const parse = encerrarSchema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, umidadeFinal, observacoes } = parse.data;
  const saida = dataLocalParaDate(parse.data.saida);
  const ciclo = await db.cicloSecagem.findUnique({ where: { id }, include: { estufa: true } });
  if (!ciclo || ciclo.status !== "EM_SECAGEM") return { erro: "Ciclo não está em secagem" };
  if (!saida || saida < ciclo.entrada) return { erro: "A saída precisa ser depois da entrada" };
  const naEstufa = await db.pacote.findMany({ where: { cicloId: id, status: "EM_ESTUFA" }, select: { id: true } });
  await db.$transaction([
    db.cicloSecagem.update({
      where: { id },
      data: { status: "CONCLUIDO", saida, umidadeFinal, ...(observacoes ? { observacoes } : {}) },
    }),
    // Pacotes que estavam nesta estufa saem secos
    db.pacote.updateMany({ where: { id: { in: naEstufa.map((p) => p.id) } }, data: { status: "SECO", ...(umidadeFinal != null ? { umidade: umidadeFinal } : {}) } }),
    db.eventoPacote.createMany({
      data: naEstufa.map((p) => ({
        pacoteId: p.id,
        tipo: "SAIDA_ESTUFA" as const,
        descricao: `Saiu seco da ${ciclo.estufa.nome} em ${formatarData(saida, true)}${umidadeFinal != null ? ` com ${umidadeFinal}% de umidade` : ""}`,
        usuarioId: eu.id,
      })),
    }),
  ]);
  await auditar({ usuarioId: eu.id, acao: "ciclo.concluir", entidade: "CicloSecagem", entidadeId: id, resumo: `Concluiu o ciclo da ${ciclo.estufa.nome}` });
  revalidatePath("/producao", "layout");
  return { ok: "Ciclo concluído" };
}

export async function cancelarCiclo(id: string): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const ciclo = await db.cicloSecagem.findUnique({ where: { id }, include: { estufa: true } });
  if (!ciclo || ciclo.status !== "EM_SECAGEM") return { erro: "Ciclo não está em secagem" };
  const naEstufa = await db.pacote.findMany({ where: { cicloId: id, status: "EM_ESTUFA" }, select: { id: true } });
  await db.$transaction([
    db.cicloSecagem.update({ where: { id }, data: { status: "CANCELADO" } }),
    // Pacotes voltam a verde e saem do ciclo cancelado
    db.pacote.updateMany({ where: { id: { in: naEstufa.map((p) => p.id) } }, data: { status: "VERDE", cicloId: null } }),
    db.eventoPacote.createMany({
      data: naEstufa.map((p) => ({ pacoteId: p.id, tipo: "MOVIMENTADO" as const, descricao: `Ciclo da ${ciclo.estufa.nome} cancelado: pacote voltou a verde`, usuarioId: eu.id })),
    }),
  ]);
  await auditar({ usuarioId: eu.id, acao: "ciclo.cancelar", entidade: "CicloSecagem", entidadeId: id, resumo: `Cancelou o ciclo da ${ciclo.estufa.nome}` });
  revalidatePath("/producao", "layout");
  return {};
}

// ============================ Recebimento de toras ============================

const cargaTorasSchema = z.object({
  id: opcional(z.string()),
  data: dia,
  origem: z.string().trim().min(2, "Informe a origem/fornecedor").max(120),
  colheitaId: opcional(z.string()),
  talhao: opcional(z.string().trim().max(60)),
  motorista: opcional(z.string().trim().max(80)),
  placa: opcional(z.string().trim().toUpperCase().max(10)),
  comprimentoMedio: opcional(z.coerce.number().positive().max(20)),
  observacoes: opcional(z.string().trim().max(1000)),
  itens: z
    .array(z.object({ diametro: positivo("Diâmetro inválido").int().max(200), quantidade: positivo("Quantidade inválida").int() }))
    .min(1, "Informe as toras por diâmetro")
    .max(100),
});

export type DadosCargaToras = z.input<typeof cargaTorasSchema>;

export async function salvarCargaToras(entrada: DadosCargaToras): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const parse = cargaTorasSchema.safeParse(entrada);
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, itens, ...c } = parse.data;
  if (c.data > hojeSP()) return { erro: "A data não pode ser futura" };
  // Diâmetros repetidos viram uma linha só
  const porDiametro = new Map<number, number>();
  for (const i of itens) porDiametro.set(i.diametro, (porDiametro.get(i.diametro) ?? 0) + i.quantidade);
  const linhas = [...porDiametro].sort((a, b) => a[0] - b[0]).map(([diametro, quantidade]) => ({ diametro, quantidade }));
  const total = linhas.reduce((s, i) => s + i.quantidade, 0);
  const dados = { ...c, data: diaParaDate(c.data) };

  if (id) {
    const antes = await db.cargaToras.findUnique({ where: { id } });
    if (!antes) return { erro: "Carga não encontrada" };
    if (antes.responsavelId !== eu.id && !podeProducao(eu, "gerir")) return { erro: "Só o supervisor de produção edita cargas de outra pessoa" };
    await db.$transaction([
      db.itemCargaToras.deleteMany({ where: { cargaId: id } }),
      db.cargaToras.update({ where: { id }, data: { ...dados, itens: { create: linhas } } }),
    ]);
    await auditar({ usuarioId: eu.id, acao: "toras.editar", entidade: "CargaToras", entidadeId: id, resumo: `Editou a carga de toras de ${c.origem} (${total} toras)` });
  } else {
    const nova = await db.cargaToras.create({ data: { ...dados, responsavelId: eu.id, itens: { create: linhas } } });
    await auditar({ usuarioId: eu.id, acao: "toras.criar", entidade: "CargaToras", entidadeId: nova.id, resumo: `Registrou carga de toras de ${c.origem} (${total} toras)` });
  }
  revalidatePath("/producao", "layout");
  return { id: id ?? undefined };
}

export async function excluirCargaToras(id: string): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const c = await db.cargaToras.delete({ where: { id } }).catch(() => null);
  if (!c) return { erro: "Carga não encontrada" };
  await auditar({ usuarioId: eu.id, acao: "toras.excluir", entidade: "CargaToras", entidadeId: id, resumo: `Excluiu a carga de toras de ${c.origem} (${formatarDia(c.data)})` });
  revalidatePath("/producao", "layout");
  return {};
}

// ============================ Estoque de madeira ============================

const levantamentoSchema = z.object({
  id: opcional(z.string()),
  data: dia,
  tipo: z.enum(["VERDE", "EMPACOTADA"]),
  observacoes: opcional(z.string().trim().max(1000)),
  itens: z
    .array(
      z.object({
        espessura: positivo("Espessura inválida").int(),
        largura: z.string().trim().min(1, "Informe a largura").max(40),
        comprimento: positivo("Comprimento inválido"),
        grades: opcional(z.coerce.number().int().min(0)),
        pacotes: opcional(z.coerce.number().int().min(0)),
        m3: positivo("Informe o volume em m³"),
      }),
    )
    .min(1, "Informe ao menos uma bitola")
    .max(300),
});

export type DadosLevantamento = z.input<typeof levantamentoSchema>;

export async function salvarLevantamento(entrada: DadosLevantamento): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("lancar");
  if (!ok) return { erro: "Sem permissão" };
  const parse = levantamentoSchema.safeParse(entrada);
  if (!parse.success) return { erro: parse.error.issues[0].message };
  const { id, itens, ...c } = parse.data;
  if (c.data > hojeSP()) return { erro: "A data não pode ser futura" };

  const linhas = itens.map((i) => ({ ...i, m3: arred(i.m3, 4) }));
  const volume = arred(linhas.reduce((s, l) => s + l.m3, 0), 2);
  const dados = { ...c, data: diaParaDate(c.data) };

  if (id) {
    const antes = await db.levantamentoEstoque.findUnique({ where: { id } });
    if (!antes) return { erro: "Levantamento não encontrado" };
    if (antes.responsavelId !== eu.id && !podeProducao(eu, "gerir")) return { erro: "Só o supervisor de produção edita levantamentos de outra pessoa" };
    await db.$transaction([
      db.itemEstoque.deleteMany({ where: { levantamentoId: id } }),
      db.levantamentoEstoque.update({ where: { id }, data: { ...dados, itens: { create: linhas } } }),
    ]);
    await auditar({ usuarioId: eu.id, acao: "estoque.editar", entidade: "LevantamentoEstoque", entidadeId: id, resumo: `Editou o levantamento de estoque de ${formatarDia(dados.data)} (${volume} m³)` });
    revalidatePath("/producao", "layout");
    return { id };
  }
  const novo = await db.levantamentoEstoque.create({ data: { ...dados, responsavelId: eu.id, itens: { create: linhas } } });
  await auditar({ usuarioId: eu.id, acao: "estoque.criar", entidade: "LevantamentoEstoque", entidadeId: novo.id, resumo: `Registrou levantamento de estoque de ${formatarDia(dados.data)} (${volume} m³)` });
  revalidatePath("/producao", "layout");
  return { id: novo.id };
}

export async function excluirLevantamento(id: string): Promise<Resultado> {
  const { eu, ok } = await exigirAcao("gerir");
  if (!ok) return { erro: "Sem permissão" };
  const l = await db.levantamentoEstoque.delete({ where: { id } }).catch(() => null);
  if (!l) return { erro: "Levantamento não encontrado" };
  await auditar({ usuarioId: eu.id, acao: "estoque.excluir", entidade: "LevantamentoEstoque", entidadeId: id, resumo: `Excluiu o levantamento de estoque de ${formatarDia(l.data)}` });
  revalidatePath("/producao", "layout");
  return {};
}
