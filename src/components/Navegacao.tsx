"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemNav = { href: string; label: string; icone: string; mobile?: boolean };

function ativo(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function NavDesktop({ itens }: { itens: ItemNav[] }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            ativo(path, i.href) && !(i.href === "/requisicoes" && path === "/requisicoes/nova")
              ? "bg-white/15 text-white"
              : "text-marca-100 hover:bg-white/10 hover:text-white"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function NavMobile({ itens }: { itens: ItemNav[] }) {
  const path = usePathname();
  const visiveis = itens.filter((i) => i.mobile);
  return (
    <nav
      className="nao-imprimir fixed inset-x-0 bottom-0 z-20 grid border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${visiveis.length}, minmax(0, 1fr))` }}
    >
      {visiveis.map((i) => {
        const on = ativo(path, i.href) && !(i.href === "/requisicoes" && path === "/requisicoes/nova");
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? "text-marca-600" : "text-stone-500"}`}
          >
            <span className="text-xl leading-none" aria-hidden>
              {i.icone}
            </span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
