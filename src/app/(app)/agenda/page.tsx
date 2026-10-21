import type { Metadata } from "next";
import { ListaRequisicoes, selectItemRequisicao, type ItemRequisicao } from "@/components/ListaRequisicoes";
import { Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  await exigirUsuario();
  const inicioHoje = new Date();
  inicioHoje.setUTCHours(3, 0, 0, 0); // 00:00 em Brasília
  if (inicioHoje > new Date()) inicioHoje.setUTCDate(inicioHoje.getUTCDate() - 1);

  const [atrasadas, futuras] = await Promise.all([
    db.requisicao.findMany({
      where: { status: "AGENDADA", dataAgendada: { lt: inicioHoje } },
      select: selectItemRequisicao,
      orderBy: { dataAgendada: "asc" },
    }),
    db.requisicao.findMany({
      where: { status: "AGENDADA", dataAgendada: { gte: inicioHoje } },
      select: selectItemRequisicao,
      orderBy: { dataAgendada: "asc" },
      take: 200,
    }),
  ]);

  const porDia = new Map<string, ItemRequisicao[]>();
  for (const r of futuras) {
    const dia = r.dataAgendada!.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    porDia.set(dia, [...(porDia.get(dia) ?? []), r]);
  }

  return (
    <>
      <Titulo>Agenda de manutenção</Titulo>
      {atrasadas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 font-semibold text-rose-700">⚠️ Agendadas com data vencida ({atrasadas.length})</h2>
          <ListaRequisicoes itens={atrasadas} />
        </section>
      )}
      {porDia.size === 0 ? (
        <Vazio>Nenhuma manutenção agendada.</Vazio>
      ) : (
        <div className="space-y-8">
          {[...porDia].map(([dia, itens]) => (
            <section key={dia}>
              <h2 className="mb-2 font-semibold capitalize text-stone-800">{dia}</h2>
              <ListaRequisicoes itens={itens} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
