import type { Perfil } from "@/generated/prisma/enums";

export type IconeMenu =
  | "inicio"
  | "requisicoes"
  | "nova"
  | "agenda"
  | "relatorios"
  | "equipamentos"
  | "usuarios"
  | "setores"
  | "perfil"
  | "notificacoes";

export type ItemNav = { href: string; label: string; icone: IconeMenu };
export type GrupoNav = { titulo: string; itens: ItemNav[] };

export function gruposMenu(perfil: Perfil): GrupoNav[] {
  const equipe = perfil === "ADMIN" || perfil === "MANUTENCAO";
  const grupos: GrupoNav[] = [
    {
      titulo: "Manutenção",
      itens: [
        { href: "/", label: "Início", icone: "inicio" },
        { href: "/requisicoes", label: "Requisições", icone: "requisicoes" },
        { href: "/agenda", label: "Agenda", icone: "agenda" },
        { href: "/relatorios", label: "Relatórios", icone: "relatorios" },
      ],
    },
  ];
  const cadastros: ItemNav[] = [
    ...(equipe ? [{ href: "/equipamentos", label: "Equipamentos", icone: "equipamentos" as const }] : []),
    ...(perfil === "ADMIN"
      ? [
          { href: "/usuarios", label: "Usuários", icone: "usuarios" as const },
          { href: "/setores", label: "Setores", icone: "setores" as const },
        ]
      : []),
  ];
  if (cadastros.length) grupos.push({ titulo: "Cadastros", itens: cadastros });
  grupos.push({
    titulo: "Conta",
    itens: [
      { href: "/notificacoes", label: "Notificações", icone: "notificacoes" },
      { href: "/perfil", label: "Meu perfil", icone: "perfil" },
    ],
  });
  return grupos;
}

/** Item ativo: "/" só na raiz; os demais pelo prefixo, sem confundir /requisicoes com /requisicoes/nova. */
export function itemAtivo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/requisicoes" && path.startsWith("/requisicoes/nova")) return false;
  return path === href || path.startsWith(href + "/");
}

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
