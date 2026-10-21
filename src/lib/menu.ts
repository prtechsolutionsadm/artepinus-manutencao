import type { Perfil } from "@/generated/prisma/enums";

export type ItemNav = {
  href: string;
  label: string;
  icone: string;
  /** Aparece na barra inferior do celular. */
  mobile?: boolean;
  /** Só aparece na barra inferior (ex.: "Mais"). */
  soMobile?: boolean;
};

export function itensMenu(perfil: Perfil): ItemNav[] {
  const equipe = perfil === "ADMIN" || perfil === "MANUTENCAO";
  return [
    { href: "/", label: "Início", icone: "🏠", mobile: true },
    { href: "/requisicoes", label: "Requisições", icone: "📋", mobile: true },
    { href: "/requisicoes/nova", label: "Nova", icone: "➕", mobile: true },
    { href: "/agenda", label: "Agenda", icone: "📅", mobile: true },
    { href: "/relatorios", label: "Relatórios", icone: "📊" },
    ...(equipe ? [{ href: "/equipamentos", label: "Equipamentos", icone: "⚙️" }] : []),
    ...(perfil === "ADMIN"
      ? [
          { href: "/usuarios", label: "Usuários", icone: "👥" },
          { href: "/setores", label: "Setores", icone: "🏢" },
        ]
      : []),
    { href: "/perfil", label: "Perfil", icone: "👤" },
    { href: "/menu", label: "Mais", icone: "☰", soMobile: true },
  ];
}
