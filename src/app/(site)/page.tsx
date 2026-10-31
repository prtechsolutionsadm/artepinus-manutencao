import Link from "next/link";
import { ArrowRight, Check, Factory, Flame, Mail, MapPin, MessageCircle, Package, Phone, QrCode, Ship, TreePine, Truck } from "lucide-react";
import { IconeInstagram } from "@/components/site/IconeInstagram";
import { EMPRESA, anosDeHistoria } from "@/lib/empresa";

type Icone = React.ComponentType<{ className?: string }>;

const PRODUTOS = [
  { titulo: "Madeira serrada de pinus", texto: "Tábuas, pranchas e sarrafos em diversas espessuras, larguras e comprimentos, conforme o pedido." },
  { titulo: "Madeira seca em estufa", texto: "Secagem controlada por ciclo, para estabilidade dimensional e melhor acabamento." },
  { titulo: "Pacotes padronizados", texto: "Madeira classificada e embalada, pronta para transporte, armazenagem e exportação." },
  { titulo: "Aproveitamento", texto: "Os resíduos do processo são separados para aproveitamento, reduzindo desperdícios." },
];

const ETAPAS: { Icone: Icone; titulo: string; texto: string }[] = [
  { Icone: TreePine, titulo: "Floresta", texto: "Origem de cada colheita registrada: fazenda, talhão e período." },
  { Icone: Truck, titulo: "Toras", texto: "Cargas conferidas por diâmetro e ligadas à colheita." },
  { Icone: Factory, titulo: "Serraria", texto: "Desdobro nas bitolas do pedido, com controle diário." },
  { Icone: Flame, titulo: "Estufa", texto: "Ciclos com checklist e umidade de entrada e saída." },
  { Icone: Package, titulo: "Embalagem", texto: "Pacotes classificados e identificados com QR Code." },
  { Icone: Ship, titulo: "Expedição", texto: "Mercado interno e externo, com nota e destino." },
];

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.16em] text-marca-700">{children}</p>;
}

