import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import type { Perfil } from "@/generated/prisma/enums";

export type Aviso = { titulo: string; mensagem: string; link?: string };

let vapidConfigurado: boolean | undefined;
function pushDisponivel() {
  if (vapidConfigurado === undefined) {
    const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privada = process.env.VAPID_PRIVATE_KEY;
    vapidConfigurado = Boolean(publica && privada);
    if (vapidConfigurado) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:manutencao@artepinus.com.br", publica!, privada!);
    }
  }
  return vapidConfigurado;
}

/**
 * Grava o aviso no sininho de cada usuário e envia push para os aparelhos inscritos.
 * Nunca lança erro: uma falha de notificação não pode desfazer a ação do usuário.
 */
export async function notificar(usuarioIds: (string | null | undefined)[], aviso: Aviso) {
  const ids = [...new Set(usuarioIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;

  try {
    await db.notificacao.createMany({
      data: ids.map((usuarioId) => ({ usuarioId, titulo: aviso.titulo, mensagem: aviso.mensagem, link: aviso.link })),
    });
  } catch (e) {
    console.error("Falha ao gravar notificações", e);
    return;
  }

  if (!pushDisponivel()) return;
  const inscricoes = await db.inscricaoPush.findMany({ where: { usuarioId: { in: ids } } });
  const payload = JSON.stringify({ titulo: aviso.titulo, mensagem: aviso.mensagem, link: aviso.link ?? "/sistema" });

  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: aviso.titulo.includes("URGENTE") ? "high" : "normal",
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: o aparelho cancelou a inscrição ou ela expirou
        if (status === 404 || status === 410) {
          await db.inscricaoPush.delete({ where: { id: i.id } }).catch(() => {});
        } else {
          console.error("Falha ao enviar push", status, e);
        }
      }
    })
  );
}

/** Usuários ativos dos perfis indicados, opcionalmente sem o autor da ação. */
export async function idsPorPerfil(perfis: Perfil[], exceto?: string) {
  const usuarios = await db.usuario.findMany({
    where: { ativo: true, perfil: { in: perfis }, ...(exceto ? { id: { not: exceto } } : {}) },
    select: { id: true },
  });
  return usuarios.map((u) => u.id);
}
