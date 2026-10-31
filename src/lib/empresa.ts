// Identidade usada no sistema, nos relatórios e nas impressões.
// Logos em public/: logo.svg (completo), logo-branco.svg, marca.svg (só as árvores), logo.png (Excel).
export const EMPRESA = {
  nome: "Artepinus",
  razaoSocial: "Artepinus Indústria e Comércio de Madeiras LTDA",
  cnpj: "76.848.506/0001-17",
  fundacao: "19/08/1983",
  sistema: "Sistema de Produção",
  logo: "/logo.svg",
  logoBranco: "/logo-branco.svg",
  marca: "/marca.svg",
  /** PNG (transparente) para o Excel, que não aceita SVG. */
  logoPng: "/logo.png",
  desenvolvedor: "PR Tech Solutions",
  /**
   * Contato mostrado no site. Preencha com os dados reais: o site só mostra o que
   * estiver preenchido (nada de telefone ou endereço inventado).
   */
  contato: {
    telefone: "(49) 3563-0769",
    whatsapp: "", // só números com DDI e DDD, ex.: 5541999999999
    email: "",
    endereco: "Rodovia Daniel Lessing",
    cidade: "Caçador – SC · CEP 89503-575",
    mapa: "https://maps.app.goo.gl/Q7RT7KDz8AQyWkZMA", // link do Google Maps
    instagram: "artepinus_ind", // usuário, sem @
  },
};

/** Anos de história, contados da abertura da empresa. */
export function anosDeHistoria(hoje = new Date()) {
  const [d, m, a] = EMPRESA.fundacao.split("/").map(Number);
  const aniversario = hoje.getMonth() + 1 > m || (hoje.getMonth() + 1 === m && hoje.getDate() >= d);
  return hoje.getFullYear() - a - (aniversario ? 0 : 1);
}

/** "© 2026 Artepinus Indústria e Comércio de Madeiras LTDA. Todos os direitos reservados." */
export function direitos(ano = new Date().getFullYear()) {
  return `© ${ano} ${EMPRESA.razaoSocial}. Todos os direitos reservados.`;
}

export const CREDITO = `Desenvolvido por ${EMPRESA.desenvolvedor}`;
