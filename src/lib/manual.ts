// Conteúdo do manual do usuário (página /ajuda). Texto simples, organizado por tema.
// `modulo` mostra a seção só para quem usa o módulo; `para` / `paraProducao` limitam
// a quem tem a permissão. Sem esses campos, a seção vale para todos.
import type { Acao, AcaoProducao, Modulo } from "@/lib/permissoes";

export type Bloco =
  | { tipo: "texto"; texto: string }
  | { tipo: "passos"; itens: string[] }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "dica"; texto: string }
  | { tipo: "atencao"; texto: string }
  | { tipo: "termos"; itens: [string, string][] };

export type Topico = { titulo: string; blocos: Bloco[] };
export type Secao = {
  id: string;
  titulo: string;
  resumo: string;
  modulo?: Modulo;
  para?: Acao;
  paraProducao?: AcaoProducao;
  topicos: Topico[];
};

export const MANUAL: Secao[] = [
  {
    id: "primeiros-passos",
    titulo: "Primeiros passos",
    resumo: "Entrar no sistema, trocar a senha e instalar no celular",
    topicos: [
      {
        titulo: "Como entrar",
        blocos: [
          { tipo: "passos", itens: ["Abra o endereço do sistema no navegador do celular ou do computador.", "Digite seu login no formato nome.sobrenome (ex.: joao.silva).", "Digite a senha e toque em Entrar."] },
          { tipo: "texto", texto: "No primeiro acesso, ou quando o administrador redefinir sua senha, o sistema pede para você criar uma senha nova antes de continuar." },
          { tipo: "dica", texto: "Esqueceu a senha? Fale com o gerente ou o administrador: ele define uma senha provisória e você troca ao entrar." },
        ],
      },
      {
        titulo: "Trocar a senha",
        blocos: [{ tipo: "passos", itens: ["Toque nas suas iniciais (canto superior direito) ou vá em Meu perfil.", "Em Trocar senha, informe a senha atual e a nova duas vezes.", "Toque em Salvar nova senha."] }],
      },
      {
        titulo: "Instalar como aplicativo no celular",
        blocos: [
          { tipo: "texto", texto: "O sistema funciona como um aplicativo: fica com ícone na tela inicial, abre em tela cheia e recebe notificações." },
          { tipo: "termos", itens: [
            ["Android (Chrome)", "Abra o sistema, toque no menu ⋮ e escolha Instalar app (ou Adicionar à tela inicial)."],
            ["iPhone (Safari)", "Abra o sistema no Safari, toque em Compartilhar (quadrado com seta) e depois em Adicionar à Tela de Início."],
          ] },
          { tipo: "atencao", texto: "No iPhone as notificações só funcionam com o app instalado e aberto pelo ícone da tela de início." },
        ],
      },
      {
        titulo: "Navegando pelo sistema",
        blocos: [
          { tipo: "lista", itens: [
            "O sistema tem dois módulos: Manutenção (requisições) e Produção (boletins da serraria, estufas, toras e estoque). Cada pessoa vê os módulos liberados para ela.",
            "Quem usa os dois troca de módulo pelos botões Manutenção / Produção no alto do menu (no celular, em Mais).",
            "No computador: o menu fica na lateral esquerda; a busca e o sininho de notificações ficam no topo.",
            "No celular: use a barra de baixo. Na Manutenção: Início, Requisições, + Nova, Agenda e Mais. Na Produção: Painel, Boletins, + Novo boletim, Estufas e Mais. Em Mais estão as demais telas e o botão Sair.",
            "A busca do topo encontra requisições pelo número (ex.: 25 ou #00025), título ou código do equipamento.",
          ] },
        ],
      },
    ],
  },
  {
    id: "abrir-requisicao",
    modulo: "manutencao",
    titulo: "Abrir uma requisição",
    resumo: "Pedir manutenção com fotos, pelo QR Code ou até sem internet",
    topicos: [
      {
        titulo: "Passo a passo",
        blocos: [
          { tipo: "passos", itens: [
            "Toque em + Nova (no celular) ou Nova requisição (no computador).",
            "Escreva o que precisa ser feito e descreva o problema: quando começou, barulhos, se piorou…",
            "Se a máquina parou de funcionar, marque A máquina está parada.",
            "Escolha o equipamento, o tipo e a prioridade. O setor é preenchido automaticamente pelo equipamento.",
            "Adicione fotos do problema (Tirar foto ou Adicionar fotos, até 6).",
            "Toque em Abrir requisição. Seu nome e a data são registrados automaticamente.",
          ] },
          { tipo: "dica", texto: "Fotos ajudam muito a manutenção a entender o problema e a levar a peça certa. Fotografe de perto e de longe." },
        ],
      },
      {
        titulo: "Pelo QR Code da máquina",
        blocos: [
          { tipo: "passos", itens: [
            "Aponte a câmera do celular para a etiqueta QR colada na máquina e toque no link que aparecer.",
            "Se pedir, faça login: você volta direto para a página da máquina.",
            "Veja se já existe uma requisição em aberto para o mesmo problema. Se existir, comente nela em vez de abrir outra.",
            "Toque em Abrir requisição para esta máquina: o equipamento já vem escolhido.",
          ] },
        ],
      },
      {
        titulo: "Máquina parada",
        blocos: [
          { tipo: "texto", texto: "Marcar a máquina como parada avisa a manutenção com prioridade e começa a contar o tempo de máquina parada, usado nos indicadores. A contagem termina quando a manutenção informa que a máquina voltou a operar, ou quando a requisição é concluída." },
        ],
      },
      {
        titulo: "Sem internet",
        blocos: [
          { tipo: "texto", texto: "Em locais sem sinal você ainda consegue abrir requisições (inclusive com fotos)." },
          { tipo: "passos", itens: [
            "Abra o app e toque em + Nova normalmente.",
            "Preencha e toque em Abrir requisição. Aparece o aviso: requisição guardada no aparelho.",
            "Quando a internet voltar, ela é enviada sozinha. Uma faixa amarela no topo mostra quantas estão aguardando; ao enviar, aparece uma mensagem verde.",
          ] },
          { tipo: "atencao", texto: "Para funcionar sem internet, o app precisa ter sido aberto pelo menos uma vez com internet neste aparelho. Não saia do sistema (Sair) enquanto houver requisições aguardando envio: elas seriam perdidas — o sistema avisa antes." },
        ],
      },
    ],
  },
  {
    id: "acompanhar",
    modulo: "manutencao",
    titulo: "Acompanhar requisições",
    resumo: "Status, histórico, comentários e cancelamento",
    topicos: [
      {
        titulo: "O que significa cada status",
        blocos: [
          { tipo: "termos", itens: [
            ["Aberta", "Acabou de ser registrada e aguarda a análise da manutenção."],
            ["Em análise", "A manutenção está avaliando o problema."],
            ["Planejada", "Aprovada, aguardando definir data."],
            ["Agendada", "Já tem data e hora marcadas para o serviço."],
            ["Em andamento", "O serviço está sendo executado."],
            ["Aguardando peças", "Parada esperando material ou peça."],
            ["Adiada", "Foi postergada (o motivo fica registrado)."],
            ["Concluída", "Serviço finalizado; o que foi feito fica registrado."],
            ["Cancelada", "Não será executada (o motivo fica registrado)."],
          ] },
        ],
      },
      {
        titulo: "Ver e encontrar requisições",
        blocos: [
          { tipo: "lista", itens: [
            "Requisições: lista completa com filtros por status, prioridade, tipo e setor, e as opções Abertas por mim e Atribuídas a mim.",
            "Início: resumo com pendentes, urgentes, agendadas dos próximos dias e as suas requisições.",
            "Agenda: tudo que está agendado, separado por dia, com alerta das que passaram da data.",
          ] },
          { tipo: "texto", texto: "Na página da requisição você vê todos os dados, as fotos, o checklist, as horas trabalhadas e o histórico completo de quem fez o quê." },
        ],
      },
      {
        titulo: "Comentar e enviar mais fotos",
        blocos: [
          { tipo: "texto", texto: "No fim da página da requisição use Adicionar comentário para passar informações ou tirar dúvidas. O solicitante e o responsável são avisados. Em Fotos você pode anexar novas imagens a qualquer momento." },
        ],
      },
      {
        titulo: "Cancelar a própria requisição",
        blocos: [
          { tipo: "texto", texto: "Enquanto a requisição ainda estiver Aberta, quem abriu pode cancelá-la em Cancelar requisição, informando o motivo. Depois que a manutenção começa a tratar, peça o cancelamento ao supervisor." },
        ],
      },
      {
        titulo: "Imprimir",
        blocos: [{ tipo: "texto", texto: "Na página da requisição toque em Imprimir: sai uma folha com o logo e os dados da empresa, pronta para arquivo em papel ou PDF." }],
      },
    ],
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    resumo: "Sininho, avisos no celular e lembretes",
    topicos: [
      {
        titulo: "Ativar no celular ou computador",
        blocos: [
          { tipo: "passos", itens: ["Vá em Meu perfil.", "Em Notificações neste aparelho, toque em Ativar notificações e permita quando o navegador perguntar.", "Toque em Enviar notificação de teste para conferir."] },
          { tipo: "texto", texto: "A ativação é por aparelho: faça em cada celular ou computador que você usa." },
          { tipo: "dica", texto: "Bloqueou sem querer? Libere nas configurações do site (ícone de cadeado ao lado do endereço) e recarregue a página." },
        ],
      },
      {
        titulo: "Quem recebe o quê",
        blocos: [
          { tipo: "lista", itens: [
            "Quem abriu: cada mudança de status e os comentários na sua requisição.",
            "Responsável: quando uma requisição é atribuída a você e os comentários nela.",
            "Supervisores e manutentores: requisição nova (com destaque para urgente, prioridade alta e máquina parada).",
            "Gerente: requisições novas de prioridade alta, urgentes ou com máquina parada.",
            "Todos os dias às 7h: lembrete das manutenções agendadas para o dia.",
          ] },
          { tipo: "texto", texto: "Tudo também aparece no sininho do topo, com o número de avisos não lidos. Toque em um aviso para abrir a requisição." },
        ],
      },
    ],
  },
  {
    id: "atender",
    modulo: "manutencao",
    titulo: "Atender requisições",
    resumo: "Para a equipe de manutenção: status, agenda, horas, checklist e conclusão",
    para: "atenderRequisicoes",
    topicos: [
      {
        titulo: "Atualizar a requisição",
        blocos: [
          { tipo: "texto", texto: "Na página da requisição, use o quadro Atualizar requisição (à direita no computador, mais abaixo no celular)." },
          { tipo: "lista", itens: [
            "Status: escolha o novo status e toque em Salvar. Quem abriu é avisado.",
            "Responsável: supervisores e gerentes escolhem qualquer manutentor; o manutentor pode assumir a requisição para si.",
            "Data agendada: obrigatória para o status Agendada.",
            "Observação / motivo: fica no histórico; obrigatória para Adiada e Cancelada.",
          ] },
        ],
      },
      {
        titulo: "Máquina parada",
        blocos: [{ tipo: "texto", texto: "No mesmo quadro você marca ou desmarca Máquina parada e ajusta Parada desde e Voltou a operar em. Se ficar vazio, ao concluir o sistema considera que a máquina voltou a operar na hora da conclusão." }],
      },
      {
        titulo: "Lançar horas trabalhadas",
        blocos: [
          { tipo: "passos", itens: ["Na seção Horas trabalhadas, informe quando começou e quanto tempo trabalhou (horas e minutos).", "Opcional: descreva o que foi feito.", "Toque em Registrar horas."] },
          { tipo: "texto", texto: "Pode lançar várias vezes (um lançamento por período trabalhado). Supervisores e gerentes podem lançar em nome de outro manutentor. Para corrigir, apague o lançamento na lixeira e lance de novo." },
        ],
      },
      {
        titulo: "Checklist",
        blocos: [
          { tipo: "texto", texto: "Se a requisição tiver checklist, toque em cada item conforme for realizando. Para incluir um, escolha em Aplicar checklist." },
          { tipo: "atencao", texto: "A requisição só pode ser concluída com todos os itens do checklist marcados." },
        ],
      },
      {
        titulo: "Concluir",
        blocos: [
          { tipo: "passos", itens: [
            "Tire fotos do serviço pronto: em Fotos escolha Do serviço realizado e envie.",
            "No quadro Atualizar requisição, mude o status para Concluída.",
            "Descreva em Serviço realizado o que foi feito (obrigatório) e toque em Salvar.",
          ] },
        ],
      },
    ],
  },
  {
    id: "equipamentos",
    modulo: "manutencao",
    titulo: "Equipamentos e etiquetas QR",
    resumo: "Cadastro, ficha da máquina e impressão das etiquetas",
    para: "equipamentos",
    topicos: [
      {
        titulo: "Cadastrar um equipamento",
        blocos: [
          { tipo: "passos", itens: ["Vá em Equipamentos e toque em Cadastrar equipamento.", "Preencha o código/TAG (ex.: SER-01), o nome e o setor. Fabricante, modelo e nº de série são opcionais, mas ajudam.", "Toque em Cadastrar."] },
          { tipo: "dica", texto: "Use códigos curtos e únicos, como os do patrimônio. O código aparece na etiqueta e serve para buscar a máquina." },
        ],
      },
      {
        titulo: "Ficha do equipamento",
        blocos: [{ tipo: "texto", texto: "Toque em um equipamento para ver a ficha: dados, quantas falhas teve, tempo parado, horas de manutenção, planos de preventiva, QR Code e o histórico completo de requisições. Para alterar os dados use Editar dados do equipamento." }],
      },
      {
        titulo: "Imprimir as etiquetas QR",
        blocos: [
          { tipo: "passos", itens: [
            "Em Equipamentos toque em Etiquetas QR (todas as máquinas, ou filtre por setor). Para uma só, use Imprimir etiqueta na ficha.",
            "Toque em Imprimir etiquetas. Sai em folha A4, 3 por linha.",
            "Recorte e cole cada etiqueta em local visível da máquina.",
          ] },
          { tipo: "dica", texto: "Papel adesivo ou etiqueta plastificada dura mais no chão de fábrica." },
        ],
      },
    ],
  },
  {
    id: "preventivas",
    modulo: "manutencao",
    titulo: "Preventivas e checklists",
    resumo: "Programar manutenções que se repetem e listas de verificação",
    para: "preventivas",
    topicos: [
      {
        titulo: "Criar um checklist",
        blocos: [
          { tipo: "passos", itens: ["Vá em Checklists e toque em Novo checklist.", "Dê um nome (ex.: Preventiva mensal – compressor).", "Escreva os itens, um por linha.", "Toque em Criar checklist."] },
          { tipo: "texto", texto: "Alterar um checklist não muda as requisições já criadas: cada requisição guarda a cópia que recebeu." },
        ],
      },
      {
        titulo: "Criar um plano de preventiva",
        blocos: [
          { tipo: "passos", itens: [
            "Vá em Preventivas e abra Novo plano de preventiva (ou, na ficha do equipamento, Novo plano).",
            "Escolha o equipamento e escreva o que será feito.",
            "Defina a frequência (ex.: a cada 1 mês) e a data e hora da próxima execução.",
            "Escolha com quantos dias de antecedência a requisição deve ser criada, a prioridade, o responsável e o checklist.",
            "Toque em Criar plano.",
          ] },
          { tipo: "texto", texto: "Todo dia às 7h o sistema cria automaticamente as requisições dos planos que estão dentro da antecedência, já agendadas, com responsável e checklist, e avisa o responsável. A próxima data avança sozinha." },
          { tipo: "dica", texto: "Precisa gerar antes? Abra o plano e toque em Gerar agora. Para suspender um plano sem apagá-lo, desmarque Ativo." },
        ],
      },
    ],
  },
  {
    id: "indicadores",
    modulo: "manutencao",
    titulo: "Indicadores e relatórios",
    resumo: "Acompanhar resultados e exportar PDF e Excel",
    para: "relatorios",
    topicos: [
      {
        titulo: "Painel de indicadores",
        blocos: [
          { tipo: "texto", texto: "Em Indicadores escolha o período (30 dias a 12 meses) e, se quiser, um setor. Passe o mouse ou toque nas colunas do gráfico para ver os números; use Ver tabela para os valores exatos." },
          { tipo: "termos", itens: [
            ["Disponibilidade", "Percentual do tempo em que as máquinas ativas não estavam paradas."],
            ["Tempo parado", "Soma de todas as paradas de máquina no período."],
            ["MTTR (tempo médio de reparo)", "Quanto dura, em média, uma parada de máquina. Quanto menor, melhor."],
            ["MTBF (tempo médio entre falhas)", "Tempo médio de funcionamento entre uma falha (corretiva) e outra. Quanto maior, melhor."],
            ["Tempo médio de atendimento", "Da abertura até a conclusão da requisição."],
            ["Preventivas no prazo", "Preventivas concluídas até o dia agendado, entre as previstas no período."],
            ["Pendentes agora", "Requisições ainda não concluídas nem canceladas."],
          ] },
          { tipo: "atencao", texto: "Os indicadores de parada dependem de marcar Máquina parada nas requisições. Sem essa marcação, a disponibilidade aparece maior do que a real." },
        ],
      },
      {
        titulo: "Relatórios em PDF e Excel",
        blocos: [
          { tipo: "passos", itens: [
            "Vá em Relatórios e escolha o período e os filtros (status, tipo, prioridade, setor).",
            "Toque em Gerar relatório para ver o resumo na tela.",
            "Exportar PDF abre a impressão: escolha Salvar como PDF. Exportar Excel baixa a planilha formatada, com uma aba de resumo.",
          ] },
        ],
      },
    ],
  },
  {
    id: "administracao",
    titulo: "Usuários, setores e auditoria",
    resumo: "Cadastros de acesso e histórico de alterações",
    para: "usuarios",
    topicos: [
      {
        titulo: "Cadastrar um usuário",
        blocos: [
          { tipo: "passos", itens: [
            "Vá em Usuários e abra Novo usuário.",
            "Informe nome, login (nome.sobrenome, sem acentos), o perfil na Manutenção e o perfil na Produção.",
            "Defina uma senha inicial (mín. 6 caracteres) e deixe marcado Exigir troca da senha no primeiro acesso.",
            "Toque em Criar usuário e passe o login e a senha para a pessoa.",
          ] },
          { tipo: "texto", texto: "Para redefinir a senha de alguém, abra o usuário, digite uma nova senha e salve. Para bloquear o acesso de quem saiu da empresa, desmarque Ativo (o histórico é mantido)." },
        ],
      },
      {
        titulo: "Perfis de acesso",
        blocos: [
          { tipo: "texto", texto: "Cada usuário tem um perfil por módulo. Quem só trabalha na produção fica com Sem acesso na Manutenção; quem não usa a produção fica com Sem acesso na Produção. Todo usuário precisa de pelo menos um módulo. O Gerente tem acesso total aos dois." },
          { tipo: "termos", itens: [
            ["Gerente", "Acesso a tudo: requisições, cadastros, preventivas, indicadores, relatórios, usuários, setores e auditoria."],
            ["Supervisor", "Coordena a manutenção: atribui, agenda, cancela, cadastra equipamentos, preventivas e checklists, vê indicadores e relatórios."],
            ["Manutentor", "Executa: atualiza status, assume requisições, lança horas, marca checklist, anexa fotos do serviço e cadastra equipamentos."],
            ["Operador", "Abre requisições, comenta, envia fotos e acompanha."],
          ] },
          { tipo: "texto", texto: "Na Produção:" },
          { tipo: "termos", itens: [
            ["Supervisor", "Lança e corrige qualquer boletim, ciclo, carga ou levantamento, exclui lançamentos e cuida dos cadastros (metas, estufas e motivos de parada)."],
            ["Apontador", "O encarregado: lança o boletim do turno, ciclos de estufa, cargas de toras e levantamentos de estoque, e corrige o que ele mesmo lançou."],
            ["Consulta", "Vê painéis, boletins e relatórios, sem lançar nada."],
          ] },
        ],
      },
      {
        titulo: "Setores",
        blocos: [{ tipo: "texto", texto: "Em Setores você cria e renomeia os setores da empresa. Os equipamentos pertencem a um setor, e as requisições herdam o setor do equipamento." }],
      },
      {
        titulo: "Auditoria",
        blocos: [{ tipo: "texto", texto: "Em Auditoria fica registrado quem fez o quê e quando: entradas no sistema (inclusive tentativas com senha errada), cadastros, mudanças de status, fotos, horas, checklists e planos. Nas alterações aparece o valor anterior e o novo. Filtre por usuário, área, período ou texto." }],
      },
    ],
  },
  {
    id: "producao-boletim",
    titulo: "Boletim da serraria",
    resumo: "Lançar a produção e as paradas no fim do turno",
    modulo: "producao",
    paraProducao: "lancar",
    topicos: [
      {
        titulo: "Lançar o boletim do dia",
        blocos: [
          { tipo: "texto", texto: "O encarregado preenche um boletim por dia, no fim do turno. Ele substitui a planilha de controle de produção da serraria." },
          { tipo: "passos", itens: [
            "Na Produção, toque em + Novo boletim.",
            "Confira a data, a meta (m³) e as horas programadas — vêm preenchidas com a meta do mês.",
            "Em Produção por bitola, toque em Adicionar bitola e informe tipo (Bom, Aproveitamento ou Refugo), mercado, espessura, largura e comprimento em milímetros e o número de peças. O m³ é calculado sozinho.",
            "Use Repetir para lançar outra quantidade da mesma bitola sem digitar as medidas de novo.",
            "Em Paradas da linha, toque em Adicionar parada, escolha o motivo (pelo código da planilha), confira o centro e o equipamento e informe quantas vezes parou e os minutos.",
            "Se as toras consumidas forem conhecidas, abra Toras consumidas no dia e informe a quantidade e o volume — isso calcula o rendimento.",
            "Confira o Resumo no fim da tela e toque em Lançar boletim.",
          ] },
          { tipo: "dica", texto: "Motivo que não está na lista? Deixe — Outro (descrever) — e explique na observação. Peça ao supervisor para cadastrar o motivo se ele se repetir." },
          { tipo: "atencao", texto: "Existe um boletim por data. Se o dia já foi lançado, abra-o em Boletins e toque em Editar." },
        ],
      },
      {
        titulo: "Parada mecânica ou elétrica: abrir requisição",
        blocos: [
          { tipo: "texto", texto: "No boletim salvo, as paradas mecânicas e elétricas têm o botão Abrir requisição. Ele cria uma requisição corretiva de prioridade alta na Manutenção, já com o equipamento, a data e o tempo parado, e liga a requisição ao boletim." },
          { tipo: "dica", texto: "O botão aparece para quem também tem acesso ao módulo de Manutenção." },
        ],
      },
    ],
  },
  {
    id: "producao-indicadores",
    titulo: "Painel e indicadores de produção",
    resumo: "OEE, disponibilidade, Pareto das paradas e comparativo mensal",
    modulo: "producao",
    topicos: [
      {
        titulo: "Como os índices são calculados",
        blocos: [
          { tipo: "texto", texto: "São as mesmas fórmulas da planilha de controle da serraria. No mês, os índices são calculados sobre os totais (não é a média dos dias)." },
          { tipo: "termos", itens: [
            ["Disponibilidade", "(tempo programado − tempo parado) ÷ tempo programado."],
            ["Produtividade", "produção (m³) ÷ meta (m³)."],
            ["Qualidade", "1 − refugo ÷ produção."],
            ["OEE", "Disponibilidade × Produtividade × Qualidade."],
            ["Rendimento", "produção (m³) ÷ m³ de toras consumidas (quando informado no boletim)."],
          ] },
        ],
      },
      {
        titulo: "O que tem no painel",
        blocos: [
          { tipo: "lista", itens: [
            "Escolha o mês no alto; as setas mostram a variação em relação ao mês anterior.",
            "Produção diária por tipo (bom, aproveitamento e refugo) com a marca da meta de cada dia — toque em Ver tabela para os números.",
            "Paradas por centro (mecânica, elétrica e operacional), o Pareto dos motivos e as paradas por equipamento.",
            "Comparativo mensal com produção, meta, refugo, tempo parado e todos os índices.",
            "Resumo das estufas, das toras recebidas e do último levantamento de estoque.",
            "O botão Excel baixa o mês completo: comparativo, boletins, produção por bitola, paradas e Pareto.",
          ] },
        ],
      },
    ],
  },
  {
    id: "producao-estufas",
    titulo: "Estufas",
    resumo: "Ciclos de secagem, checklist e aclimatação",
    modulo: "producao",
    topicos: [
      {
        titulo: "Iniciar um ciclo",
        blocos: [
          { tipo: "passos", itens: [
            "Em Estufas, toque em Iniciar ciclo na estufa livre.",
            "Informe o nº do ciclo, a entrada, a previsão de saída, a umidade inicial e o plantão.",
            "Em Madeira na estufa, lance cada bitola: espessura, largura (ex.: 85-100-125), comprimento em metros, grades e volume em m³.",
            "Toque em Iniciar ciclo. O checklist da estufa é criado junto.",
          ] },
          { tipo: "texto", texto: "O painel das estufas mostra há quanto tempo cada uma está secando, o volume, a previsão de saída (fica vermelho se passar) e o andamento do checklist." },
        ],
      },
      {
        titulo: "Checklist e conclusão",
        blocos: [
          { tipo: "lista", itens: [
            "No ciclo, marque cada item do checklist como OK (✓) ou Não conforme (✗). Para item não conforme, escreva a observação.",
            "Ao tirar a madeira, preencha a saída e a umidade final em Concluir ciclo.",
            "O sistema mostra quando a madeira fica liberada: 24 h no pátio e mais 24 h na fábrica (medir os pacotes de novo).",
          ] },
        ],
      },
    ],
  },
  {
    id: "producao-toras-estoque",
    titulo: "Toras e estoque de madeira",
    resumo: "Recebimento de cargas por diâmetro e levantamentos de estoque",
    modulo: "producao",
    topicos: [
      {
        titulo: "Registrar uma carga de toras",
        blocos: [
          { tipo: "passos", itens: [
            "Em Recebimento de toras, toque em Nova carga.",
            "Informe data, origem/fornecedor, talhão, motorista, placa e o comprimento médio das toras.",
            "Lance a quantidade de toras por diâmetro (cm). Adicionar diâmetro já sugere o próximo diâmetro.",
            "Toque em Registrar carga.",
          ] },
          { tipo: "texto", texto: "O volume mostrado é uma estimativa (cilindro pelo diâmetro e comprimento médio), útil para comparar cargas e meses." },
        ],
      },
      {
        titulo: "Levantamento de estoque",
        blocos: [
          { tipo: "passos", itens: [
            "Em Estoque de madeira, toque em Novo levantamento.",
            "Escolha o estoque: madeira verde (pátio) ou seca empacotada.",
            "Lance cada bitola com grades ou pacotes e o volume em m³.",
            "Para o próximo levantamento, abra o anterior e use Novo a partir deste: só ajuste o que mudou.",
          ] },
        ],
      },
    ],
  },
  {
    id: "producao-cadastros",
    titulo: "Cadastros da produção",
    resumo: "Metas do mês, estufas e motivos de parada",
    modulo: "producao",
    paraProducao: "gerir",
    topicos: [
      {
        titulo: "Metas, estufas e motivos",
        blocos: [
          { tipo: "lista", itens: [
            "Meta de produção: defina a meta diária (m³), as horas por dia e o rendimento esperado de cada mês. Os boletins do mês já vêm com esses valores.",
            "Estufas: número, nome, capacidade e o equipamento correspondente na Manutenção.",
            "Motivos de parada: código, descrição, centro (mecânica, elétrica, operacional) e equipamento. Desative em vez de excluir, para manter o histórico.",
          ] },
        ],
      },
    ],
  },
  {
    id: "duvidas",
    titulo: "Dúvidas frequentes",
    resumo: "Problemas comuns e como resolver",
    topicos: [
      {
        titulo: "Perguntas e respostas",
        blocos: [
          { tipo: "termos", itens: [
            ["Não recebo notificações no celular", "Ative em Meu perfil neste aparelho e permita no navegador. No iPhone, instale o app na tela de início e abra por ele. Confira também se o modo Não perturbe está desligado."],
            ["Abri a requisição errada", "Comente explicando. Se ainda estiver Aberta, cancele com o motivo; senão, peça ao supervisor."],
            ["A foto não foi enviada", "Fotos muito grandes ou em formatos incomuns podem falhar. Tente tirar a foto pelo botão Tirar foto do próprio sistema."],
            ["A tela mostra 'Sem conexão'", "Você está sem internet. Ainda é possível abrir requisições pelo + Nova; elas serão enviadas quando a conexão voltar."],
            ["Não consigo concluir a requisição", "Verifique se o Serviço realizado está preenchido e se todos os itens do checklist estão marcados."],
            ["O app está com aparência antiga", "Feche e abra o app de novo (ou atualize a página) para carregar a versão mais recente."],
          ] },
          { tipo: "texto", texto: "Não encontrou a resposta? Fale com o gerente ou o administrador do sistema." },
        ],
      },
    ],
  },
];

/** Texto pesquisável de uma seção (busca do manual). */
export function textoDaSecao(s: Secao) {
  const partes = [s.titulo, s.resumo];
  for (const t of s.topicos) {
    partes.push(t.titulo);
    for (const b of t.blocos) {
      if ("texto" in b) partes.push(b.texto);
      if (b.tipo === "passos" || b.tipo === "lista") partes.push(...b.itens);
      if (b.tipo === "termos") partes.push(...b.itens.flat());
    }
  }
  return partes.join(" ");
}
