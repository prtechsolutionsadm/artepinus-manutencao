import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Pencil } from "lucide-react";
import { cancelarCiclo, concluirCiclo } from "@/app/actions/producao";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { BotaoAcao } from "@/components/producao/BotaoAcao";
import { ChecklistCiclo } from "@/components/producao/ChecklistCiclo";
import { Badge, Titulo } from "@/components/ui";
import {
  dateParaDataLocal,
  formatarData,
  formatarDuracao,
  minutosEntre,
} from "@/lib/constantes";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { ACLIMATACAO_HORAS, STATUS_CICLO, fmtM3, fmtNum } from "@/lib/producao";
import { exigirProducao } from "@/lib/session";

export const metadata: Metadata = { title: "Ciclo de secagem" };

export default async function CicloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eu = await exigirProducao();
  const { id } = await params;
  const c = await db.cicloSecagem.findUnique({
    where: { id },
    include: {
      estufa: true,
      responsavel: { select: { nome: true } },
      cargas: { orderBy: [{ espessura: "asc" }, { comprimento: "asc" }] },
      checklist: {
        orderBy: { ordem: "asc" },
        include: { marcadoPor: { select: { nome: true } } },
      },
    },
  });
  if (!c) notFound();
  const ativo = c.status === "EM_SECAGEM";
  const lancar = podeProducao(eu, "lancar");
  const m3 = c.cargas.reduce((s, x) => s + x.m3, 0);
  const grades = c.cargas.reduce((s, x) => s + x.grades, 0);
  const liberada = c.saida
    ? new Date(c.saida.getTime() + ACLIMATACAO_HORAS * 3.6e6)
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Titulo
        subtitulo={
          <>
            Iniciado por {c.responsavel.nome}
            {c.numero ? ` · ciclo nº ${c.numero}` : ""}
          </>
        }
        acao={
          ativo && (
            <div className="flex gap-2">
              {lancar && (
                <Link
                  href={`/producao/estufas/ciclos/${c.id}/editar`}
                  className="btn-secundario"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              )}
              {podeProducao(eu, "gerir") && (
                <BotaoAcao
                  acao={cancelarCiclo}
                  arg={c.id}
                  confirmar="Cancelar este ciclo? Ele sai do painel das estufas."
                  className="btn-perigo"
                >
                  <Ban className="h-4 w-4" /> Cancelar
                </BotaoAcao>
              )}
            </div>
          )
        }
      >
        <span className="flex flex-wrap items-center gap-3">
          {c.estufa.nome}{" "}
          <Badge cor={STATUS_CICLO[c.status].cor}>
            {STATUS_CICLO[c.status].label}
          </Badge>
        </span>
      </Titulo>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Entrada", formatarData(c.entrada, true)],
          [
            ativo ? "Previsão de saída" : "Saída",
            formatarData(ativo ? c.previsaoSaida : c.saida, true),
          ],
          [
            ativo ? "Tempo decorrido" : "Duração",
            formatarDuracao(minutosEntre(c.entrada, c.saida)),
          ],
          ["Volume", `${fmtM3(m3, 2)} · ${grades} grades`],
          [
            "Umidade inicial",
            c.umidadeInicial != null ? `${fmtNum(c.umidadeInicial, 1)}%` : "—",
          ],
          [
            "Umidade final",
            c.umidadeFinal != null ? `${fmtNum(c.umidadeFinal, 1)}%` : "—",
          ],
          ["Plantão", c.plantao ?? "—"],
          ["Próxima carga", c.proximaCarga ?? "—"],
        ].map(([r, v]) => (
          <div key={r} className="cartao py-3">
            <dt className="text-xs text-stone-500">{r}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {liberada && c.status === "CONCLUIDO" && (
        <p className="mb-6 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
          Aclimatação: 24 h no pátio e mais 24 h na fábrica (medir os pacotes de
          novo). Madeira liberada para a produção a partir de{" "}
          <b>{formatarData(liberada, true)}</b>.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="cartao overflow-hidden p-0">
            <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">
              Madeira na estufa
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Esp.</th>
                    <th className="px-3 py-2 font-semibold">Largura</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Comp.
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Grades
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">m³</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {c.cargas.map((x) => (
                    <tr key={x.id}>
                      <td className="px-3 py-2 tabular-nums">
                        {x.espessura} mm
                      </td>
                      <td className="px-3 py-2">{x.largura}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtNum(x.comprimento, 2)} m
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {x.grades}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtNum(x.m3, 3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {ativo && lancar && (
            <section className="cartao">
              <h2 className="mb-3 font-semibold">Concluir ciclo</h2>
              <ActionForm action={concluirCiclo} className="grid gap-3">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="saida">Saída *</label>
                    <input
                      id="saida"
                      name="saida"
                      type="datetime-local"
                      required
                      defaultValue={dateParaDataLocal(new Date())}
                      className="campo"
                    />
                  </div>
                  <div>
                    <label htmlFor="umidadeFinal">Umidade final (%)</label>
                    <input
                      id="umidadeFinal"
                      name="umidadeFinal"
                      inputMode="decimal"
                      className="campo"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="observacoes">Observações</label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={2}
                    defaultValue={c.observacoes ?? ""}
                    className="campo"
                  />
                </div>
                <BotaoEnviar>Concluir ciclo</BotaoEnviar>
              </ActionForm>
            </section>
          )}

          {c.observacoes && (
            <section className="cartao">
              <h2 className="mb-1 font-semibold">Observações</h2>
              <p className="whitespace-pre-line text-sm text-stone-700">
                {c.observacoes}
              </p>
            </section>
          )}
        </div>

        <section className="cartao min-w-0 lg:col-span-3">
          <h2 className="mb-3 font-semibold">Checklist da estufa</h2>
          <ChecklistCiclo
            editavel={ativo && lancar}
            itens={c.checklist.map((i) => ({
              id: i.id,
              secao: i.secao,
              texto: i.texto,
              conforme: i.conforme,
              observacao: i.observacao,
              marcadoPor: i.marcadoPor?.nome ?? null,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
