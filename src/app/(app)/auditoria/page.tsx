import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Titulo, Vazio } from "@/components/ui";
import { PERFIL, PERFIL_PRODUCAO, STATUS, formatarData } from "@/lib/constantes";
import { db } from "@/lib/db";
import { exigirPermissao } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Auditoria" };

const POR_PAGINA = 50;

const ENTIDADES: Record<string, string> = {
  Requisicao: "Requisições",
  Usuario: "Usuários e acessos",
  Equipamento: "Equipamentos",
  Setor: "Setores",
  PlanoPreventivo: "Planos de preventiva",
  ChecklistModelo: "Checklists",
};

const CAMPOS: Record<string, string> = {
  status: "Status",
  responsavelId: "Responsável",
  dataAgendada: "Data agendada",
  solucao: "Serviço realizado",
  maquinaParada: "Máquina parada",
  paradaInicio: "Parada desde",
  paradaFim: "Voltou a operar",
  observacao: "Observação",
  nome: "Nome",
  login: "Login",
  perfil: "Perfil",
  ativo: "Ativo",
  senha: "Senha",
  codigo: "Código",
  descricao: "Descrição",
  fabricante: "Fabricante",
  modelo: "Modelo",
  numeroSerie: "Nº de série",
  setorId: "Setor",
  motivo: "Motivo",
};

type Filtros = { usuario?: string; entidade?: string; de?: string; ate?: string; q?: string; pagina?: string };

function valorLegivel(campo: string, v: unknown, nomes: Map<string, string>) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (campo === "status" && typeof v === "string" && v in STATUS) return STATUS[v as keyof typeof STATUS].label;
  if (campo === "perfil" && typeof v === "string" && v in PERFIL) return PERFIL[v as keyof typeof PERFIL];
  if (campo === "perfilProducao") return typeof v === "string" && v in PERFIL_PRODUCAO ? PERFIL_PRODUCAO[v as keyof typeof PERFIL_PRODUCAO] : "Sem acesso";
  if ((campo === "responsavelId" || campo === "setorId") && typeof v === "string") return nomes.get(v) ?? v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatarData(new Date(v), true);
  return String(v);
}

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  await exigirPermissao("auditoria");
  const f = await searchParams;
  const pagina = Math.max(1, Number(f.pagina) || 1);

  const where: Prisma.AuditoriaWhereInput = {};
  if (f.usuario) where.usuarioId = f.usuario;
  if (f.entidade && f.entidade in ENTIDADES) where.entidade = f.entidade;
  if (f.q?.trim()) where.resumo = { contains: f.q.trim(), mode: "insensitive" };
  const criado: Prisma.DateTimeFilter = {};
  if (f.de && /^\d{4}-\d{2}-\d{2}$/.test(f.de)) criado.gte = new Date(`${f.de}T00:00:00-03:00`);
  if (f.ate && /^\d{4}-\d{2}-\d{2}$/.test(f.ate)) criado.lt = new Date(new Date(`${f.ate}T00:00:00-03:00`).getTime() + 86400000);
  if (criado.gte || criado.lt) where.criadoEm = criado;

  const [total, itens, usuarios, setores] = await Promise.all([
    db.auditoria.count({ where }),
    db.auditoria.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { usuario: { select: { nome: true } } },
    }),
    db.usuario.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    db.setor.findMany({ select: { id: true, nome: true } }),
  ]);
  const nomes = new Map([...usuarios, ...setores].map((x) => [x.id, x.nome]));
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => {
    const sp = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    sp.set("pagina", String(p));
    return `/auditoria?${sp}`;
  };
  const linkEntidade = (entidade: string, id: string | null) =>
    !id ? null : entidade === "Requisicao" ? `/requisicoes/${id}` : entidade === "Equipamento" ? `/equipamentos/${id}` : null;

  return (
    <>
      <Titulo subtitulo="Quem fez o quê no sistema, e quando">Auditoria</Titulo>

      <form method="get" className="cartao mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="col-span-2">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={f.q} placeholder="Ex.: #00012, senha, LIX-02…" className="campo" />
        </div>
        <div>
          <label htmlFor="usuario">Usuário</label>
          <select id="usuario" name="usuario" defaultValue={f.usuario ?? ""} className="campo">
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="entidade">Área</label>
          <select id="entidade" name="entidade" defaultValue={f.entidade ?? ""} className="campo">
            <option value="">Todas</option>
            {Object.entries(ENTIDADES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="de">De</label>
          <input id="de" name="de" type="date" defaultValue={f.de} className="campo" />
        </div>
        <div>
          <label htmlFor="ate">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={f.ate} className="campo" />
        </div>
        <div className="col-span-2 flex justify-end gap-2 lg:col-span-6">
          <Link href="/auditoria" className="btn-secundario">
            Limpar
          </Link>
          <button className="btn-primario">Filtrar</button>
        </div>
      </form>

      <p className="mb-2 text-sm text-stone-500">
        {total} registro{total === 1 ? "" : "s"}
      </p>
      {itens.length === 0 ? (
        <Vazio>Nenhum registro encontrado.</Vazio>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          {itens.map((a) => {
            const detalhes = (a.detalhes ?? {}) as Record<string, unknown>;
            const mudancas = Object.entries(detalhes).filter(
              ([, v]) => v && typeof v === "object" && "de" in (v as object) && "para" in (v as object)
            ) as [string, { de: unknown; para: unknown }][];
            const href = linkEntidade(a.entidade, a.entidadeId);
            return (
              <li key={a.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold">{a.usuario?.nome ?? "Sistema"}</span>{" "}
                    {href ? (
                      <Link href={href} className="text-stone-700 hover:text-marca-700 hover:underline">
                        {a.resumo}
                      </Link>
                    ) : (
                      <span className="text-stone-700">{a.resumo}</span>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-stone-400">{formatarData(a.criadoEm, true)}</time>
                </div>
                {mudancas.length > 0 && (
                  <dl className="mt-2 grid gap-1 rounded-xl bg-stone-50 p-2.5 text-xs sm:grid-cols-[max-content_1fr] sm:gap-x-4">
                    {mudancas.map(([campo, m]) => (
                      <div key={campo} className="contents">
                        <dt className="font-medium text-stone-500">{CAMPOS[campo] ?? campo}</dt>
                        <dd className="min-w-0 break-words text-stone-700">
                          <span className="text-stone-400 line-through">{valorLegivel(campo, m.de, nomes)}</span> →{" "}
                          <span className="font-medium">{valorLegivel(campo, m.para, nomes)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm">
          {pagina > 1 && (
            <Link className="btn-secundario" href={link(pagina - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          )}
          <span className="px-2 text-stone-600">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link className="btn-secundario" href={link(pagina + 1)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
