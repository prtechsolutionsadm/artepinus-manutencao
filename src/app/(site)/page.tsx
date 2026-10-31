import Link from "next/link";
import {
  ArrowRight,
  Factory,
  Flame,
  Leaf,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  QrCode,
  Ruler,
  Ship,
  TreePine,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { EMPRESA, anosDeHistoria } from "@/lib/empresa";

const ETAPAS: { Icone: LucideIcon; titulo: string; texto: string }[] = [
  { Icone: TreePine, titulo: "Floresta", texto: "Toras de pinus de florestas plantadas, com a origem de cada colheita registrada: fazenda, talhão e período de corte." },
  { Icone: Truck, titulo: "Colheita e transporte", texto: "Cada carga que chega ao pátio é conferida por diâmetro e ligada à colheita de onde saiu." },
  { Icone: Factory, titulo: "Serraria", texto: "Desdobro das toras nas bitolas do pedido, com controle diário de produção, rendimento e qualidade." },
  { Icone: Flame, titulo: "Secagem em estufa", texto: "Ciclos de secagem acompanhados por checklist, com umidade de entrada e saída registradas." },
  { Icone: Package, titulo: "Classificação e embalagem", texto: "A madeira é classificada e embalada em pacotes identificados por etiqueta com QR Code." },
  { Icone: Ship, titulo: "Expedição", texto: "Saída para o mercado interno e externo, com cliente, nota e destino de cada pacote." },
];

const PRODUTOS: { Icone: LucideIcon; titulo: string; texto: string }[] = [
  { Icone: Ruler, titulo: "Madeira serrada de pinus", texto: "Tábuas, pranchas e sarrafos em diversas espessuras, larguras e comprimentos, conforme a necessidade do cliente." },
  { Icone: Flame, titulo: "Madeira seca em estufa", texto: "Secagem controlada para mais estabilidade dimensional, menos empenamento e melhor acabamento." },
  { Icone: Warehouse, titulo: "Pacotes padronizados", texto: "Madeira classificada e embalada em pacotes, prontos para transporte e armazenagem." },
  { Icone: Leaf, titulo: "Aproveitamento integral", texto: "Os resíduos do processo são separados para aproveitamento, reduzindo desperdícios." },
];

export default function SitePage() {
  const anos = anosDeHistoria();
  const { contato } = EMPRESA;
  const contatos = [
    contato.telefone && { Icone: Phone, rotulo: "Telefone", valor: contato.telefone, href: `tel:${contato.telefone.replace(/\D/g, "")}` },
    contato.whatsapp && { Icone: MessageCircle, rotulo: "WhatsApp", valor: "Conversar pelo WhatsApp", href: `https://wa.me/${contato.whatsapp}` },
    contato.email && { Icone: Mail, rotulo: "E-mail", valor: contato.email, href: `mailto:${contato.email}` },
    (contato.endereco || contato.cidade) && {
      Icone: MapPin,
      rotulo: "Endereço",
      valor: [contato.endereco, contato.cidade].filter(Boolean).join(" · "),
      href: contato.mapa || undefined,
    },
  ].filter(Boolean) as { Icone: LucideIcon; rotulo: string; valor: string; href?: string }[];

  return (
    <>
      {/* Abertura */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-marca-700 via-marca-900 to-[#0a2a06] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca-branca.svg" alt="" aria-hidden className="pointer-events-none absolute -bottom-10 -right-24 -z-10 w-[680px] max-w-none opacity-[0.07] sm:w-[900px]" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-marca-100 ring-1 ring-inset ring-white/15">
            <TreePine className="h-4 w-4" /> Desde 1983 · {anos} anos de história
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">Madeira serrada de pinus, da floresta ao pacote.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-marca-100/90">
            A Artepinus industrializa madeira de pinus com secagem em estufa e controle de cada etapa — e cada pacote leva um QR Code com toda a sua história.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#contato" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-marca-900 transition hover:bg-marca-50">
              Fale com a gente <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#processo" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/10">
              Conheça o processo
            </a>
          </div>
        </div>
      </section>

      {/* Números */}
      <section aria-label="Em números" className="border-b border-stone-200 bg-[#f6f7f4]">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ["1983", "ano de fundação"],
            [`${anos} anos`, "industrializando madeira"],
            ["Estufas", "secagem controlada por ciclo"],
            ["Interno e externo", "mercados atendidos"],
          ].map(([v, r]) => (
            <div key={r} className="py-8 text-center">
              <dt className="text-2xl font-bold text-marca-700 sm:text-3xl">{v}</dt>
              <dd className="mt-1 text-sm text-stone-500">{r}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* A empresa */}
      <section id="empresa" className="scroll-mt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-marca-600">A empresa</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Tradição em madeira, com gestão de agora.</h2>
            <p className="mt-5 text-lg leading-relaxed text-stone-600">
              Fundada em 1983, a {EMPRESA.razaoSocial} transforma toras de pinus em madeira serrada e seca em estufa para clientes do mercado interno e externo.
            </p>
            <p className="mt-4 leading-relaxed text-stone-600">
              Hoje cada etapa da produção é registrada em sistema próprio: a colheita, o recebimento das toras, a produção diária da serraria, os ciclos das estufas e a
              formação dos pacotes. Isso dá previsibilidade ao cliente e transparência sobre a origem da madeira.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marca-50 to-[#e9efe4] p-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={EMPRESA.logo} alt="" aria-hidden className="mx-auto w-full max-w-sm" />
            <p className="mt-6 text-center text-sm text-stone-500">
              {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}
            </p>
          </div>
        </div>
      </section>

      {/* Processo */}
      <section id="processo" className="scroll-mt-24 bg-[#f6f7f4]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-marca-600">Processo</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Da floresta ao pacote, cada etapa registrada.</h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ETAPAS.map(({ Icone, titulo, texto }, i) => (
              <li key={titulo} className="relative rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-marca-600 text-white">
                    <Icone className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-stone-400">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
                <p className="mt-2 leading-relaxed text-stone-600">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Produtos */}
      <section id="produtos" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-marca-600">Produtos</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Madeira de pinus para a sua necessidade.</h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {PRODUTOS.map(({ Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4 rounded-2xl border border-stone-200 p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-700">
                  <Icone className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{titulo}</h3>
                  <p className="mt-1 leading-relaxed text-stone-600">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Rastreabilidade */}
      <section id="rastreabilidade" className="scroll-mt-24 bg-marca-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-marca-100/80">Rastreabilidade</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Cada pacote conta a sua história.</h2>
            <p className="mt-5 text-lg leading-relaxed text-marca-100/90">
              A etiqueta de cada pacote tem um QR Code. Ao ler, a equipe vê de qual floresta e colheita vieram as toras, em que dia foram serradas, em qual estufa a
              madeira secou e para quem o pacote foi expedido.
            </p>
            <ul className="mt-6 space-y-2 text-marca-100/90">
              {["Origem florestal e período de colheita", "Dia de produção na serraria", "Ciclo de estufa, umidade e checklist", "Classificação, volume e expedição"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-marca-100" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-sm rounded-3xl bg-white p-6 text-stone-900 shadow-2xl">
            <div className="flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={EMPRESA.logo} alt="" className="h-9 w-auto" />
              <QrCode className="h-14 w-14 text-stone-800" />
            </div>
            <div className="mt-4 font-mono text-xl font-bold">PCT-000000</div>
            <div className="text-sm text-stone-500">Exemplo de etiqueta de pacote</div>
            <ol className="mt-5 space-y-3 border-l-2 border-marca-100 pl-4 text-sm">
              {[
                [TreePine, "Floresta e colheita"],
                [Truck, "Carga de toras"],
                [Factory, "Serraria"],
                [Flame, "Estufa"],
                [Package, "Pacote formado"],
              ].map(([Icone, t]) => {
                const I = Icone as LucideIcon;
                return (
                  <li key={t as string} className="flex items-center gap-2">
                    <I className="h-4 w-4 text-marca-600" /> {t as string}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-marca-600">Contato</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Vamos conversar sobre o seu pedido.</h2>
              <p className="mt-4 text-lg leading-relaxed text-stone-600">Fale com a nossa equipe comercial sobre bitolas, volumes e prazos.</p>
            </div>
            <div className="rounded-3xl border border-stone-200 bg-[#f6f7f4] p-6 sm:p-8">
              {contatos.length > 0 && (
                <ul className="space-y-4">
                  {contatos.map(({ Icone, rotulo, valor, href }) => (
                    <li key={rotulo} className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-marca-700 ring-1 ring-stone-200">
                        <Icone className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{rotulo}</div>
                        {href ? (
                          <a href={href} className="font-semibold text-stone-900 hover:text-marca-700" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                            {valor}
                          </a>
                        ) : (
                          <div className="font-semibold">{valor}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className={contatos.length ? "mt-6 border-t border-stone-200 pt-6" : ""}>
                <div className="font-semibold">{EMPRESA.razaoSocial}</div>
                <div className="text-sm text-stone-500">CNPJ {EMPRESA.cnpj}</div>
              </div>
              <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                <div className="text-sm font-semibold">É colaborador da Artepinus?</div>
                <p className="mt-1 text-sm text-stone-500">Acesse o sistema de produção com o seu login.</p>
                <Link href="/sistema" className="btn-primario mt-3">
                  <LogIn className="h-4 w-4" /> Acessar sistema
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
