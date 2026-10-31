import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, Menu } from "lucide-react";
import { IconeInstagram } from "@/components/site/IconeInstagram";
import { CREDITO, EMPRESA, direitos } from "@/lib/empresa";

export const metadata: Metadata = {
  title: { absolute: "Artepinus · Madeira serrada de pinus desde 1983" },
  description: `${EMPRESA.razaoSocial}: madeira serrada de pinus, seca em estufa, com rastreabilidade da floresta ao pacote.`,
};

const LINKS = [
  { href: "/#empresa", label: "A empresa" },
  { href: "/#processo", label: "Processo" },
  { href: "/#produtos", label: "Produtos" },
  { href: "/#rastreabilidade", label: "Rastreabilidade" },
  { href: "/#contato", label: "Contato" },
];

/** Site institucional da Artepinus (público). O sistema fica em /sistema. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/" aria-label="Artepinus · início" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMPRESA.logo} alt="Artepinus" className="h-10 w-auto lg:h-12" />
          </Link>
          <nav aria-label="Seções" className="hidden flex-1 justify-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900">
                {l.label}
              </a>
            ))}
          </nav>
          {EMPRESA.contato.instagram && (
            <a
              href={`https://www.instagram.com/${EMPRESA.contato.instagram}/`}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram da Artepinus"
              title="Instagram"
              className="ml-auto hidden h-10 w-10 place-items-center rounded-xl text-stone-600 hover:bg-stone-100 hover:text-stone-900 sm:grid lg:ml-0"
            >
              <IconeInstagram className="h-5 w-5" />
            </a>
          )}
          <Link href="/sistema" className="btn-primario hidden sm:inline-flex">
            <LogIn className="h-4 w-4" /> Acessar sistema
          </Link>
          <details className="group relative ml-auto sm:ml-0 lg:hidden">
            <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl text-stone-700 hover:bg-stone-100" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-12 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 font-medium text-stone-700 hover:bg-stone-50">
                  {l.label}
                </a>
              ))}
              {EMPRESA.contato.instagram && (
                <a
                  href={`https://www.instagram.com/${EMPRESA.contato.instagram}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium text-stone-700 hover:bg-stone-50"
                >
                  <IconeInstagram className="h-4 w-4" /> Instagram
                </a>
              )}
              <Link href="/sistema" className="btn-primario mt-2 w-full">
                <LogIn className="h-4 w-4" /> Acessar sistema
              </Link>
            </div>
          </details>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-marca-900 text-marca-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMPRESA.logoBranco} alt="Artepinus" className="h-16 w-auto" />
            <p className="mt-4 text-sm leading-relaxed text-marca-100/80">
              {EMPRESA.razaoSocial}
              <br />
              CNPJ {EMPRESA.cnpj}
            </p>
            {EMPRESA.contato.instagram && (
              <a
                href={`https://www.instagram.com/${EMPRESA.contato.instagram}/`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/15 hover:bg-white/15"
              >
                <IconeInstagram className="h-4 w-4" /> @{EMPRESA.contato.instagram}
              </a>
            )}
          </div>
          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-2 text-sm">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-marca-100/80 hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="md:text-right">
            <div className="text-sm font-semibold text-white">Área do colaborador</div>
            <p className="mt-1 text-sm text-marca-100/80">Produção, estufas e rastreabilidade dos pacotes.</p>
            <Link href="/sistema" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-marca-900 hover:bg-marca-50">
              <LogIn className="h-4 w-4" /> Acessar sistema
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-marca-100/60 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
            <span>{direitos()}</span>
            <span>{CREDITO}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
