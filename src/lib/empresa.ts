// Identidade usada no sistema, nos relatórios e nas impressões.
// Logos em public/: logo.svg (completo), logo-branco.svg, marca.svg (só as árvores), logo.png (Excel).
export const EMPRESA = {
  nome: "Artepinus",
  razaoSocial: "Artepinus Indústria e Comércio de Madeiras LTDA",
  cnpj: "76.848.506/0001-17",
  fundacao: "19/08/1983",
  sistema: "Sistema de Manutenção e Produção",
  logo: "/logo.svg",
  logoBranco: "/logo-branco.svg",
  marca: "/marca.svg",
  /** PNG (transparente) para o Excel, que não aceita SVG. */
  logoPng: "/logo.png",
  desenvolvedor: "PR Tech Solutions",
};

/** "© 2026 Artepinus Indústria e Comércio de Madeiras LTDA. Todos os direitos reservados." */
export function direitos(ano = new Date().getFullYear()) {
  return `© ${ano} ${EMPRESA.razaoSocial}. Todos os direitos reservados.`;
}

export const CREDITO = `Desenvolvido por ${EMPRESA.desenvolvedor}`;
