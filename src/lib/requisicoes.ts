import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { auditar } from "@/lib/auditoria";
import { numeroRequisicao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { processarFoto } from "@/lib/fotos";
import { idsPorPerfil, notificar } from "@/lib/notificacoes";
import { AVISO_NOVA } from "@/lib/permissoes";
import type { UsuarioAtual } from "@/lib/session";

const vazioParaNull = (v: unknown) => (v === "" || v === undefined ? null : v);

export const novaRequisicaoSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título (mín. 3 caracteres)").max(120),
  descricao: z.string().trim().min(5, "Descreva o problema ou serviço"),
  tipo: z.enum(["CORRETIVA", "PREVENTIVA", "PREDITIVA", "MELHORIA"]),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]),
  local: z.preprocess(vazioParaNull, z.string().trim().max(120).nullable()),
  setorId: z.preprocess(vazioParaNull, z.string().nullable()),
  equipamentoId: z.preprocess(vazioParaNull, z.string().nullable()),
  maquinaParada: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  /** Quando foi registrada no aparelho (fila offline); usada como início da parada. */
  registradaEm: z.preprocess(vazioParaNull, z.coerce.date().nullable()),
  /** Chave única gerada no aparelho (fila offline), para não duplicar em reenvios. */
  chaveOffline: z.preprocess(vazioParaNull, z.string().uuid().nullable()),
});

export type DadosNovaRequisicao = z.infer<typeof novaRequisicaoSchema>;

/** Cria a requisição (com fotos), registra histórico/auditoria e avisa a equipe. */
export async function criarRequisicaoCompleta(eu: UsuarioAtual, dados: DadosNovaRequisicao, fotos: File[], origem: "online" | "offline") {
  // Reenvio da fila offline (a resposta anterior se perdeu): devolve a que já existe
  if (dados.chaveOffline) {
    const existente = await db.requisicao.findUnique({ where: { chaveOffline: dados.chaveOffline } });
    if (existente) return existente;
  }

  // Fotos primeiro: se alguma for inválida, nada é gravado
  const processadas = await Promise.all(fotos.map(processarFoto));

  // Sem setor informado, a requisição herda o setor do equipamento
  const equipamento = dados.equipamentoId
    ? await db.equipamento.findUnique({ where: { id: dados.equipamentoId }, select: { setorId: true, codigo: true } })
    : null;

  const agora = new Date();
  const registradaEm = dados.registradaEm && dados.registradaEm < agora ? dados.registradaEm : agora;
  const { registradaEm: _ignorar, ...campos } = dados;

  const req = await db.requisicao.create({
    data: {
      ...campos,
      equipamentoId: equipamento ? dados.equipamentoId : null,
      setorId: dados.setorId ?? equipamento?.setorId ?? null,
      solicitanteId: eu.id,
      paradaInicio: dados.maquinaParada ? registradaEm : null,
      historico: {
        create: {
          statusNovo: "ABERTA",
          usuarioId: eu.id,
          observacao: origem === "offline" ? "Requisição aberta sem internet e enviada ao reconectar" : "Requisição aberta",
        },
      },
      anexos: processadas.length
        ? { create: processadas.map((f) => ({ ...f, dados: new Uint8Array(f.dados), miniatura: new Uint8Array(f.miniatura), autorId: eu.id, tipo: "PROBLEMA" as const })) }
        : undefined,
    },
  });

  await auditar({
    usuarioId: eu.id,
    acao: "requisicao.criar",
    entidade: "Requisicao",
    entidadeId: req.id,
    resumo: `Abriu a requisição ${numeroRequisicao(req.id)}: ${req.titulo}${processadas.length ? ` (${processadas.length} foto${processadas.length > 1 ? "s" : ""})` : ""}`,
    detalhes: { origem, maquinaParada: req.maquinaParada, prioridade: req.prioridade, equipamento: equipamento?.codigo ?? null },
  });

  const urgente = req.prioridade === "URGENTE" || req.prioridade === "ALTA" || req.maquinaParada;
  after(async () =>
    notificar(await idsPorPerfil([...AVISO_NOVA.todas, ...(urgente ? AVISO_NOVA.urgentes : [])], eu.id), {
      titulo: `${req.prioridade === "URGENTE" ? "🚨 URGENTE · " : req.prioridade === "ALTA" ? "⚠️ Prioridade alta · " : ""}${req.maquinaParada ? "⛔ Máquina parada · " : ""}Nova requisição ${numeroRequisicao(req.id)}`,
      mensagem: `${req.titulo} — aberta por ${eu.nome}`,
      link: `/requisicoes/${req.id}`,
    })
  );

  return req;
}
