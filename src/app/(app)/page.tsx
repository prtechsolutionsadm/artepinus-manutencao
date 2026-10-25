import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleDot, Clock3, Plus, TriangleAlert } from "lucide-react";
import { ConvitePush } from "@/components/AtivarPush";
import { ListaRequisicoes, selectItemRequisicao } from "@/components/ListaRequisicoes";
import { Titulo } from "@/components/ui";
import { STATUS, STATUS_HEX, STATUS_PENDENTES } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirModulo } from "@/lib/session";
import { pode } from "@/lib/permissoes";

function saudacao() {
  const h = Number(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function InicioPage() {
  const eu = await exigirModulo("manutencao");
  const equipe = pode(eu.perfil, "atenderRequisicoes");
  const agora = new Date();
  const em7dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hojeBR = new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const inicioMes = new Date(`${hojeBR.slice(0, 8)}01T00:00:00-03:00`);

  const [porStatus, urgentes, minhas, proximas, concluidasMes] = await Promise.all([
    db.requisicao.groupBy({ by: ["status"], _count: { _all: true } }),
    db.requisicao.findMany({
      where: { status: { in: STATUS_PENDENTES }, prioridade: { in: ["URGENTE", "ALTA"] } },
      select: selectItemRequisicao,
      orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
      take: 5,
    }),
    db.requisicao.findMany({
      where: equipe ? { responsavelId: eu.id, status: { in: STATUS_PENDENTES } } : { solicitanteId: eu.id },
      select: selectItemRequisicao,
      orderBy: { atualizadoEm: "desc" },
      take: 5,
    }),
    db.requisicao.findMany({
      where: { status: "AGENDADA", dataAgendada: { gte: agora, lte: em7dias } },
      select: selectItemRequisicao,
      orderBy: { dataAgendada: "asc" },
      take: 5,
    }),
    db.requisicao.count({ where: { status: "CONCLUIDA", dataConclusao: { gte: inicioMes } } }),
  ]);

  const contagem = Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const pendentes = STATUS_PENDENTES.reduce((t, s) => t + (contagem[s] ?? 0), 0);
  const comPendentes = STATUS_PENDENTES.filter((s) => contagem[s]);

  return (
    <>
      <Titulo
        subtitulo={new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" })}
        acao={
          <Link href="/requisicoes/nova" className="btn-primario hidden lg:inline-flex">
            <Plus className="h-4 w-4" /> Nova requisição
          </Link>
        }
      >
        {saudacao()}, {eu.nome.split(" ")[0]}
      </Titulo>

      <ConvitePush />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador titulo="Pendentes" valor={pendentes} href="/requisicoes?status=pendentes" icone={<Clock3 className="h-5 w-5" />} destaque />
        <Indicador
          titulo="Aguardando análise"
          valor={contagem.ABERTA ?? 0}
          href="/requisicoes?status=ABERTA"
          icone={<CircleDot className="h-5 w-5" />}
          cor="bg-sky-50 text-sky-600"
        />
        <Indicador
          titulo="Agendadas"
          valor={contagem.AGENDADA ?? 0}
          href="/agenda"
          icone={<CalendarClock className="h-5 w-5" />}
          cor="bg-teal-50 text-teal-600"
        />
        <Indicador
          titulo="Concluídas no mês"
          valor={concluidasMes}
          href="/requisicoes?status=CONCLUIDA"
          icone={<CheckCircle2 className="h-5 w-5" />}
          cor="bg-emerald-50 text-emerald-600"
        />
      </section>

      {pendentes > 0 && (
        <section className="cartao mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Pendentes por status</h2>
            <span className="text-sm text-stone-500">{pendentes} no total</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
            {comPendentes.map((s) => (
              <div key={s} style={{ width: `${(contagem[s] / pendentes) * 100}%`, background: STATUS_HEX[s] }} title={STATUS[s].label} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {comPendentes.map((s) => (
              <Link key={s} href={`/requisicoes?status=${s}`} className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_HEX[s] }} />
                {STATUS[s].label}
                <span className="font-semibold tabular-nums text-stone-900">{contagem[s]}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-2">
        <Bloco titulo="Prioridade alta e urgente" icone={<TriangleAlert className="h-4 w-4 text-orange-500" />} href="/requisicoes?status=pendentes&prioridade=URGENTE">
          <ListaRequisicoes itens={urgentes} vazio="Nenhuma requisição urgente pendente." />
        </Bloco>
        <Bloco titulo="Agendadas nos próximos 7 dias" icone={<CalendarClock className="h-4 w-4 text-teal-600" />} href="/agenda">
          <ListaRequisicoes itens={proximas} vazio="Nada agendado para os próximos dias." />
        </Bloco>
        <Bloco
          titulo={equipe ? "Atribuídas a mim" : "Minhas requisições"}
          href={equipe ? "/requisicoes?responsavel=eu&status=pendentes" : "/requisicoes?minhas=1"}
        >
          <ListaRequisicoes itens={minhas} vazio={equipe ? "Nenhuma requisição atribuída a você." : "Você ainda não abriu requisições."} />
        </Bloco>
      </div>
    </>
  );
}

function Indicador({
  titulo,
  valor,
  href,
  icone,
  cor = "",
  destaque,
}: {
  titulo: string;
  valor: number;
  href: string;
  icone: React.ReactNode;
  cor?: string;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
        destaque ? "border-marca-700 bg-gradient-to-br from-marca-600 to-marca-700 text-white" : "border-stone-200/80 bg-white"
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${destaque ? "bg-white/15 text-white" : cor}`}>{icone}</span>
      <div className="mt-3 text-3xl font-bold tabular-nums">{valor}</div>
      <div className={`text-sm ${destaque ? "text-marca-100" : "text-stone-500"}`}>{titulo}</div>
    </Link>
  );
}

function Bloco({ titulo, icone, href, children }: { titulo: string; icone?: React.ReactNode; href: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-semibold text-stone-800">
          {icone}
          {titulo}
        </h2>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-marca-700 hover:underline">
          Ver todas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}
