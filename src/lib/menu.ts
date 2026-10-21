import type { Perfil } from "@/generated/prisma/enums";
import { pode } from "@/lib/permissoes";

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
  | "notificacoes";

export type ItemNav = { href: string; label: string; icone: IconeMenu };
export type GrupoNav = { titulo: string; itens: ItemNav[] };

export function gruposMenu(perfil: Perfil): GrupoNav[] {
  const se = (cond: boolean, item: ItemNav) => (cond ? [item] : []);
  const grupos: GrupoNav[] = [
    {
      titulo: "Manutenção",
      itens: [
        { href: "/", label: "Início", icone: "inicio" },
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
    {
      titulo: "Conta",
      itens: [
        { href: "/notificacoes", label: "Notificações", icone: "notificacoes" },
        { href: "/perfil", label: "Meu perfil", icone: "perfil" },
      ],
    },
  ];
  return grupos.filter((g) => g.itens.length > 0);
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
