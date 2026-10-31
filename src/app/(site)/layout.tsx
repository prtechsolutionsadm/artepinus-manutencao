import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { IconeInstagram } from "@/components/site/IconeInstagram";
import { CREDITO, EMPRESA, direitos } from "@/lib/empresa";

export const metadata: Metadata = {
  title: { absolute: "Artepinus · Madeira serrada de pinus desde 1983" },
  description: `${EMPRESA.razaoSocial}: madeira serrada de pinus, seca em estufa, com rastreabilidade da floresta ao pacote.`,
};

const LINKS = [
  { href: "/#empresa", label: "Empresa" },
  { href: "/#produtos", label: "Produtos" },
  { href: "/#processo", label: "Processo" },
  { href: "/#qualidade", label: "Qualidade" },
  { href: "/#contato", label: "Contato" },
];

const instagram = EMPRESA.contato.instagram ? `https://www.instagram.com/${EMPRESA.contato.instagram}/` : null;

/** Site institucional da Artepinus (público). O sistema fica em /sistema. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link href="/" aria-label="Artepinus · início" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMPRESA.logo} alt="Artepinus" className="h-9 w-auto lg:h-10" />
          </Link>
          <nav aria-label="Seções" className="ml-auto hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-stone-600 transition hover:text-marca-700">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da Artepinus"
                title="Instagram"
                className="hidden h-9 w-9 place-items-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 sm:grid"
              >
                <IconeInstagram className="h-[18px] w-[18px]" />
              </a>
            )}
            <Link
              href="/sistema"
              className="hidden items-center gap-2 rounded-md bg-marca-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-marca-900 sm:inline-flex"
            >
              Acessar sistema <ArrowRight className="h-4 w-4" />
            </Link>
            <details className="relative lg:hidden">
              <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-stone-200 text-stone-700" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 top-12 w-64 border border-stone-200 bg-white py-2 shadow-lg">
                {LINKS.map((l) => (
                  <a key={l.href} href={l.href} className="block px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
                    {l.label}
                  </a>
                ))}
                {instagram && (
                  <a href={instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
                    <IconeInstagram className="h-4 w-4" /> Instagram
                  </a>
                )}
                <div className="mt-1 border-t border-stone-200 px-4 pt-3">
                  <Link href="/sistema" className="flex w-full items-center justify-center gap-2 rounded-md bg-marca-700 px-4 py-2.5 text-sm font-semibold text-white">
                    Acessar sistema <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMPRESA.logo} alt="Artepinus" className="h-10 w-auto" />
            <p className="mt-4 text-sm leading-relaxed text-stone-500">
              {EMPRESA.razaoSocial}
              <br />
              CNPJ {EMPRESA.cnpj}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Navegação</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-stone-600 hover:text-marca-700">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Redes</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {instagram && (
                <li>
                  <a href={instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-stone-600 hover:text-marca-700">
                    <IconeInstagram className="h-4 w-4" /> @{EMPRESA.contato.instagram}
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Área do colaborador</h2>
            <p className="mt-4 text-sm text-stone-600">Produção, estufas e rastreabilidade dos pacotes.</p>
            <Link href="/sistema" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-marca-700 hover:text-marca-900">
              Acessar sistema <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="border-t border-stone-200">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-stone-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
            <span>{direitos()}</span>
            <span>{CREDITO}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
