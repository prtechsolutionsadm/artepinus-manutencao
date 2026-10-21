"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { notificar } from "@/lib/notificacoes";
import { usuarioAtual } from "@/lib/session";

async function eu() {
  const u = await usuarioAtual();
  if (!u) throw new Error("Não autenticado");
  return u;
}

export async function listarNotificacoes() {
  const u = await eu();
  const [itens, naoLidas] = await Promise.all([
    db.notificacao.findMany({ where: { usuarioId: u.id }, orderBy: { criadoEm: "desc" }, take: 15 }),
    db.notificacao.count({ where: { usuarioId: u.id, lida: false } }),
  ]);
  return { itens, naoLidas };
}

export async function contarNaoLidas() {
  const u = await usuarioAtual();
  if (!u) return 0;
  return db.notificacao.count({ where: { usuarioId: u.id, lida: false } });
}

export async function marcarLida(id: string) {
  const u = await eu();
  await db.notificacao.updateMany({ where: { id, usuarioId: u.id }, data: { lida: true } });
}

export async function marcarTodasLidas() {
  const u = await eu();
  await db.notificacao.updateMany({ where: { usuarioId: u.id, lida: false }, data: { lida: true } });
}

const inscricaoSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function salvarInscricaoPush(inscricao: unknown) {
  const u = await eu();
  const dados = inscricaoSchema.parse(inscricao);
  await db.inscricaoPush.upsert({
    where: { endpoint: dados.endpoint },
    update: { usuarioId: u.id, p256dh: dados.keys.p256dh, auth: dados.keys.auth },
    create: { usuarioId: u.id, endpoint: dados.endpoint, p256dh: dados.keys.p256dh, auth: dados.keys.auth },
  });
}

export async function removerInscricaoPush(endpoint: string) {
  const u = await eu();
  await db.inscricaoPush.deleteMany({ where: { endpoint, usuarioId: u.id } });
}

export async function enviarTeste() {
  const u = await eu();
  await notificar([u.id], {
    titulo: "Notificações ativadas ✅",
    mensagem: "Este aparelho vai receber os avisos do sistema de manutenção.",
    link: "/notificacoes",
  });
}
