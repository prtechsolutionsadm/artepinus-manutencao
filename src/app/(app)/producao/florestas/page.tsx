import type { Metadata } from "next";
import { Pencil, Plus, TreePine } from "lucide-react";
import { salvarColheita, salvarOrigem } from "@/app/actions/rastreio";
import { ActionForm, BotaoEnviar } from "@/components/ActionForm";
import { Badge, Titulo, Vazio } from "@/components/ui";
import { db } from "@/lib/db";
import { podeProducao } from "@/lib/permissoes";
import { dateParaDia, fmtNum, formatarDia, hojeSP } from "@/lib/producao";
import { TIPO_ORIGEM, codigoColheita } from "@/lib/rastreio";
import { exigirProducao } from "@/lib/session";
import type { TipoOrigem } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Florestas e colheitas" };

type Origem = {
  id: string;
  nome: string;
  tipo: TipoOrigem;
  proprietario: string | null;
  municipio: string | null;
  uf: string | null;
  especie: string | null;
  anoPlantio: number | null;
  areaHa: number | null;
  observacoes: string | null;
  ativo: boolean;
};
type Colheita = {
  id: string;
  origemId: string;
  talhao: string | null;
  inicio: Date;
  fim: Date | null;
  equipe: string | null;
  idadeAnos: number | null;
  volumeEstimadoM3: number | null;
  documento: string | null;
  observacoes: string | null;
};

