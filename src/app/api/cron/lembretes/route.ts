import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatarData, numeroRequisicao } from "@/lib/constantes";
import { idsPorPerfil, notificar } from "@/lib/notificacoes";

/**
 * Lembrete das manutenções agendadas para hoje (horário de Brasília).
 * Chamado pelo Cron da Vercel (vercel.json), que envia "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const inicio = new Date(`${hoje}T00:00:00-03:00`);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  const agendadas = await db.requisicao.findMany({
    where: { status: "AGENDADA", lembreteEm: null, dataAgendada: { gte: inicio, lt: fim } },
    select: { id: true, titulo: true, dataAgendada: true, solicitanteId: true, responsavelId: true },
  });

  const equipe = agendadas.some((r) => !r.responsavelId) ? await idsPorPerfil(["SUPERVISOR"]) : [];
  for (const r of agendadas) {
    const hora = formatarData(r.dataAgendada, true).split(", ")[1];
    await notificar([r.responsavelId ?? null, ...(r.responsavelId ? [] : equipe)], {
      titulo: `📅 Hoje às ${hora}: ${numeroRequisicao(r.id)}`,
      mensagem: r.titulo,
      link: `/requisicoes/${r.id}`,
    });
    await notificar([r.solicitanteId !== r.responsavelId ? r.solicitanteId : null], {
      titulo: `📅 Sua requisição ${numeroRequisicao(r.id)} está agendada para hoje às ${hora}`,
      mensagem: r.titulo,
      link: `/requisicoes/${r.id}`,
    });
    await db.requisicao.update({ where: { id: r.id }, data: { lembreteEm: new Date() } });
  }

  return NextResponse.json({ enviados: agendadas.length });
}
