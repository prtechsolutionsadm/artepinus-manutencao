"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, House, LayoutGrid, Plus, type LucideIcon } from "lucide-react";
import { BotaoSair } from "@/components/BotaoSair";
import { ICONES } from "@/components/icones";
import { iniciais, itemAtivo, type GrupoNav } from "@/lib/menu";

type Usuario = { nome: string; perfilLabel: string };

export function MenuLateral({ grupos, usuario, sair }: { grupos: GrupoNav[]; usuario: Usuario; sair: () => Promise<void> }) {
  const path = usePathname();
  return (
    <aside className="nao-imprimir fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white lg:flex">
      <Link href="/" className="flex flex-col items-center gap-1 px-5 pb-4 pt-6" aria-label="Artepinus · Início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Artepinus" className="h-16 w-auto" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Manutenção</div>
      </Link>

      <div className="px-4 pb-2">
        <Link href="/requisicoes/nova" className="btn-primario w-full py-2.5 shadow-sm shadow-marca-700/20">
          <Plus className="h-4 w-4" /> Nova requisição
        </Link>
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

const ABAS: { href: string; label: string; Icone: LucideIcon }[] = [
  { href: "/", label: "Início", Icone: House },
  { href: "/requisicoes", label: "Requisições", Icone: ClipboardList },
  { href: "/requisicoes/nova", label: "Nova", Icone: Plus },
  { href: "/agenda", label: "Agenda", Icone: CalendarDays },
  { href: "/menu", label: "Mais", Icone: LayoutGrid },
];

export function BarraInferior({ grupos }: { grupos: GrupoNav[] }) {
  const path = usePathname();
  const foraDasAbas = grupos.flatMap((g) => g.itens).some((i) => !ABAS.some((a) => a.href === i.href) && itemAtivo(path, i.href));
  return (
    <nav className="nao-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ABAS.map(({ href, label, Icone }) => {
          const on = href === "/menu" ? path === "/menu" || foraDasAbas : itemAtivo(path, href);
          if (href === "/requisicoes/nova") {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label="Nova requisição"
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
