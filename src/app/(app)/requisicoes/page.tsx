import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { ListaRequisicoes, selectItemRequisicao } from "@/components/ListaRequisicoes";
import { Titulo } from "@/components/ui";
import { PRIORIDADE, STATUS, STATUS_ORDEM, STATUS_PENDENTES, TIPO } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";
import type { Prioridade, StatusRequisicao, TipoManutencao } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Requisições" };

const POR_PAGINA = 30;

type Filtros = {
  q?: string;
  status?: string;
  prioridade?: string;
  tipo?: string;
  setor?: string;
  responsavel?: string;
  minhas?: string;
  pagina?: string;
};

export default async function RequisicoesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const eu = await exigirUsuario();
  const f = await searchParams;
  const pagina = Math.max(1, Number(f.pagina) || 1);

  const where: Prisma.RequisicaoWhereInput = {};
  if (f.status === "pendentes") where.status = { in: STATUS_PENDENTES };
  else if (f.status && f.status in STATUS) where.status = f.status as StatusRequisicao;
  if (f.prioridade && f.prioridade in PRIORIDADE) where.prioridade = f.prioridade as Prioridade;
  if (f.tipo && f.tipo in TIPO) where.tipo = f.tipo as TipoManutencao;
  if (f.setor) where.setorId = f.setor;
  if (f.responsavel === "eu") where.responsavelId = eu.id;
  if (f.minhas) where.solicitanteId = eu.id;
  if (f.q?.trim()) {
    const q = f.q.trim();
    const numero = Number(q.replace(/^#/, ""));
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { descricao: { contains: q, mode: "insensitive" } },
      { equipamento: { is: { OR: [{ codigo: { contains: q, mode: "insensitive" } }, { nome: { contains: q, mode: "insensitive" } }] } } },
      ...(Number.isInteger(numero) && numero > 0 ? [{ id: numero }] : []),
    ];
  }

  const [total, itens, setores] = await Promise.all([
    db.requisicao.count({ where }),
    db.requisicao.findMany({
      where,
      select: selectItemRequisicao,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const linkPagina = (p: number) => {
    const sp = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    sp.set("pagina", String(p));
    return `/requisicoes?${sp}`;
  };

  return (
    <>
      <Titulo
        subtitulo="Todas as requisições de manutenção"
        acao={
          <Link href="/requisicoes/nova" className="btn-primario hidden lg:inline-flex">
            <Plus className="h-4 w-4" /> Nova requisição
          </Link>
        }
      >
        Requisições
      </Titulo>

      <form className="cartao mb-4 grid grid-cols-2 gap-3 md:grid-cols-6" method="get">
        <div className="col-span-2">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={f.q} placeholder="Nº, título, equipamento…" className="campo" />
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={f.status ?? ""} className="campo">
            <option value="">Todos</option>
            <option value="pendentes">Pendentes</option>
            {STATUS_ORDEM.map((s) => (
              <option key={s} value={s}>
                {STATUS[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prioridade">Prioridade</label>
          <select id="prioridade" name="prioridade" defaultValue={f.prioridade ?? ""} className="campo">
            <option value="">Todas</option>
            {Object.entries(PRIORIDADE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={f.tipo ?? ""} className="campo">
            <option value="">Todos</option>
            {Object.entries(TIPO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="setor">Setor</label>
          <select id="setor" name="setor" defaultValue={f.setor ?? ""} className="campo">
            <option value="">Todos</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-4 md:col-span-6">
          <label className="flex items-center gap-2 font-normal">
            <input type="checkbox" name="minhas" value="1" defaultChecked={!!f.minhas} /> Abertas por mim
          </label>
          <label className="flex items-center gap-2 font-normal">
            <input type="checkbox" name="responsavel" value="eu" defaultChecked={f.responsavel === "eu"} /> Atribuídas a mim
          </label>
          <div className="ml-auto flex gap-2">
            <Link href="/requisicoes" className="btn-secundario">
              Limpar
            </Link>
            <button className="btn-primario">Filtrar</button>
          </div>
        </div>
      </form>

      <p className="mb-2 text-sm text-stone-500">
        {total} {total === 1 ? "requisição encontrada" : "requisições encontradas"}
      </p>
      <ListaRequisicoes itens={itens} />

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm">
          {pagina > 1 && (
            <Link className="btn-secundario" href={linkPagina(pagina - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          )}
          <span className="px-2 text-stone-600">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link className="btn-secundario" href={linkPagina(pagina + 1)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