export default function SitePage() {
  const anos = anosDeHistoria();
  const { contato } = EMPRESA;
  const contatos = [
    contato.telefone && { Icone: Phone, rotulo: "Telefone", valor: contato.telefone, href: `tel:${contato.telefone.replace(/\D/g, "")}` },
    contato.whatsapp && { Icone: MessageCircle, rotulo: "WhatsApp", valor: "Conversar pelo WhatsApp", href: `https://wa.me/${contato.whatsapp}` },
    contato.email && { Icone: Mail, rotulo: "E-mail", valor: contato.email, href: `mailto:${contato.email}` },
    contato.instagram && { Icone: IconeInstagram, rotulo: "Instagram", valor: `@${contato.instagram}`, href: `https://www.instagram.com/${contato.instagram}/` },
    (contato.endereco || contato.cidade) && {
      Icone: MapPin,
      rotulo: "Endereço",
      valor: [contato.endereco, contato.cidade].filter(Boolean).join(" · "),
      href: contato.mapa || undefined,
    },
  ].filter(Boolean) as { Icone: Icone; rotulo: string; valor: string; href?: string }[];

  return (
    <>
      {/* Abertura: texto à esquerda, bloco verde com números à direita */}
      <section className="border-b border-stone-200 lg:bg-[linear-gradient(to_right,#fff_50%,var(--color-marca-700)_50%)]">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-12">
          <div className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:col-span-7 lg:py-28 lg:pl-8 lg:pr-12">
            <Rotulo>Indústria de madeiras · desde 1983</Rotulo>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Madeira serrada de pinus para o mercado interno e externo.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
              Serraria, secagem em estufa e embalagem com controle de cada etapa — e rastreabilidade de cada pacote, da floresta à expedição.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#contato" className="inline-flex items-center gap-2 rounded-md bg-marca-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-marca-900">
                Solicitar contato <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#processo" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-marca-700">
                Conheça o processo <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="bg-marca-700 text-white lg:col-span-5">
            <dl className="grid h-full grid-cols-2">
              {[
                ["1983", "Ano de fundação"],
                [`${anos}`, "Anos de história"],
                ["Estufas", "Secagem controlada por ciclo"],
                ["QR Code", "Rastreio de cada pacote"],
              ].map(([v, r], i) => (
                <div key={r} className={`flex flex-col justify-end px-6 py-10 sm:px-8 lg:py-14 ${i % 2 === 0 ? "border-r border-white/15" : ""} ${i < 2 ? "border-b border-white/15" : ""}`}>
                  <dt className="order-2 mt-2 text-sm text-marca-100/80">{r}</dt>
                  <dd className="order-1 text-3xl font-semibold tracking-tight sm:text-4xl">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Atalhos em colunas */}
      <section aria-label="Destaques" className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto grid max-w-6xl divide-y divide-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            { href: "#produtos", titulo: "Produtos", texto: "Madeira serrada e seca em estufa, em bitolas sob medida." },
            { href: "#processo", titulo: "Processo", texto: "Da floresta à expedição, cada etapa registrada em sistema." },
            { href: "#qualidade", titulo: "Qualidade", texto: "Checklist das estufas, classificação e rastreio por pacote." },
          ].map((c) => (
            <a key={c.href} href={c.href} className="group block px-4 py-8 transition hover:bg-white sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{c.titulo}</h2>
                <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-marca-700" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{c.texto}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Empresa */}
      <section id="empresa" className="scroll-mt-20 border-b border-stone-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-4">
            <Rotulo>A empresa</Rotulo>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Tradição em madeira, com gestão moderna.</h2>
          </div>
          <div className="lg:col-span-8">
            <div className="space-y-4 text-lg leading-relaxed text-stone-600">
              <p>
                Fundada em 1983, a {EMPRESA.razaoSocial} transforma toras de pinus em madeira serrada e seca em estufa para clientes do mercado interno e externo.
              </p>
              <p>
                Cada etapa da produção é registrada em sistema próprio — a colheita, o recebimento das toras, a produção diária da serraria, os ciclos das estufas e a
                formação dos pacotes —, o que dá previsibilidade ao cliente e transparência sobre a origem da madeira.
              </p>
            </div>
            <dl className="mt-10 border-t border-stone-200 text-sm">
              {[
                ["Razão social", EMPRESA.razaoSocial],
                ["CNPJ", EMPRESA.cnpj],
                ["Fundação", EMPRESA.fundacao],
                ["Atuação", "Madeira serrada de pinus · mercado interno e externo"],
              ].map(([r, v]) => (
                <div key={r} className="grid grid-cols-3 gap-4 border-b border-stone-200 py-3">
                  <dt className="text-stone-500">{r}</dt>
                  <dd className="col-span-2 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section id="produtos" className="scroll-mt-20 border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Rotulo>Produtos</Rotulo>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight">Madeira de pinus para a sua necessidade.</h2>
            </div>
            <a href="#contato" className="inline-flex items-center gap-2 text-sm font-semibold text-marca-700 hover:text-marca-900">
              Consultar bitolas e prazos <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-12 grid gap-px overflow-hidden border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUTOS.map((p, i) => (
              <li key={p.titulo} className="bg-white p-6">
                <div className="text-sm font-semibold tabular-nums text-marca-700">0{i + 1}</div>
                <h3 className="mt-6 text-lg font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Processo */}
      <section id="processo" className="scroll-mt-20 border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <Rotulo>Processo</Rotulo>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight">Da floresta ao pacote, cada etapa registrada.</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-0">
            {ETAPAS.map(({ Icone, titulo, texto }, i) => (
              <li key={titulo} className="relative lg:pr-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-stone-300 bg-white text-marca-700">
                    <Icone className="h-5 w-5" />
                  </span>
                  {i < ETAPAS.length - 1 && <span className="hidden h-px flex-1 bg-stone-300 lg:block" aria-hidden />}
                </div>
                <div className="mt-4 text-xs font-semibold tabular-nums text-stone-400">ETAPA 0{i + 1}</div>
                <h3 className="mt-1 font-semibold">{titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Qualidade e rastreabilidade */}
      <section id="qualidade" className="scroll-mt-20 border-b border-stone-200">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Rotulo>Qualidade e rastreabilidade</Rotulo>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Cada pacote com a sua história.</h2>
            <p className="mt-5 text-lg leading-relaxed text-stone-600">
              A etiqueta de cada pacote tem um QR Code. Ao ler, a equipe vê de onde vieram as toras, quando foram serradas, em qual estufa a madeira secou e para onde o
              pacote foi expedido.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Origem florestal e colheita", "Dia de produção na serraria", "Ciclo de estufa e umidade", "Checklist das estufas", "Classificação e volume", "Expedição e nota fiscal"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-marca-700" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-md border border-stone-300 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={EMPRESA.logo} alt="" className="h-8 w-auto" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">Etiqueta de pacote</span>
            </div>
            <div className="flex gap-5 px-5 py-5">
              <QrCode className="h-24 w-24 shrink-0 text-stone-800" strokeWidth={1.25} />
              <div className="min-w-0">
                <div className="font-mono text-lg font-semibold">PCT-000000</div>
                <div className="mt-1 text-sm text-stone-600">25 × 100 × 3000 mm</div>
                <div className="text-sm text-stone-600">Seco em estufa · 1ª</div>
              </div>
            </div>
            <ol className="grid grid-cols-5 border-t border-stone-200 text-center text-[11px] text-stone-500">
              {["Floresta", "Toras", "Serraria", "Estufa", "Pacote"].map((t, i) => (
                <li key={t} className={`px-1 py-3 ${i > 0 ? "border-l border-stone-200" : ""}`}>
                  <span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-marca-600" />
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="scroll-mt-20 bg-stone-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-5">
            <Rotulo>Contato</Rotulo>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Vamos conversar sobre o seu pedido.</h2>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">Fale com a nossa equipe comercial sobre bitolas, volumes e prazos.</p>
          </div>
          <div className="lg:col-span-7">
            <dl className="border-t border-stone-300">
              {contatos.map(({ Icone, rotulo, valor, href }) => (
                <div key={rotulo} className="flex items-center gap-4 border-b border-stone-200 py-4">
                  <Icone className="h-5 w-5 shrink-0 text-marca-700" />
                  <dt className="w-24 shrink-0 text-sm text-stone-500">{rotulo}</dt>
                  <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">
                    {href ? (
                      <a href={href} className="hover:text-marca-700" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                        {valor}
                      </a>
                    ) : (
                      valor
                    )}
                  </dd>
                </div>
              ))}
              <div className="flex items-center gap-4 border-b border-stone-200 py-4">
                <Factory className="h-5 w-5 shrink-0 text-marca-700" />
                <dt className="w-24 shrink-0 text-sm text-stone-500">Empresa</dt>
                <dd className="min-w-0 font-medium">
                  {EMPRESA.razaoSocial} <span className="block text-sm font-normal text-stone-500">CNPJ {EMPRESA.cnpj}</span>
                </dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-stone-200 bg-white px-5 py-4">
              <div>
                <div className="text-sm font-semibold">Área do colaborador</div>
                <p className="text-sm text-stone-500">Acesse o sistema de produção com o seu login.</p>
              </div>
              <Link href="/sistema" className="inline-flex items-center gap-2 rounded-md bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-900">
                Acessar sistema <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
