"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, ClipboardList, ClipboardPen, Flame, House, LayoutDashboard, LayoutGrid, Plus, Search, TreePine, type LucideIcon } from "lucide-react";
import { BotaoSair } from "@/components/BotaoSair";
import { ICONES } from "@/components/icones";
import { COOKIE_MODULO, iniciais, itemAtivo, moduloDaRota, type GrupoNav } from "@/lib/menu";
import { MODULOS, type Modulo } from "@/lib/permissoes";

type Usuario = { nome: string; perfilLabel: string };
export type Menus = Partial<Record<Modulo, GrupoNav[]>>;

/**
 * Módulo em uso: o da rota atual; nas páginas comuns (perfil, manual…) continua
 * o último módulo visitado (guardado em cookie para o servidor já renderizar certo).
 */
export function useModulo(menus: Menus, salvo: Modulo | null): Modulo {
  const path = usePathname();
  const disponiveis = Object.keys(menus) as Modulo[];
  const daRota = moduloDaRota(path);
  const [ultimo, setUltimo] = useState<Modulo | null>(salvo);

  useEffect(() => {
    if (!daRota) return;
    setUltimo(daRota);
    document.cookie = `${COOKIE_MODULO}=${daRota}; path=/; max-age=31536000; samesite=lax`;
  }, [daRota]);

  const escolhido = daRota ?? ultimo;
  return escolhido && disponiveis.includes(escolhido) ? escolhido : disponiveis[0];
}

const ACAO_PRINCIPAL: Record<Modulo, { href: string; label: string }> = {
  manutencao: { href: "/requisicoes/nova", label: "Nova requisição" },
  producao: { href: "/producao/boletins/novo", label: "Novo boletim" },
};