function CamposOrigem({ o }: { o?: Origem }) {
  return (
    <>
      <input type="hidden" name="id" value={o?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label>Nome da floresta/fazenda *</label>
          <input name="nome" required defaultValue={o?.nome} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Tipo</label>
          <select name="tipo" defaultValue={o?.tipo ?? "TERCEIRO"} className="campo">
            {(Object.keys(TIPO_ORIGEM) as TipoOrigem[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_ORIGEM[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label>Proprietário / fornecedor</label>
          <input name="proprietario" defaultValue={o?.proprietario ?? ""} className="campo" />
        </div>
        <div>
          <label>Município</label>
          <input name="municipio" defaultValue={o?.municipio ?? ""} className="campo" />
        </div>
        <div>
          <label>UF</label>
          <input name="uf" maxLength={2} defaultValue={o?.uf ?? ""} className="campo uppercase" />
        </div>
        <div>
          <label>Espécie</label>
          <input name="especie" list="especies" defaultValue={o?.especie ?? ""} className="campo" />
        </div>
        <div>
          <label>Ano de plantio</label>
          <input name="anoPlantio" inputMode="numeric" defaultValue={o?.anoPlantio ?? ""} className="campo" />
        </div>
        <div>
          <label>Área (ha)</label>
          <input name="areaHa" inputMode="decimal" defaultValue={o?.areaHa ?? ""} className="campo" />
        </div>
        <div className="flex items-end">
          <label className="mb-2.5 flex items-center gap-2 font-normal">
            <input type="checkbox" name="ativo" defaultChecked={o?.ativo ?? true} /> Ativa
          </label>
        </div>
        <div className="sm:col-span-4">
          <label>Observações</label>
          <input name="observacoes" defaultValue={o?.observacoes ?? ""} className="campo" />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <BotaoEnviar>{o ? "Salvar" : "Cadastrar floresta"}</BotaoEnviar>
      </div>
    </>
  );
}

function CamposColheita({ c, origens }: { c?: Colheita; origens: { id: string; nome: string }[] }) {
  return (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label>Floresta *</label>
          <select name="origemId" required defaultValue={c?.origemId ?? ""} className="campo">
            <option value="">Escolha…</option>
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Talhão</label>
          <input name="talhao" defaultValue={c?.talhao ?? ""} className="campo" />
        </div>
        <div>
          <label>Idade das árvores (anos)</label>
          <input name="idadeAnos" inputMode="numeric" defaultValue={c?.idadeAnos ?? ""} className="campo" />
        </div>
        <div>
          <label>Início da derrubada *</label>
          <input name="inicio" type="date" required max={hojeSP()} defaultValue={c ? dateParaDia(c.inicio) : hojeSP()} className="campo" />
        </div>
        <div>
          <label>Fim</label>
          <input name="fim" type="date" defaultValue={c?.fim ? dateParaDia(c.fim) : ""} className="campo" />
        </div>
        <div>
          <label>Volume estimado (m³)</label>
          <input name="volumeEstimadoM3" inputMode="decimal" defaultValue={c?.volumeEstimadoM3 ?? ""} className="campo" />
        </div>
        <div>
          <label>Documento / licença</label>
          <input name="documento" defaultValue={c?.documento ?? ""} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Equipe / empreiteira</label>
          <input name="equipe" defaultValue={c?.equipe ?? ""} className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label>Observações</label>
          <input name="observacoes" defaultValue={c?.observacoes ?? ""} className="campo" />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <BotaoEnviar>{c ? "Salvar" : "Registrar colheita"}</BotaoEnviar>
      </div>
    </>
  );
}

export default async function FlorestasPage() {
  const eu = await exigirProducao();
  const gerir = podeProducao(eu, "gerir");
  const lancar = podeProducao(eu, "lancar");
  const [origens, colheitas] = await Promise.all([
    db.origemFlorestal.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }], include: { _count: { select: { colheitas: true } } } }),
    db.colheita.findMany({
      orderBy: { inicio: "desc" },
      take: 100,
      include: { origem: { select: { nome: true } }, cargas: { select: { itens: { select: { quantidade: true } } } } },
    }),
  ]);
  const ativas = origens.filter((o) => o.ativo);

  return (
    <>
      <Titulo subtitulo="O começo da história de cada pacote: de onde vêm as toras">Florestas e colheitas</Titulo>
      <datalist id="especies">
        {["Pinus taeda", "Pinus elliottii", "Eucalipto"].map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Colheitas (derrubada)</h2>
        {lancar && (
          <details className="cartao mb-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
              <Plus className="h-4 w-4" /> Nova colheita
            </summary>
            {ativas.length ? (
              <ActionForm action={salvarColheita} limparAoSalvar className="mt-4">
                <CamposColheita origens={ativas} />
              </ActionForm>
            ) : (
              <p className="mt-3 text-sm text-stone-500">Cadastre antes a floresta de origem (abaixo).</p>
            )}
          </details>
        )}
        {colheitas.length === 0 ? (
          <Vazio>Nenhuma colheita registrada.</Vazio>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {colheitas.map((c) => {
              const toras = c.cargas.reduce((s, x) => s + x.itens.reduce((y, i) => y + i.quantidade, 0), 0);
              return (
                <li key={c.id} className="px-4 py-3">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-xs text-stone-500">{codigoColheita(c.numero)}</span>
                      <span className="font-medium">{c.origem.nome}</span>
                      {c.talhao && <span className="text-sm text-stone-500">talhão {c.talhao}</span>}
                      {!c.fim && <Badge cor="bg-emerald-50 text-emerald-800 ring-emerald-200">Em andamento</Badge>}
                      <span className="w-full text-sm text-stone-500 sm:w-auto">
                        {formatarDia(c.inicio)}
                        {c.fim && ` a ${formatarDia(c.fim)}`} · {c.cargas.length} carga(s) · {fmtNum(toras)} toras recebidas
                      </span>
                      {lancar && <Pencil className="ml-auto h-4 w-4 text-stone-400" />}
                    </summary>
                    {lancar && (
                      <ActionForm action={salvarColheita} className="mt-3">
                        <CamposColheita c={c} origens={origens.filter((o) => o.ativo || o.id === c.origemId)} />
                      </ActionForm>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Florestas</h2>
        {gerir && (
          <details className="cartao mb-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-marca-700">
              <Plus className="h-4 w-4" /> Nova floresta
            </summary>
            <ActionForm action={salvarOrigem} limparAoSalvar className="mt-4">
              <CamposOrigem />
            </ActionForm>
          </details>
        )}
        {origens.length === 0 ? (
          <Vazio>Nenhuma floresta cadastrada.</Vazio>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {origens.map((o) => (
              <li key={o.id} className="cartao">
                <details>
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <TreePine className="mt-0.5 h-5 w-5 shrink-0 text-marca-600" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {o.nome} {!o.ativo && <Badge cor="bg-stone-200 text-stone-700 ring-stone-300">Inativa</Badge>}
                      </div>
                      <div className="text-sm text-stone-500">
                        {TIPO_ORIGEM[o.tipo]}
                        {o.proprietario && ` · ${o.proprietario}`}
                        {(o.municipio || o.uf) && ` · ${[o.municipio, o.uf].filter(Boolean).join("/")}`}
                      </div>
                      <div className="text-xs text-stone-400">
                        {[o.especie, o.anoPlantio && `plantio ${o.anoPlantio}`, o.areaHa && `${fmtNum(o.areaHa, 1)} ha`, `${o._count.colheitas} colheita(s)`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {gerir && <Pencil className="h-4 w-4 shrink-0 text-stone-400" />}
                  </summary>
                  {gerir && (
                    <ActionForm action={salvarOrigem} className="mt-4">
                      <CamposOrigem o={o} />
                    </ActionForm>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
