import Link from "next/link";
import { ListaRequisicoes, selectItemRequisicao } from "@/components/ListaRequisicoes";
import { BotaoLink, Titulo } from "@/components/ui";
import { STATUS, STATUS_PENDENTES } from "@/lib/constantes";
import { db } from "@/lib/db";
import { ehEquipe, exigirUsuario } from "@/lib/session";

export default async function InicioPage() {
  const eu = await exigirUsuario();
  const equipe = ehEquipe(eu.perfil);
  const agora = new Date();
  const em7dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [porStatus, urgentes, minhas, proximas, concluidasMes] = await Promise.all([
    db.requisicao.groupBy({ by: ["status"], _count: { _all: true } }),
    db.requisicao.findMany({
      where: { status: { in: STATUS_PENDENTES }, prioridade: { in: ["URGENTE", "ALTA"] } },
      select: selectItemRequisicao,
      orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
      take: 5,
    }),
    db.requisicao.findMany({
      where: equipe
        ? { responsavelId: eu.id, status: { in: STATUS_PENDENTES } }
        : { solicitanteId: eu.id },
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

  const contagem = Object.fromEntries(porStatus.map((s) => [s.status, s._count._all]));
  const pendentes = STATUS_PENDENTES.reduce((t, s) => t + (contagem[s] ?? 0), 0);

  return (
    <>
      <Titulo acao={<BotaoLink href="/requisicoes/nova">+ Nova requisição</BotaoLink>}>
        Olá, {eu.nome.split(" ")[0]}
      </Titulo>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador titulo="Pendentes" valor={pendentes} href="/requisicoes?status=pendentes" destaque />
        <Indicador titulo="Abertas" valor={contagem.ABERTA ?? 0} href="/requisicoes?status=ABERTA" />
        <Indicador titulo="Agendadas" valor={contagem.AGENDADA ?? 0} href="/agenda" />
        <Indicador titulo="Concluídas no mês" valor={concluidasMes} href="/requisicoes?status=CONCLUIDA" />
      </section>

      <section className="mb-8 flex flex-wrap gap-2">
        {STATUS_PENDENTES.map((s) => (
          <Link
            key={s}
            href={`/requisicoes?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS[s].cor}`}
          >
            {STATUS[s].label}: {contagem[s] ?? 0}
          </Link>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Bloco titulo="Prioridade alta / urgente" href="/requisicoes?status=pendentes&prioridade=URGENTE">
          <ListaRequisicoes itens={urgentes} vazio="Nenhuma requisição urgente pendente. 👍" />
        </Bloco>
        <Bloco titulo="Agendadas para os próximos 7 dias" href="/agenda">
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

function Indicador({ titulo, valor, href, destaque }: { titulo: string; valor: number; href: string; destaque?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-xl p-4 shadow-sm ring-1 transition hover:-translate-y-0.5 ${
        destaque ? "bg-marca-600 text-white ring-marca-700" : "bg-white ring-stone-200"
      }`}
    >
      <div className={`text-xs font-medium ${destaque ? "text-marca-100" : "text-stone-500"}`}>{titulo}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{valor}</div>
    </Link>
  );
}

function Bloco({ titulo, href, children }: { titulo: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-stone-800">{titulo}</h2>
        <Link href={href} className="text-sm font-medium text-marca-600 hover:underline">
          Ver todas
        </Link>
      </div>
      {children}
    </section>
  );
}
