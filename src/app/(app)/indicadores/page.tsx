import type { Metadata } from "next";
import Link from "next/link";
import { BarrasHorizontais, ColunasEmpilhadas } from "@/components/Graficos";
import { Titulo } from "@/components/ui";
import { formatarData, formatarDuracao } from "@/lib/constantes";
import { db } from "@/lib/db";
import { PERIODOS, calcularIndicadores, type Periodo } from "@/lib/indicadores";
import { exigirPermissao } from "@/lib/session";

export const metadata: Metadata = { title: "Indicadores" };

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")}%`);
const horas = (h: number | null) => (h === null ? "—" : h >= 48 ? `${Math.round(h / 24)} dias` : `${Math.round(h)} h`);

export default async function IndicadoresPage({ searchParams }: { searchParams: Promise<{ periodo?: string; setor?: string }> }) {
  await exigirPermissao("relatorios");
  const sp = await searchParams;
  const periodo: Periodo = sp.periodo && sp.periodo in PERIODOS ? (sp.periodo as Periodo) : "90";
  const [ind, setores] = await Promise.all([calcularIndicadores(periodo, sp.setor || undefined), db.setor.findMany({ orderBy: { nome: "asc" } })]);
  const r = ind.resumo;
  const link = (p: Partial<{ periodo: string; setor: string }>) => {
    const q = new URLSearchParams({ periodo, ...(sp.setor ? { setor: sp.setor } : {}), ...p });
    if (!q.get("setor")) q.delete("setor");
    return `/indicadores?${q}`;
  };

  return (
    <>
      <Titulo subtitulo={`${formatarData(ind.de)} a ${formatarData(ind.ate)} · ${r.equipamentosAtivos} equipamentos ativos`}>Indicadores</Titulo>

      {/* Filtros: uma linha acima dos gráficos */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap rounded-xl border border-stone-200 bg-white p-1 shadow-xs">
          {Object.entries(PERIODOS).map(([k, v]) => (
            <Link
              key={k}
              href={link({ periodo: k })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${k === periodo ? "bg-marca-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
            >
              {v.replace("Últimos ", "")}
            </Link>
          ))}
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="periodo" value={periodo} />
          <select name="setor" defaultValue={sp.setor ?? ""} className="campo mt-0 w-auto py-2" aria-label="Setor">
            <option value="">Todos os setores</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          <button className="btn-secundario py-2">Aplicar</button>
        </form>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile rotulo="Disponibilidade" valor={pct(r.disponibilidade)} nota="tempo em que as máquinas não estavam paradas" destaque />
        <Tile rotulo="Tempo parado" valor={formatarDuracao(r.minutosParados)} nota="soma das paradas no período" />
        <Tile rotulo="MTTR · tempo médio de reparo" valor={formatarDuracao(r.mttr)} nota="duração média de uma parada" />
        <Tile rotulo="MTBF · tempo entre falhas" valor={horas(r.mtbfHoras)} nota={`${r.corretivas} falha${r.corretivas === 1 ? "" : "s"} (corretivas)`} />
        <Tile rotulo="Tempo médio de atendimento" valor={formatarDuracao(r.tempoMedioAtendimento)} nota="da abertura à conclusão" />
        <Tile rotulo="Preventivas no prazo" valor={pct(r.preventivasNoPrazo)} nota={`${r.preventivasDevidas} previstas no período`} />
        <Tile rotulo="Horas de manutenção" valor={formatarDuracao(r.minutosTrabalhados)} nota={`${r.concluidas} requisições concluídas`} />
        <Tile rotulo="Pendentes agora" valor={String(r.backlog)} nota={`${r.abertas} abertas no período`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao min-w-0 lg:col-span-2">
          <h2 className="font-semibold">Requisições abertas por mês</h2>
          <p className="mb-3 text-sm text-stone-500">
            {r.preventivas} preventivas para {r.corretivas} corretivas no período
          </p>
          <ColunasEmpilhadas
            titulo="Requisições abertas por mês, por tipo"
            dados={ind.porMes}
            series={[
              { chave: "corretiva", rotulo: "Corretiva" },
              { chave: "preventiva", rotulo: "Preventiva" },
              { chave: "outras", rotulo: "Preditiva / melhoria" },
            ]}
          />
        </section>
        <section className="cartao min-w-0">
          <h2 className="font-semibold">Equipamentos com mais falhas</h2>
          <p className="mb-4 text-sm text-stone-500">Corretivas abertas no período</p>
          <BarrasHorizontais itens={ind.topFalhas} vazio="Nenhuma falha registrada no período." />
        </section>
        <section className="cartao min-w-0">
          <h2 className="font-semibold">Equipamentos com mais tempo parado</h2>
          <p className="mb-4 text-sm text-stone-500">Soma das paradas no período</p>
          <BarrasHorizontais itens={ind.topParado} formato="duracao" vazio="Nenhuma parada registrada no período." />
        </section>
        <section className="cartao min-w-0">
          <h2 className="font-semibold">Horas por manutentor</h2>
          <p className="mb-4 text-sm text-stone-500">Lançamentos de horas no período</p>
          <BarrasHorizontais itens={ind.porManutentor} formato="duracao" vazio="Nenhuma hora lançada no período." />
        </section>
        <section className="cartao min-w-0">
          <h2 className="font-semibold">Requisições por setor</h2>
          <p className="mb-4 text-sm text-stone-500">Abertas no período</p>
          <BarrasHorizontais itens={ind.porSetor} />
        </section>
      </div>
    </>
  );
}

function Tile({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-xs sm:p-5 ${destaque ? "border-marca-700 bg-gradient-to-br from-marca-600 to-marca-700 text-white" : "border-stone-200/80 bg-white"}`}>
      <div className={`text-sm ${destaque ? "text-marca-100" : "text-stone-500"}`}>{rotulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{valor}</div>
      <div className={`mt-1 text-xs ${destaque ? "text-marca-100/80" : "text-stone-400"}`}>{nota}</div>
    </div>
  );
}
