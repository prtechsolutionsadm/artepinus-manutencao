import { modulosDe, pode, podeProducao, type Modulo, type UsuarioComPerfis } from "@/lib/permissoes";

export type IconeMenu =
  | "inicio"
  | "requisicoes"
  | "nova"
  | "agenda"
  | "relatorios"
  | "indicadores"
  | "equipamentos"
  | "preventivas"
  | "checklists"
  | "usuarios"
  | "setores"
  | "auditoria"
  | "perfil"
  | "notificacoes"
  | "ajuda"
  | "painel"
  | "boletins"
  | "estufas"
  | "toras"
  | "estoque"
  | "cadastrosProducao"
  | "pacotes"
  | "escanear"
  | "florestas";

export type ItemNav = { href: string; label: string; icone: IconeMenu };
export type GrupoNav = { titulo: string; itens: ItemNav[] };

const CONTA: GrupoNav = {
  titulo: "Conta",
  itens: [
    { href: "/notificacoes", label: "Notificações", icone: "notificacoes" },
    { href: "/perfil", label: "Meu perfil", icone: "perfil" },
    { href: "/ajuda", label: "Manual do usuário", icone: "ajuda" },
  ],
};

function menuManutencao(u: UsuarioComPerfis): GrupoNav[] {
  const perfil = u.perfil;
  const se = (cond: boolean, item: ItemNav) => (cond ? [item] : []);
  return [
    {
      titulo: "Manutenção",
      itens: [
        { href: "/manutencao", label: "Início", icone: "inicio" },
        { href: "/requisicoes", label: "Requisições", icone: "requisicoes" },
        { href: "/agenda", label: "Agenda", icone: "agenda" },
      ],
    },
    {
      titulo: "Gestão",
      itens: [
        ...se(pode(perfil, "relatorios"), { href: "/indicadores", label: "Indicadores", icone: "indicadores" }),
        ...se(pode(perfil, "relatorios"), { href: "/relatorios", label: "Relatórios", icone: "relatorios" }),
        ...se(pode(perfil, "auditoria"), { href: "/auditoria", label: "Auditoria", icone: "auditoria" }),
      ],
    },
    {
      titulo: "Cadastros",
      itens: [
        ...se(pode(perfil, "equipamentos"), { href: "/equipamentos", label: "Equipamentos", icone: "equipamentos" }),
        ...se(pode(perfil, "preventivas"), { href: "/preventivas", label: "Preventivas", icone: "preventivas" }),
        ...se(pode(perfil, "preventivas"), { href: "/checklists", label: "Checklists", icone: "checklists" }),
        ...se(pode(perfil, "usuarios"), { href: "/usuarios", label: "Usuários", icone: "usuarios" }),
        ...se(pode(perfil, "setores"), { href: "/setores", label: "Setores", icone: "setores" }),
      ],
    },
    CONTA,
  ];
}

function menuProducao(u: UsuarioComPerfis): GrupoNav[] {
  const se = (cond: boolean, item: ItemNav) => (cond ? [item] : []);
  return [
    {
      titulo: "Produção",
      itens: [
        { href: "/producao", label: "Painel", icone: "painel" },
        { href: "/producao/boletins", label: "Boletins da serraria", icone: "boletins" },
        { href: "/producao/estufas", label: "Estufas", icone: "estufas" },
        { href: "/producao/estoque", label: "Estoque de madeira", icone: "estoque" },
      ],
    },
    {
      titulo: "Rastreabilidade",
      itens: [
        { href: "/producao/pacotes", label: "Pacotes", icone: "pacotes" },
        { href: "/producao/escanear", label: "Ler QR do pacote", icone: "escanear" },
        { href: "/producao/florestas", label: "Florestas e colheitas", icone: "florestas" },
        { href: "/producao/toras", label: "Recebimento de toras", icone: "toras" },
      ],
    },
    {
      titulo: "Cadastros",
      itens: [
        ...se(podeProducao(u, "gerir"), { href: "/producao/cadastros", label: "Motivos, estufas e metas", icone: "cadastrosProducao" }),
        ...se(pode(u.perfil, "usuarios"), { href: "/usuarios", label: "Usuários", icone: "usuarios" }),
        ...se(pode(u.perfil, "auditoria"), { href: "/auditoria", label: "Auditoria", icone: "auditoria" }),
      ],
    },
    CONTA,
  ];
}

/** Menus de cada módulo a que o usuário tem acesso. */
export function menusDoUsuario(u: UsuarioComPerfis): Partial<Record<Modulo, GrupoNav[]>> {
  const menus: Partial<Record<Modulo, GrupoNav[]>> = {};
  for (const m of modulosDe(u)) {
    menus[m] = (m === "manutencao" ? menuManutencao(u) : menuProducao(u)).filter((g) => g.itens.length > 0);
  }
  return menus;
}

export const COOKIE_MODULO = "modulo";

/** Lê o módulo salvo no cookie (último módulo visitado). */
export function moduloSalvo(valor: string | undefined): Modulo | null {
  return valor === "manutencao" || valor === "producao" ? valor : null;
}

/** Módulo da página atual; null nas páginas comuns (perfil, notificações, manual, usuários…). */
export function moduloDaRota(path: string): Modulo | null {
  if (path === "/producao" || path.startsWith("/producao/")) return "producao";
  const comuns = ["/notificacoes", "/perfil", "/ajuda", "/menu", "/usuarios", "/auditoria"];
  if (comuns.some((c) => path === c || path.startsWith(c + "/"))) return null;
  return "manutencao";
}

/** Item ativo: "/" só na raiz; os demais pelo prefixo, sem confundir /requisicoes com /requisicoes/nova. */
export function itemAtivo(path: string, href: string) {
  if (href === "/manutencao" || href === "/producao") return path === href;
  if (href === "/producao/boletins" && path.startsWith("/producao/boletins/novo")) return false;
  if (href === "/requisicoes" && path.startsWith("/requisicoes/nova")) return false;
  return path === href || path.startsWith(href + "/");
}

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