export function TrocaModulo({ menus, modulo }: { menus: Menus; modulo: Modulo }) {
  const disponiveis = Object.keys(menus) as Modulo[];
  if (disponiveis.length < 2) return null;
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1" role="tablist" aria-label="Módulo">
      {disponiveis.map((m) => (
        <Link
          key={m}
          href={MODULOS[m].inicio}
          role="tab"
          aria-selected={m === modulo}
          className={`rounded-lg px-2 py-1.5 text-center text-sm font-semibold transition ${
            m === modulo ? "bg-white text-marca-700 shadow-sm" : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {MODULOS[m].nome}
        </Link>
      ))}
    </div>
  );
}

export function MenuLateral({
  menus,
  salvo,
  podeLancarProducao,
  usuario,
  sair,
}: {
  menus: Menus;
  salvo: Modulo | null;
  podeLancarProducao: boolean;
  usuario: Usuario;
  sair: () => Promise<void>;
}) {
  const path = usePathname();
  const modulo = useModulo(menus, salvo);
  const grupos = menus[modulo] ?? [];
  const acao = modulo === "manutencao" || podeLancarProducao ? ACAO_PRINCIPAL[modulo] : null;
  return (
    <aside className="nao-imprimir fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white lg:flex">
      <Link href={MODULOS[modulo].inicio} className="flex flex-col items-center gap-1 px-5 pb-4 pt-6" aria-label={`Artepinus · ${MODULOS[modulo].nome}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Artepinus" className="h-16 w-auto" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{MODULOS[modulo].nome}</div>
      </Link>

      <div className="space-y-3 px-4 pb-2">
        <TrocaModulo menus={menus} modulo={modulo} />
        {acao && (
          <Link href={acao.href} className="btn-primario w-full py-2.5 shadow-sm shadow-marca-700/20">
            <Plus className="h-4 w-4" /> {acao.label}
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{g.titulo}</div>
            <ul className="space-y-0.5">
              {g.itens.map((i) => {
                const Icone = ICONES[i.icone];
                const on = itemAtivo(path, i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        on ? "bg-marca-50 text-marca-700" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      <Icone className={`h-[18px] w-[18px] ${on ? "text-marca-600" : "text-stone-400"}`} strokeWidth={2} />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-stone-200 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca-100 text-sm font-semibold text-marca-700">
          {iniciais(usuario.nome)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{usuario.nome}</div>
          <div className="truncate text-xs text-stone-500">{usuario.perfilLabel}</div>
        </div>
        <BotaoSair sair={sair} />
      </div>
    </aside>
  );
}

type Aba = { href: string; label: string; Icone: LucideIcon; destaque?: boolean };

const ABAS: Record<Modulo, Aba[]> = {
  manutencao: [
    { href: "/", label: "Início", Icone: House },
    { href: "/requisicoes", label: "Requisições", Icone: ClipboardList },
    { href: "/requisicoes/nova", label: "Nova requisição", Icone: Plus, destaque: true },
    { href: "/agenda", label: "Agenda", Icone: CalendarDays },
    { href: "/menu", label: "Mais", Icone: LayoutGrid },
  ],
  producao: [
    { href: "/producao", label: "Painel", Icone: LayoutDashboard },
    { href: "/producao/boletins", label: "Boletins", Icone: ClipboardPen },
    { href: "/producao/boletins/novo", label: "Novo boletim", Icone: Plus, destaque: true },
    { href: "/producao/estufas", label: "Estufas", Icone: Flame },
    { href: "/menu", label: "Mais", Icone: LayoutGrid },
  ],
};

export function BarraInferior({ menus, salvo, podeLancarProducao }: { menus: Menus; salvo: Modulo | null; podeLancarProducao: boolean }) {
  const path = usePathname();
  const modulo = useModulo(menus, salvo);
  const abas = ABAS[modulo].map((a) =>
    a.destaque && modulo === "producao" && !podeLancarProducao ? { href: "/producao/toras", label: "Toras", Icone: TreePine } : a,
  );
  const foraDasAbas = (menus[modulo] ?? []).flatMap((g) => g.itens).some((i) => !abas.some((a) => a.href === i.href) && itemAtivo(path, i.href));
  return (
    <nav className="nao-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {abas.map(({ href, label, Icone, destaque }) => {
          const on = href === "/menu" ? path === "/menu" || foraDasAbas : itemAtivo(path, href);
          if (destaque) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  className="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-marca-600 text-white shadow-lg shadow-marca-700/30 ring-4 ring-white active:scale-95"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? "text-marca-700" : "text-stone-500"}`}
              >
                <Icone className="h-[22px] w-[22px]" strokeWidth={on ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Busca do topo: só faz sentido no módulo de manutenção. */
export function BuscaTopo({ menus, salvo, celular = false }: { menus: Menus; salvo: Modulo | null; celular?: boolean }) {
  const modulo = useModulo(menus, salvo);
  if (modulo !== "manutencao") return null;
  if (celular) {
    return (
      <Link href="/requisicoes" aria-label="Buscar" className="grid h-10 w-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100 sm:hidden">
        <Search className="h-5 w-5" />
      </Link>
    );
  }
  return (
    <form action="/requisicoes" className="relative hidden max-w-md flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        name="q"
        type="search"
        placeholder="Buscar requisição, nº ou equipamento…"
        className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-sm outline-none transition focus:border-marca-500 focus:bg-white focus:ring-2 focus:ring-marca-500/20"
      />
    </form>
  );
}

/** Menu completo no celular, do módulo em uso, com a troca de módulo no topo. */
export function MenuCelular({ menus, salvo }: { menus: Menus; salvo: Modulo | null }) {
  const modulo = useModulo(menus, salvo);
  return (
    <>
      <TrocaModulo menus={menus} modulo={modulo} />
      {(menus[modulo] ?? []).map((g) => (
        <section key={g.titulo}>
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{g.titulo}</h2>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {g.itens.map((i) => {
              const Icone = ICONES[i.icone];
              return (
                <li key={i.href}>
                  <Link href={i.href} className="flex items-center gap-3 px-4 py-3.5 active:bg-stone-50">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-stone-600">
                      <Icone className="h-[18px] w-[18px]" />
                    </span>
                    <span className="flex-1 font-medium">{i.label}</span>
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
