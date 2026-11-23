/**
 * Configuração central do site PCVP.
 * Todo o conteúdo da landing page sai daqui: troque textos, links e números
 * neste arquivo sem precisar mexer nos componentes.
 *
 * ⚠️ Os números, nomes e datas abaixo são PLACEHOLDERS.
 */

import type { HoverPreviewTarget } from "@/components/ui/hover-preview";

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export type TeamMember = {
  /** Nome oficial, sem apelido (é o que aparece na órbita, na lista e no painel). */
  name: string;
  /** Apelido do atleta. Guardado à parte; não é exibido junto do nome. */
  nickname?: string;
  role: string;
  /** Resumo curto (card do Bento). */
  bio: string;
  tags: string[];
  /** Foto do card na órbita do elenco (PNG transparente, ex.: "/atletas/alana.png"). Sem ela, degradê laranja. */
  photo?: string;
  /** Perfil detalhado (painel lateral). Campos vazios ("" ou []) são omitidos no painel. */
  profile: {
    quote: string;
    longBio: string[]; // parágrafos
    /** Títulos e resultados ("Principais Conquistas"). */
    titles: { title: string; year: string }[];
    /** Prêmios individuais (MVP, melhor bloqueio etc.). */
    awards: { title: string; year: string }[];
  };
};

export type Coach = {
  /** Nome curto exibido no card. */
  name: string;
  /** Nome completo (painel "Ler mais"). */
  fullName: string;
  role: string;
  credentials: string[];
  /** Parágrafo do card. */
  shortBio: string;
  /** Currículo detalhado do painel: blocos com título e tópicos. */
  sections: { title: string; items: string[] }[];
  /** Nome do perfil no Instagram (exibido no painel). */
  instagramLabel: string;
  /** Link do perfil; sem ele, o nome aparece como texto. */
  instagramUrl?: string;
  /** Retrato (ex.: "/comissao/paulo.jpg"). Sem ele, monograma com textura de areia. */
  image?: string;
};

export type PricingPlan = {
  name: string;
  description: string;
  /** Mensalidade em reais. Sem ela, o card mostra `priceLabel` (ex.: "Agende uma aula experimental"). */
  price?: number;
  /** Sufixo do preço (ex.: "/mês"); só aparece junto com `price`. */
  period?: string;
  /** Texto em destaque no lugar do preço quando não há valor. */
  priceLabel?: string;
  /** Linha auxiliar curta abaixo do preço / `priceLabel`. */
  priceNote?: string;
  /** Selo no canto superior do card. */
  highlight?: string;
  /** Card em destaque (borda laranja). */
  featured?: boolean;
  slots: { time: string; group: string }[];
  cta: { label: string; href: string };
};

/** Card informativo do bloco "Guias do time" (conteúdo real do PCVP, não é produto à venda). */
export type TeamGuide = {
  /** Rótulo da capa em degradê (ex.: "Guia", "Programa"). */
  kind: string;
  /** Selo acima do título. */
  badge: string;
  title: string;
  description: string;
  topics: string[];
  cta: { label: string; href: string };
};

/** Turmas da grade de treinos. A cor de cada uma fica em `components/ui/interactive-schedule.tsx`. */
export type ScheduleCategory =
  | "feminino-alto"
  | "masculino-alto"
  | "iniciante"
  | "intermediario"
  | "avancado";

export type ScheduleCategoryConfig = {
  id: ScheduleCategory;
  /** Texto do chip de filtro. */
  label: string;
  /** Título do card na grade (cai para `label`). */
  title?: string;
  /** Selo do card (nível / faixa etária). */
  level?: string;
  /** Outras turmas exibidas quando este filtro está ativo, além da própria. */
  includes?: ScheduleCategory[];
};

export type ScheduleSession = {
  /** Índice em `schedule.days` (0 = terça … 4 = sábado). */
  day: 0 | 1 | 2 | 3 | 4;
  start: string; // "HH:MM"
  end: string;
  category: ScheduleCategory;
  court?: string;
};

/** Card de texto com ícone (conquistas e modalidades). `icon` = chave em ICONS do componente. */
export type InfoItem = {
  icon: "globe" | "trophy" | "graduation" | "medal" | "flag" | "sprout" | "heart";
  title: string;
  description: string;
  tag?: string;
  /**
   * Termos da `description` que mostram uma foto ao passar o mouse
   * (HoverPreview). `text` precisa aparecer igual na descrição; `image` é o
   * caminho em `public/` — troque aqui para mudar a foto. Opcionais: `rotate`
   * (graus), `offsetX`/`offsetY` (px do cursor), `width`, `radius`, `shadow`.
   */
  previews?: HoverPreviewTarget[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const siteConfig = {
  name: "PCVP",
  fullName: "PCVP Vôlei de Praia",
  description: "Time de vôlei de praia. Treino, competição e comunidade na areia.",
  // domínio público (base das URLs absolutas de og:image e afins)
  url: "https://pcvp.vercel.app",
  locale: "pt-BR",

  nav: {
    groups: [
      {
        label: "O Time",
        items: [
          { label: "Quem somos", href: "#sobre", description: "A história e o propósito do CT" },
          { label: "Comissão Técnica", href: "#comissao", description: "Os treinadores e fundadores do PCVP" },
          { label: "Atletas", href: "#time", description: "Conheça quem joga com a gente" },
          { label: "Estatísticas", href: "#time", description: "Números da temporada" },
          { label: "Conquistas", href: "#conquistas", description: "Títulos e pódios" },
        ],
      },
      {
        label: "Temporada",
        items: [
          { label: "Próximos jogos", href: "#time", description: "Calendário de torneios" },
          { label: "Modalidades", href: "#modalidades", description: "Base, alto rendimento e funcional" },
          { label: "Horários", href: "#horarios", description: "Grade semanal de treinos" },
          { label: "Treinos", href: "#treinos", description: "Como funciona a rotina" },
        ],
      },
    ] satisfies NavGroup[],
    links: [
      { label: "Planos", href: "#planos" },
      { label: "Contato", href: "#contato" },
    ] satisfies NavItem[],
    secondary: { label: "Conheça o CT", href: "#treinos" },
    cta: { label: "Quero Treinar", href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PCVP%20e%20quero%20agendar%20um%20treino." },
  },

  hero: {
    badge: "Temporada 2026",
    titleLine1: "O Topo da Areia",
    titleLine2: "Ataque com",
    titleAccent: "Confiança",
    subtitle:
      "A plataforma moderna para atletas que querem acelerar o desenvolvimento técnico, tático e físico sem pular etapas.",
    cta: { label: "Ver Horários", href: "#horarios" },
  },

  /** Prancheta tática animada que flutua abaixo do título do hero. */
  tactical: {
    title: "Prancheta tática",
    play: "Jogada 07 · Side-out na diagonal",
    live: "Ao vivo",
    legend: { home: "PCVP", away: "Adversário" },
    steps: [
      { label: "Saque", detail: "Flutuante em cima do passador" },
      { label: "Recepção", detail: "Manchete alta perto da rede" },
      { label: "Levantamento", detail: "Toque para o parceiro atacar" },
      { label: "Ataque", detail: "Cortada na diagonal longa" },
    ],
  },

  /** Seção interativa: a logo desenhada em partículas (meio do site). */
  particles: {
    eyebrow: "Interaja",
    /** PNG com fundo transparente: cada pixel opaco vira uma partícula. */
    image: "/logo.png",
    /**
     * Linha (fração da altura da logo) abaixo da qual o texto "Paulo Coelho /
     * Vôlei de Praia" é removido. A ponta da barriga do coelho, que cruza a
     * linha, é preservada automaticamente.
     */
    imageCutoff: 0.724,
    /** Texto alternativo da logo (e fallback se a imagem não carregar). */
    text: "PCVP Vôlei de Praia",
    hint: "Deslize o mouse ou o dedo sobre a logo para cortá-la",
  },

  /** Galeria 3D (túnel). As fotos vêm automaticamente de `public/gallery`. */
  gallery: {
    eyebrow: "Galeria",
    title: "Dentro da",
    accent: "areia",
    helper: "Use o scroll do mouse para explorar o túnel ou clique e segure para acelerar.",
    helperTouch: "Arraste para os lados para explorar o túnel ou toque e segure para acelerar.",
    ariaLabel:
      "Túnel de fotos do time. Role ou arraste para navegar, segure para acelerar, clique numa foto para abri-la e Esc para fechar.",
    /**
     * Legendas automáticas: o nome do arquivo vira nomes de pessoas
     * (`brendow-paulo.png` → "Brendow e Paulo"). `names` corrige grafias
     * (acentos/apelidos) e `labels` define a legenda inteira de arquivos que
     * não são só nomes (chave = nome do arquivo sem extensão).
     */
    names: { barrao: "Barrão", vitao: "Vitão", pcvp: "PCVP", cbi: "CBI" } as Record<string, string>,
    labels: {
      "alana-paulo-maria_helena": "Alana, Paulo e Maria Helena",
      anala: "Alana",
      "cameao-sub19-cbi-lippe-murilo": "Lippe e Murilo, campeões do CBI Sub-19",
      "campeao-jaciara": "Campeão em Jaciara",
      "campeao-sub17-cbi": "Campeões do CBI Sub-17",
      "campeao-sub21-cbi": "Campeões do CBI Sub-21",
      "campeao-sub21_cbi": "Campeões do CBI Sub-21",
      "campeao-sudamericano": "Campeão Sul-Americano Sub-18",
      cbi_sub21_uberlandia: "CBI Sub-21 em Uberlândia",
      "davi-prata-estadual": "Davi, prata no Estadual",
      "larissa-quartas-brasileiro": "Laryssa nas quartas do Brasileiro",
      "maria-helena": "Maria Helena",
      "paulo-saquarema": "Paulo em Saquarema",
      "pcvp-rj": "PCVP no Rio de Janeiro",
      "podio-cbi": "Pódio do CBI",
      "podio-masculino-pcvp": "Pódio masculino do PCVP",
      podio_pcvp: "Pódio do PCVP",
      "time-pcvp": "Time PCVP",
      "treino-pre_etapa": "Treino pré-etapa",
      "victor-estadual": "Victor no Estadual",
      "vitao-nacional": "Vitão no Nacional",
    } as Record<string, string>,
  },

  /**
   * Patrocinadores e apoiadores do marquee no pé do hero.
   * `logo`: PNG em `public/patrocinio/` já tratado em BRANCO com fundo
   * transparente (os originais coloridos ficam em `assets/patrocinio-originais/`).
   * `width`/`height`: tamanho real do arquivo (proporção usada pelo next/image).
   */
  sponsors: [
    { name: "AABB Cuiabá", logo: "/patrocinio/aabb.png", width: 203, height: 109 },
    { name: "Projeto Olimpus MT · Bolsa Atleta", logo: "/patrocinio/bolsa-atleta.png", width: 574, height: 155 },
    { name: "Federação Mato-Grossense de Voleibol (FMTV)", logo: "/patrocinio/fmtv.png", width: 1124, height: 180 },
    { name: "SECEL · Governo de Mato Grosso", logo: "/patrocinio/secel.png", width: 667, height: 180 },
  ],

  /** "Sobre nós": logo abaixo da faixa de patrocinadores. */
  statement: {
    eyebrow: "Quem somos",
    /**
     * Parágrafos com desfoque de destaque. `highlights` = trechos (iguais ao
     * texto) que ganham foco. O 1º parágrafo é o maior; os demais, de apoio.
     */
    paragraphs: [
      {
        text: "O Centro de Treinamento Paulo Coelho Vôlei de Praia (PCVP) nasceu em Cuiabá (MT) com um propósito claro: transformar talento e disciplina em resultados de excelência. Sob o comando técnico de Paulo Coelho, o projeto une metodologia moderna, preparação física específica e acompanhamento próximo para desenvolver atletas em todas as fases da carreira.",
        highlights: [
          "transformar talento e disciplina em resultados de excelência",
          "metodologia moderna, preparação física específica e acompanhamento próximo",
        ],
      },
      {
        text: "Hoje, o PCVP é reconhecido como um dos principais polos formadores do Centro-Oeste, revelando talentos que conquistam pódios estaduais, títulos no Campeonato Brasileiro Interclubes (CBI) e convocações para a Seleção Brasileira de base.",
        highlights: ["um dos principais polos formadores do Centro-Oeste", "convocações para a Seleção Brasileira de base"],
      },
    ],
    /** Jornada do atleta no CT, exibida como pipeline logo abaixo do manifesto. */
    pipeline: {
      label: "Jornada do atleta no CT",
      steps: [
        { title: "Avaliação & Base", subtitle: "Fundamentos na areia" },
        { title: "Físico & Tático", subtitle: "Impulsão e leitura de jogo" },
        { title: "Ritmo de Jogo", subtitle: "Simulados sob pressão" },
      ],
      outcomes: [
        { title: "Circuito Estadual", subtitle: "Etapas CMTVP & Regional" },
        { title: "Alto Rendimento", subtitle: "CBVP Nacional & Seleção" },
      ],
    },
  },

  /** Destaques de resultados (antes do bloco "O time", que traz o feed e os números). */
  results: {
    eyebrow: "Conquistas",
    title: "Nossas conquistas e resultados expressivos",
    description:
      "O trabalho desenvolvido no Paulo Coelho Vôlei de Praia (PCVP) coloca Cuiabá e Mato Grosso em destaque nos principais pódios do Brasil e do mundo:",
    items: [
      {
        icon: "globe",
        title: "Pódio Internacional e Mundial",
        description:
          "O atleta Felippe Prudêncio (\"Lippe\") sagrou-se Campeão Sul-Americano Sub-18 pela Seleção Brasileira e conquistou o 9º lugar no Campeonato Mundial Sub-18 em Doha, no Catar.",
        previews: [
          {
            text: 'Felippe Prudêncio ("Lippe")',
            image: "/gallery/campeao-sudamericano.png",
            alt: "Felippe Prudêncio no pódio do Sul-Americano Sub-18",
            rotate: -5,
          },
        ],
      },
      {
        icon: "trophy",
        title: "Títulos Brasileiros na Base",
        description:
          "Murilo Santos Rocha e Felippe Prudêncio conquistaram o título geral do Campeonato Brasileiro Interclubes (CBI) Sub-21, somando-se a títulos nacionais nas categorias Sub-17, Sub-19 e etapas do Circuito Brasileiro Sub-21.",
        previews: [
          {
            text: "Campeonato Brasileiro Interclubes (CBI) Sub-21",
            image: "/gallery/campeao-sub21_cbi.png",
            alt: "Campeões do CBI Sub-21 com a faixa do PCVP",
            rotate: 4,
          },
        ],
      },
      {
        icon: "graduation",
        title: "Destaque no Esporte Universitário",
        description:
          "A atleta Laryssa Dalmoro garantiu a vaga ao se sagrar campeã brasileira e, na sequência, conquistou o título de Campeã Sul-Americana Universitária (FISU).",
        previews: [
          { text: "Laryssa Dalmoro", image: "/gallery/larissa-quartas-brasileiro.png", alt: "Laryssa Dalmoro em quadra", rotate: -4 },
        ],
      },
      {
        icon: "medal",
        title: "Elite do Vôlei de Praia Nacional",
        description:
          "Presença constante de duplas masculinas e femininas do centro nas quartas de final do Circuito Brasileiro Adulto, enfrentando as principais equipes do país.",
      },
      {
        icon: "flag",
        title: "Formação de Seleção Brasileira",
        description:
          "Convocações recorrentes de atletas e da comissão técnica para períodos de treinamento e competições oficiais pela Confederação Brasileira de Voleibol (CBV).",
      },
    ] satisfies InfoItem[],
  },

  /** Comissão técnica: os fundadores e treinadores do PCVP. */
  coaches: {
    eyebrow: "Nosso time",
    title: "Conheça quem vai te acompanhar nessa jornada",
    subtitle:
      "Mais de três décadas formando campeões da base ao alto rendimento em Mato Grosso e na Seleção Brasileira.",
    items: [
      {
        name: "Paulo Coelho",
        fullName: "Paulo Coelho Ferreira",
        role: "Head Coach & Fundador",
        image: "/atletas/paulo.png",
        credentials: ["CREF 8751-G/MT", "Técnico Nível III CBV", "Seleção Brasileira de Base", "+30 anos no esporte"],
        shortBio:
          "São mais de 30 anos no vôlei de praia: começou como atleta e, depois, formou-se em Educação Física, fez os cursos da CBV e tornou-se Técnico Nível III. Hoje é um dos principais formadores de talentos do Centro-Oeste: observador nacional de talentos da CBV, integrou a comissão técnica da Seleção Brasileira Sub-17 e Sub-19 em Saquarema (RJ) e comandou títulos gerais brasileiros no CBI Sub-17 e Sub-21.",
        sections: [
          {
            title: "Formação e Credenciais Profissionais",
            items: [
              "Mais de três décadas no vôlei de praia: começou como atleta e, depois, estudou e formou-se em Educação Física (CREF 8751-G/MT), realizou os cursos da Confederação Brasileira de Voleibol (CBV) e tornou-se Técnico Nível III de vôlei de praia.",
              "Observador de talentos da CBV e ex-Diretor Técnico de Vôlei de Praia da Federação Mato-Grossense de Voleibol (FMTV).",
              "Integrante da comissão técnica da Seleção Brasileira Sub-17 e Sub-19 em acampamentos oficiais no CDV em Saquarema (RJ).",
            ],
          },
          {
            title: "Trajetória e Projetos em Mato Grosso",
            items: [
              "Técnico e fundador do Time PCVP, que comanda ao lado da professora Marisléa Coelho da iniciação (Sub-15) ao alto rendimento adulto em Cuiabá (AABB Cuiabá e CT Bonifácia).",
              "À frente do PCVP, construiu uma das equipes mais competitivas de Mato Grosso: o time Paulo Coelho marca presença constante nos pódios de todas as etapas do Circuito Mato-Grossense de Vôlei de Praia, do Sub-17 e Sub-19 ao adulto, no masculino e no feminino.",
              "Atuou na organização do Circuito Mato-Grossense (CMTVP) quando coordenava o vôlei de praia da FMTV, cargo que não ocupa mais; hoje se dedica ao comando técnico do Time PCVP.",
              "Treinador contemplado pelo programa estadual Olimpus (Bolsa Técnico/Atleta do Governo de Mato Grosso).",
            ],
          },
          {
            title: "Principais Resultados como Treinador",
            items: [
              "Campeão Brasileiro Geral CBI Sub-17 (2024) com Felippe Prudêncio e Davi Coimbra, conquistando convocação para o Camp da Seleção Brasileira em 2025.",
              "Campeão Brasileiro Geral CBI Sub-21 (2026) com Felippe Prudêncio e Murilo Rocha, vencendo etapas em Serra (ES) e Uberlândia (MG).",
              "Preparação contínua de duplas para o Circuito Brasileiro Aberto, CBDU e competições internacionais universitárias (FISU).",
            ],
          },
        ],
        instagramLabel: "Paulo Coelho - Técnico",
        instagramUrl: "https://www.instagram.com/paulocoelhovolei/",
      },
      {
        name: "Marisléa Coelho",
        fullName: "Marisléa Lopes Coelho",
        role: "Coordenadora Técnica & Cofundadora",
        image: "/atletas/leia.png",
        credentials: ["Educação Física", "Cofundadora PCVP", "Pedagogia & Base", "Circuito Estadual CMTVP"],
        shortBio:
          "Professora de Educação Física, treinadora e cofundadora do PCVP em Cuiabá (MT). Especialista na pedagogia esportiva e na transição de jovens talentos para o alto rendimento, coordena os treinos diários da iniciação (Sub-15 a Sub-19) às equipes adultas femininas e masculinas em torneios estaduais e nacionais.",
        sections: [
          {
            title: "Atuação no Centro de Treinamento (PCVP)",
            items: [
              "Coordenação e comando técnico diário ao lado de Paulo Coelho, da iniciação e base (Sub-15, Sub-17 e Sub-19) até as categorias adultas em Cuiabá.",
              "Preparação técnica e física de duplas masculinas e femininas para etapas estaduais, Campeonato Brasileiro Interclubes (CBI) e jogos universitários (CBDU).",
              "Acompanhamento direto de atletas em competições e no programa estadual Olimpus nos polos AABB Cuiabá e CT Bonifácia.",
            ],
          },
          {
            title: "Fomento ao Vôlei de Praia em Mato Grosso",
            items: [
              "Atuação ativa na organização, arbitragem e promoção do Circuito Mato-Grossense de Vôlei de Praia, fortalecendo o calendário na capital e no interior.",
              "Foco em Educação Esportiva e pedagogia para crianças e adolescentes, estruturando a base técnica e mental rumo ao alto rendimento.",
            ],
          },
        ],
        instagramLabel: "PCVP Vôlei de Praia",
      },
    ] satisfies Coach[],
  },

  bento: {
    eyebrow: "O time",
    title: "Tudo do PCVP em um só lugar",
    stats: {
      title: "Pódios do time",
      description: "Resultados acumulados por temporada e categoria.",
      /** Abas do gráfico de partículas. Sempre 5 colunas: os tubos ficam fixos e a areia pula entre eles. */
      tabs: [
        {
          id: "geral",
          label: "Geral",
          total: "144",
          unit: "Pódios",
          columns: [
            { label: "2022", value: 14 },
            { label: "2023", value: 24 },
            { label: "2024", value: 38 },
            { label: "2025", value: 46 },
            { label: "2026", value: 22 },
          ],
        },
        {
          id: "estadual",
          label: "Estadual",
          total: "95",
          unit: "Pódios",
          columns: [
            { label: "Sub-17", value: 22 },
            { label: "Sub-19", value: 26 },
            { label: "Sub-21", value: 15 },
            { label: "Adulto", value: 24 },
            { label: "Open", value: 8 },
          ],
        },
        {
          id: "nacional",
          label: "Nacional & Inter.",
          total: "49",
          unit: "Pódios",
          columns: [
            { label: "CBI Base", value: 14 },
            { label: "CBVP Sub-19", value: 11 },
            { label: "CBVP Sub-21", value: 12 },
            { label: "CBVP Adulto", value: 7 },
            { label: "Internacional", value: 5 },
          ],
        },
      ],
    },
    matches: {
      title: "Próximos jogos",
      description: "Calendário de torneios da temporada.",
      items: [
        { date: "07 DEZ", event: "Circuito Estadual · Etapa 5", place: "Praia Central" },
        { date: "14 DEZ", event: "Open de Verão", place: "Arena da Orla" },
        { date: "11 JAN", event: "Copa Regional", place: "Praia do Forte" },
      ],
    },
    achievements: {
      title: "Conquistas",
      live: "Ao vivo",
      /** Feed animado: resultados reais tirados dos perfis do elenco. */
      feed: [
        { athlete: "Felippe", photo: "/atletas/lippe.png", title: "Campeão Sul-Americano Sub-18 (Peru) & 9º Mundial (Catar)", year: "", badge: "Internacional" },
        { athlete: "Davi", photo: "/atletas/davi.png", title: "Seleção Brasileira de Base & Campeão CBI Sub-17", year: "", badge: "Seleção" },
        { athlete: "Laryssa", photo: "/atletas/larissa.png", title: "Campeã Pan-Americana FISU (Cali) & Tetra Universitária", year: "", badge: "Internacional" },
        { athlete: "Murilo", photo: "/atletas/murilo.png", title: "Bicampeão de Etapas CBVP Sub-21 (RJ e Itapema)", year: "", badge: "Nacional" },
        { athlete: "Danielle", photo: "/atletas/danny.png", title: "Vice-Campeã Circuito Brasileiro Aberto (Saquarema)", year: "", badge: "Nacional" },
        { athlete: "Brendow", photo: "/atletas/brendow.png", title: "Tricampeão Estadual Adulto CMTVP (2023–2025)", year: "", badge: "Estadual" },
        { athlete: "Yuri", photo: "/atletas/yuri.png", title: "Tricampeão Estadual Adulto CMTVP (2023–2025)", year: "", badge: "Estadual" },
        { athlete: "Alana", photo: "/atletas/alana.png", title: "Vice-Campeã Brasileira Sub-19 (Navegantes SC 2026)", year: "", badge: "Nacional" },
        { athlete: "Gabriel", photo: "/atletas/gabriel.png", title: "2x Vice-Campeão Brasileiro Sub-21 (CBVP)", year: "", badge: "Nacional" },
      ],
    },
  },

  /**
   * Elenco. As bios são um ponto de partida: revise-as com os atletas
   * (posições, conquistas e torneios exatos) antes de publicar.
   */
  team: {
    eyebrow: "Elenco",
    title: "Quem joga pelo PCVP",
    hint: "Arraste para girar · clique num atleta para ver o perfil",
    orbitLabel: "Órbita 3D com o elenco do PCVP. Arraste para girar e clique num atleta para abrir o perfil.",
    members: [
      {
        name: "Maria Helena",
        nickname: "Mary",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Aripuanã-MT, começou no vôlei aos 11 anos e chegou ao PCVP em abril de 2026. Campeã estadual Sub-17 e tricampeã estadual Sub-19.",
        tags: ["Alto Rendimento", "Aripuanã-MT"],
        photo: "/atletas/maria-helena.png",
        profile: {
          quote:
            "Comecei treinando na praça da minha cidade e hoje jogo em lugares que nunca imaginei estar. Tudo que corri atrás e lutei, estou colhendo hoje nesse esporte que transformou a minha vida.",
          longBio: [
            "Natural de Aripuanã – MT, Mary iniciou no vôlei aos 11 anos, buscando evolução desde cedo. Treinava com o masculino para acelerar seu rendimento, corria atrás de treinos extras, praticava na pracinha da cidade e ainda recebia o apoio do pai nos fundamentos — uma trajetória que mostra sua determinação desde o começo.",
            "Com 15 anos, conheceu o vôlei de praia, modalidade pela qual rapidamente se apaixonou. Em abril de 2026, chegou ao Time PCVP, trazendo consigo disciplina, vontade de crescer e uma história inspiradora de quem começou em uma simples quadra de praça e hoje compete em lugares que jamais imaginou alcançar.",
            "Inspirada por Valentina Gottardi, Mary conta que se orgulha de tudo que viveu até aqui e o PCVP tem a honra de fazer parte dessa jornada.",
          ],
          titles: [
            { title: "Campeã Estadual Sub-17", year: "2023" },
            { title: "Campeã Estadual Sub-19", year: "2024 · 2025 · 2026" },
            { title: "Vice-campeã Estadual Adulto", year: "2025" },
            { title: "4º lugar · Jogos da Juventude", year: "2024" },
            { title: "5º lugar · Circuito Brasileiro Sub-19 · Etapa Brasília", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Alana",
        nickname: "Lana",
        role: "Atleta · Base / Sub-19",
        bio: "Debutante da Temporada 2026, aos 15 anos. No PCVP desde 2025, já soma títulos no CMTVP do Sub-15 ao Sub-19.",
        tags: ["Base / Sub-19", "Debutant 2026"],
        photo: "/atletas/alana.png",
        profile: {
          quote: "Lana é símbolo de força, mentalidade forte e determinação.",
          longBio: [
            "Nossa debutante da Temporada 2026! Com apenas 15 anos, Lana começou no vôlei de praia em 2018 e entrou para o vôlei de quadra em 2020. Inspirada pela família e por grandes nomes como Cassiane França e Duda Lisboa, entrou para o Time PCVP em 2025 e rapidamente se consolidou como um dos maiores talentos promissores da nova geração.",
          ],
          titles: [
            { title: "Sub-15 · Campeã Torneio Início FMTV · Cuiabá", year: "2024 · 2025" },
            { title: "Sub-15 · Campeã 1ª etapa CMTVP · Arena Cuiabá", year: "2025" },
            { title: "Sub-17 · Campeã Seletiva CMTVP", year: "2025" },
            { title: "Sub-17 · Campeã 1ª, 2ª, 3ª, 4ª e 6ª etapas CMTVP", year: "2025" },
            { title: "Sub-17 · Campeã 1ª etapa Centro-Oeste · Cuiabá", year: "2026" },
            { title: "Sub-17 · Vice-campeã Seletiva CMTVP", year: "2024" },
            { title: "Sub-17 · 4º lugar 5ª etapa CMTVP · Araputanga", year: "2025" },
            { title: "Sub-19 · Campeã 3ª, 4ª e 5ª etapas CMTVP", year: "2025" },
            { title: "Sub-19 · Vice-campeã 6ª etapa CMTVP", year: "2025" },
            { title: "Sub-19 · Vice-campeã 1ª etapa Circuito Brasileiro · Navegantes-SC", year: "2026" },
            { title: "Sub-19 · Vice-campeã 1ª etapa Centro-Oeste · Cuiabá", year: "2026" },
            { title: "Sub-19 · 3º lugar 1ª e 2ª etapas CMTVP · Cuiabá", year: "2025" },
            { title: "Sub-19 · Vice-campeã Seletiva CMTVP · Cuiabá", year: "2024" },
          ],
          awards: [],
        },
      },
      {
        name: "Brendow Padilha",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, 22 anos, no PCVP desde agosto de 2024. Tricampeão estadual adulto (CMTVP).",
        tags: ["Alto Rendimento", "Cuiabá - MT", "22 anos"],
        photo: "/atletas/brendow.png",
        profile: {
          quote: "Vamos com tudo para mais uma temporada de grandes resultados!",
          longBio: [
            "Aos 22 anos e natural de Cuiabá – MT, Brendow chegou ao PCVP em agosto de 2024, trazendo muita disciplina e foco. Iniciou no vôlei de praia em setembro de 2020 e vem construindo uma trajetória de forte maturidade competitiva e evolução técnica consistente.",
          ],
          titles: [
            { title: "5º lugar · 2ª etapa CBVP · João Pessoa-PB", year: "2026" },
            { title: "3º lugar · 1ª etapa Centro-Oeste CMTVP · Cuiabá-MT", year: "2026" },
            { title: "5º lugar · 2ª etapa Challenger · Itapema-SC", year: "2025" },
            { title: "Tricampeão Estadual Adulto Masculino (CMTVP)", year: "2023 · 2024 · 2025" },
            { title: "Campeão de etapas do CMTVP Adulto e Sub-23", year: "2025" },
            { title: "4º lugar · Brasileiro Universitário (JUB’s Praia)", year: "" },
          ],
          awards: [],
        },
      },
      {
        name: "Danielle Rodrigues",
        nickname: "Dani",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, no PCVP desde 2018. Vice-campeã brasileira do Circuito Banco do Brasil Aberto e líder do ranking estadual por 3 anos.",
        tags: ["Alto Rendimento", "Cuiabá - MT"],
        photo: "/atletas/danny.png",
        profile: {
          quote: "Seguimos juntos — sempre evoluindo!",
          longBio: [
            "Natural de Cuiabá – MT, Dani iniciou no vôlei de praia em 2014 e chegou ao Time PCVP em 2018. Tendo Rebecca como grande ídola, construiu uma carreira sólida marcada por constância, forte competitividade e liderança no cenário estadual e nacional.",
          ],
          titles: [
            { title: "Vice-campeã Brasileira · Circuito Banco do Brasil Aberto · Saquarema", year: "2022" },
            { title: "Líder do Ranking Estadual por 3 anos consecutivos", year: "2019 · 2020 · 2021" },
            { title: "3º lugar · Ranking Estadual", year: "2026" },
            { title: "Campeã Universitária de Voleibol", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Davi Schroeder Coimbra",
        nickname: "Coimbra",
        role: "Atleta · Base / Seleção Brasileira",
        bio: "Natural de Sorriso-MT, 17 anos e 1,90m. Campeão brasileiro CBI Sub-17 em 2024 e atleta da Seleção Brasileira de Vôlei de Praia – Base.",
        tags: ["Base / Seleção Brasileira", "Sorriso - MT", "1.90m", "17 anos"],
        photo: "/atletas/davi.png",
        profile: {
          quote: "Davi representa a nova geração do PCVP: foco, respeito pelo esporte e evolução constante.",
          longBio: [
            "Natural de Sorriso – MT, com apenas 17 anos e 1,90m, Davi (ou Zeronine) começou no vôlei de praia em 2022. Convidado pelo técnico Paulo Coelho em agosto de 2024 para o Time PCVP, sagrou-se Campeão Brasileiro CBI Sub-17 logo no mesmo ano. Hoje, é atleta da Seleção Brasileira de Vôlei de Praia – Base.",
          ],
          titles: [
            { title: "Campeão Brasileiro · CBI Sub-17", year: "2024" },
            { title: "Atleta da Seleção Brasileira de Vôlei de Praia – Base", year: "" },
            { title: "3º lugar no Ranking geral Sub-17 e 4º lugar Sub-19 (CBVP/CBI)", year: "2025" },
            { title: "3º lugar · CBI Sub-19 · Uberlândia-MG", year: "2025" },
            { title: "Campeão dos Jogos Escolares de Seleções e Cuiabá", year: "2025" },
            { title: "Diversos títulos de campeão e vice em etapas do CMTVP Sub-17 e Sub-19", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Diego Coelho Domingos Matos",
        role: "Atleta · Base / Sub-17",
        bio: "Natural de Barra do Garças-MT, joga vôlei de praia desde 2022 e chegou ao PCVP em 2025. Bicampeão de etapas do CMTVP Sub-17.",
        tags: ["Base / Sub-17", "Barra do Garças - MT"],
        photo: "/atletas/diego.png",
        profile: {
          quote: "Seguimos juntos — sempre evoluindo!",
          longBio: [
            "Natural de Barra do Garças – MT e com raízes em Ribeirãozinho – MT, Diego reside em Cuiabá, onde foca nos treinos e estudos. Iniciou no vôlei de praia em 2022 e ingressou no Time PCVP no início de 2025, destacando-se rapidamente pela postura madura e grande potencial na base.",
          ],
          titles: [
            { title: "Campeão · 5ª etapa CMTVP Sub-17 · Araputanga", year: "2025" },
            { title: "Campeão · 4ª etapa CMTVP Sub-17 · Barão de Melgaço", year: "2025" },
            { title: "Vice-campeão 6ª etapa CMTVP Sub-17 e 3º lugar Sub-19 · Lambari D’Oeste", year: "2025" },
            { title: "Vice-campeão · 5ª etapa CMTVP Sub-19 · Araputanga", year: "2025" },
            { title: "Vice-campeão · 3ª etapa CMTVP Sub-17 · Denise", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Gabriel Loras Miranda",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Guajará-Mirim-RO, chegou ao PCVP na Temporada 2026. Duas vezes vice-campeão brasileiro Sub-21 (CBVP).",
        tags: ["Alto Rendimento", "Guajará-Mirim - RO"],
        photo: "/atletas/gabriel.png",
        profile: {
          quote: "A Temporada 2026 promete — estamos prontos e seguimos juntos.",
          longBio: [
            "Natural de Guajará-Mirim – RO, Gabriel Loras Miranda chegou para a Temporada 2026 trazendo toda a sua vivência no alto rendimento. Com um histórico de respeito nas quadras, coleciona resultados expressivos nacionais e estaduais, somando maturidade, responsabilidade e forte presença em quadra ao Time PCVP.",
          ],
          titles: [
            { title: "2x Vice-Campeão Brasileiro Sub-21 (CBVP)", year: "" },
            { title: "2x 3º Colocado Sub-21 no Circuito Brasileiro de Vôlei de Praia", year: "" },
            { title: "Campeão Amazonense em diversas temporadas", year: "" },
            { title: "Campeão Rondoniense em diversas temporadas", year: "" },
          ],
          awards: [],
        },
      },
      {
        name: "Kayo Henrique Picolomini Fonseca Gonçalves",
        nickname: "Kayoxx",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, 20 anos e 1,89m. Começou no vôlei de praia e no PCVP em 2023 e já representou o time no CBI, CBVP e CMTVP.",
        tags: ["Alto Rendimento", "Cuiabá - MT", "1.89m"],
        photo: "/atletas/kayo.png",
        profile: {
          quote: "Continue firme, Kayoxx. O caminho é longo — e ele é seu.",
          longBio: [
            "Conhecido como Kayoxx, tem 20 anos, 1,89m de altura e é natural de Cuiabá – MT, morando em Várzea Grande – MT. Chegou ao Time PCVP em 2023, mesmo ano em que iniciou no vôlei de praia. Com dedicação incansável e dividindo o tempo entre trabalho e treinos, já representou a equipe em competições como CBI, CBVP e CMTVP, provando que humildade, disciplina e amor pelo esporte transformam qualquer trajetória.",
          ],
          titles: [
            { title: "Evolução constante e representação oficial do PCVP em competições estaduais e nacionais (CBI, CBVP, CMTVP)", year: "Desde 2023" },
          ],
          awards: [],
        },
      },
      {
        name: "Laryssa Oliveira Dalmoro",
        nickname: "Lary",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, no PCVP desde 2023. Campeã pan-americana FISU e atleta mais bem ranqueada do estado a nível nacional.",
        tags: ["Alto Rendimento", "Cuiabá - MT"],
        photo: "/atletas/larissa.png",
        profile: {
          quote: "Sigo na busca desse sonho. Amo estar no CT e amo as pessoas que fazem parte dele.",
          longBio: [
            "Natural de Cuiabá – MT, Lary começou no vôlei de praia em 2019/2020 e chegou ao Time PCVP em 2023. Tendo Brandie Wilkerson e Carol Solberg como inspirações, acumula títulos estaduais, nacionais e internacionais, sendo a atleta mais bem ranqueada do estado a nível nacional.",
          ],
          titles: [
            { title: "Campeã Pan-Americana · FISU America Games · Cali (COL)", year: "2024" },
            { title: "Campeã Brasileira Universitária (RJ) e Campeã dos Jogos Abertos/Regionais de SP", year: "2024" },
            { title: "1º lugar do Ranking Estadual CMTVP e Campeã Estadual Adulto", year: "2023 · 2024 · 2025" },
            { title: "Tetracampeã Universitária Estadual", year: "2022 · 2023 · 2024 · 2025" },
            { title: "5º lugar · 1ª etapa do CBVP · Campo Grande-MS", year: "2024" },
          ],
          awards: [],
        },
      },
      {
        name: "Felippe Prudêncio Arruda Barbiero",
        nickname: "Lippe",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, no PCVP desde 2022. Campeão sul-americano Sub-18 e 9º no Mundial Sub-18 em 2025.",
        tags: ["Alto Rendimento", "Cuiabá - MT"],
        photo: "/atletas/lippe.png",
        profile: {
          quote: "Seguimos juntos — formando talentos, construindo histórias e acreditando no futuro do nosso esporte.",
          longBio: [
            "Natural de Cuiabá – MT e vindo de uma família inteiramente apaixonada pelo vôlei, Lippe chegou ao Time PCVP em 2022 e rapidamente se tornou um dos maiores destaques da base e do vôlei mato-grossense, tendo como grande inspiração o atleta Renato.",
          ],
          titles: [
            { title: "Campeão Sul-Americano Sub-18 · Lima/Peru", year: "2025" },
            { title: "9º lugar · Mundial Sub-18 · Doha/Catar", year: "2025" },
            { title: "Campeão · 3ª etapa CBVP Sub-21 · Itapema-SC", year: "2025" },
            { title: "Tricampeão Estadual Sub-17", year: "2022 · 2023 · 2025" },
            { title: "Campeão Brasileiro Interclubes · CBI Sub-17 e Sub-19", year: "2024" },
            { title: "Campeão · Jogos Escolares · Cuiabá", year: "2025" },
            { title: "Diversos títulos de etapas do CMTVP Adulto, Sub-23 e Sub-19", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Marcus Vinicius Santos de Oliveira",
        nickname: "Marquinhos",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, 22 anos, 1,85m e universitário. Migrou da quadra para o vôlei de praia em 2021 e está no PCVP desde 2024.",
        tags: ["Alto Rendimento", "Cuiabá - MT", "1.85m", "22 anos"],
        photo: "/atletas/marcus.png",
        profile: {
          quote: "Seguimos juntos — sempre evoluindo!",
          longBio: [
            "Natural de Cuiabá – MT, Marquinhos tem 22 anos, 1,85m e é universitário. Conheceu o vôlei através de um projeto social na escola, iniciou no vôlei de quadra em 2017 e migrou para o vôlei de praia em 2021. Integra o Time PCVP desde 2024.",
            "Vindo de uma família ligada ao esporte, com atletas no vôlei e no basquete, traz forte conexão com a competição e a disciplina. No vôlei de praia, tem o Mol como ídolo e o Guto como inspiração.",
          ],
          titles: [
            { title: "Medalhista Brasileiro · Categorias de base", year: "" },
            { title: "Medalhista Regional · Categoria de base", year: "" },
            { title: "Medalhista Estadual · Adulto e base", year: "" },
            { title: "5º colocado geral · CBVP Sub-21", year: "2023" },
            { title: "3º colocado geral · CMTVP Adulto", year: "2023 · 2024" },
            { title: "3º lugar · 1ª etapa CMTVP Adulto · Cuiabá-MT", year: "2025" },
            { title: "4º lugar · 2ª etapa CMTVP Sub-23 · Cuiabá-MT", year: "2025" },
            { title: "3º lugar · 4ª etapa CMTVP Adulto · Barão de Melgaço-MT", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Murilo dos Santos Rochas",
        nickname: "Mumu",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Várzea Grande-MT, joga vôlei de praia desde 2021. Aos 19 anos e com 1,92m, já soma títulos estaduais, regionais e nacionais.",
        tags: ["Alto Rendimento", "Várzea Grande - MT", "1.92m"],
        photo: "/atletas/murilo.png",
        profile: {
          quote: "A Temporada 2026 já vem mostrando ser mais um capítulo de grandes conquistas que ainda estão por vir.",
          longBio: [
            "Natural de Várzea Grande – MT, Murilo iniciou no Vôlei de Praia em 2021 e, em pouco tempo, tornou-se uma das grandes promessas da nova geração. Com apenas 19 anos e 1,92m de altura, Mumu já carrega no currículo conquistas expressivas em competições estaduais, regionais e nacionais, trilhando um caminho sólido rumo ao alto nível.",
          ],
          titles: [
            { title: "3º lugar · 2ª etapa CBVP Sub-21 · Brasília-DF", year: "2026" },
            { title: "3º lugar · 1ª etapa CBVP Sub-21 · Navegantes-SC", year: "2026" },
            { title: "Campeão · 2ª etapa Centro-Oeste CMVP · Chapada dos Guimarães", year: "2026" },
            { title: "3º lugar · 1ª etapa Centro-Oeste CMTVP · Cuiabá", year: "2026" },
            { title: "Campeão · 3ª etapa CBVP Sub-21 · Itapema-SC", year: "2025" },
            { title: "Campeão · 2ª etapa CBVP Sub-21 · Rio de Janeiro-RJ", year: "2025" },
            { title: "Campeão da 6ª e 4ª e vice-campeão da 1ª e 5ª etapas · CMTVP Adulto", year: "2025" },
            { title: "Campeão Brasileiro Interclubes · CBI Sub-19", year: "2024" },
            { title: "3º lugar · 3ª etapa CBVP Sub-19 · Saquarema-RJ", year: "2024" },
            { title: "4º colocado geral · CBVP Sub-19", year: "2024" },
          ],
          awards: [],
        },
      },
      {
        name: "Victor Hugo Moraes de Almeida",
        nickname: "Vitão",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Cuiabá-MT, 20 anos e 1,86m. No PCVP desde 2024, já representou o time no CBI, CBVP e CMTVP.",
        tags: ["Alto Rendimento", "Cuiabá - MT", "1.86m"],
        photo: "/atletas/victor.png",
        profile: {
          quote: "Sua garra te trouxe até aqui — e é ela que vai te levar ainda mais longe.",
          longBio: [
            "Com 20 anos, 1,86m e natural de Cuiabá – MT, Vitão é daqueles atletas que chegam para fazer a diferença, não só dentro da quadra, mas no ambiente inteiro. Chegou ao Time PCVP em 2024, dividindo a rotina entre trabalho e treinos diários. Já representou a equipe em competições estaduais e nacionais como CBI, CBVP e CMTVP, sendo a alegria e a vibração que contagiam todo o grupo.",
          ],
          titles: [
            { title: "5º lugar geral · Brasileiro CBVP Sub-21", year: "2023" },
            { title: "3º lugar geral · CMTVP Adulto", year: "2023" },
            { title: "3º lugar · 1ª etapa CMTVP Adulto · Cuiabá", year: "2025" },
            { title: "4º lugar · 6ª etapa CMTVP Adulto · Lambari D´Oeste", year: "2025" },
          ],
          awards: [],
        },
      },
      {
        name: "Yuri Henrique Coelho Mariano",
        nickname: "Mariano",
        role: "Atleta · Alto Rendimento",
        bio: "Natural de Pontes e Lacerda-MT, 23 anos e 1,80m. No PCVP desde 2024, é tricampeão estadual adulto (CMTVP).",
        tags: ["Alto Rendimento", "Pontes e Lacerda - MT", "1.80m", "23 anos"],
        photo: "/atletas/yuri.png",
        profile: {
          quote: "O vôlei sempre recompensa quem não desiste.",
          longBio: [
            "Natural de Pontes e Lacerda – MT, Yuri tem 23 anos, 1,80m e uma trajetória marcada por persistência. Quase deixou o esporte em 2022 antes de arriscar no vôlei de praia. Integrou o Time PCVP em 2024, tendo George e Bruno Schmidt como inspirações, e hoje se destaca como um dos atletas mais consistentes do projeto.",
          ],
          titles: [
            { title: "Tricampeão Estadual Adulto (CMTVP)", year: "2023 · 2024 · 2025" },
            { title: "Campeão Brasileiro · CBS Sub-20", year: "" },
            { title: "Campeão de etapas do CMTVP Adulto e Sub-23", year: "2025" },
            { title: "4º lugar · Brasileiro Universitário", year: "" },
            { title: "5º lugar · Brasileiro Sub-21 e 5ª etapa do CBVP · Cuiabá", year: "2025" },
          ],
          awards: [],
        },
      },
    ] satisfies TeamMember[],
  },

  /**
   * Grade oficial do CT: Alto Rendimento à tarde (feminino e masculino
   * alternam o primeiro horário a cada dia), escolinha às terças e quintas
   * e treino avançado/físico no sábado de manhã.
   * Sessões com o mesmo dia/início/fim aparecem lado a lado (use `court` para diferenciar).
   */
  /** Modalidades e turmas (antes da grade de horários e dos planos). */
  modalities: {
    eyebrow: "Modalidades",
    title: "Modalidades e turmas",
    items: [
      {
        icon: "sprout",
        title: "Iniciação e Base",
        tag: "Sub-15 ao Sub-21",
        description:
          "Foco nos fundamentos técnicos, coordenação motora, leitura de jogo e formação competitiva para jovens atletas que sonham em disputar torneios oficiais.",
      },
      {
        icon: "trophy",
        title: "Alto Rendimento e Adulto",
        tag: "Competição",
        description:
          "Treinamento intensivo voltado para duplas que disputam circuitos estaduais, etapas do Circuito Brasileiro e competições universitárias (CBDU).",
      },
      {
        icon: "heart",
        title: "Treinamento Funcional e Qualidade de Vida",
        tag: "Saúde & bem-estar",
        description:
          "Aulas dinâmicas para quem busca condicionamento físico, saúde e evolução técnica no esporte em um ambiente acolhedor e motivador.",
      },
    ] satisfies InfoItem[],
  },

  schedule: {
    eyebrow: "Horários",
    title: "Grade de treinos",
    description:
      "Alto Rendimento de terça a sexta à tarde, Iniciante e Escolinha às terças e quintas e treino avançado no sábado. Passe o mouse para destacar e filtre por turma.",
    days: ["Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
    /** Turnos exibidos (horas inteiras, `end` exclusivo). A resolução das linhas sai dos próprios horários. */
    shifts: [
      { label: "Manhã", start: 9, end: 12 },
      { label: "Tarde / Noite", start: 15, end: 21 },
    ],
    /**
     * `label` = filtro; `title` + `level` = texto do card na grade.
     * `includes` = outras turmas que o filtro também destaca (ex.: o Alto
     * Rendimento mostra o sábado; o Avançado mostra as tardes de terça a sexta).
     */
    categories: [
      { id: "feminino-alto", label: "Feminino Alto Rendimento", title: "Feminino", level: "Alto Rendimento", includes: ["avancado"] },
      { id: "masculino-alto", label: "Masculino Alto Rendimento", title: "Masculino", level: "Alto Rendimento", includes: ["avancado"] },
      { id: "iniciante", label: "Iniciante e Escolinha", title: "Iniciante e Escolinha", level: "Iniciação" },
      { id: "intermediario", label: "Intermediário", title: "Intermediário", level: "Escolinha" },
      { id: "avancado", label: "Avançado", title: "Avançado", includes: ["feminino-alto", "masculino-alto"] },
    ] satisfies ScheduleCategoryConfig[],
    sessions: [
      // Terça
      { day: 0, start: "15:00", end: "15:40", category: "feminino-alto" },
      { day: 0, start: "15:40", end: "17:00", category: "masculino-alto" },
      { day: 0, start: "17:00", end: "19:30", category: "iniciante" },
      { day: 0, start: "19:30", end: "21:00", category: "intermediario" },

      // Quarta (inverte o Alto Rendimento)
      { day: 1, start: "15:00", end: "15:40", category: "masculino-alto" },
      { day: 1, start: "15:40", end: "17:00", category: "feminino-alto" },

      // Quinta (inverte de novo + escolinha)
      { day: 2, start: "15:00", end: "15:40", category: "feminino-alto" },
      { day: 2, start: "15:40", end: "17:00", category: "masculino-alto" },
      { day: 2, start: "17:00", end: "19:30", category: "iniciante" },
      { day: 2, start: "19:30", end: "21:00", category: "intermediario" },

      // Sexta (inverte)
      { day: 3, start: "15:00", end: "15:40", category: "masculino-alto" },
      { day: 3, start: "15:40", end: "17:00", category: "feminino-alto" },

      // Sábado
      { day: 4, start: "09:00", end: "12:00", category: "avancado" },
    ] satisfies ScheduleSession[],
  },

  /** Planos do CT: turmas regulares (terça e quinta) e Alto Rendimento (aula experimental). */
  pricing: {
    eyebrow: "Planos",
    title: "Escolha sua turma",
    description:
      "Turmas regulares às terças e quintas para quem está começando ou evoluindo, e equipe de Alto Rendimento de terça a sábado para atletas de competição.",
    plans: [
      {
        name: "Iniciante, Escolinha & Intermediário",
        price: 200,
        period: "/mês",
        description: "Treinos de Terça e Quinta para Iniciante, Escolinha ou Intermediário.",
        highlight: "2x por semana",
        slots: [
          { time: "17:00 às 19:30", group: "Iniciante e Escolinha" },
          { time: "19:30 às 21:00", group: "Intermediário" },
        ],
        cta: {
          label: "Quero Treinar",
          href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20os%20treinos%20de%20Ter%C3%A7a%20e%20Quinta%20(Iniciante%20/%20Escolinha%20/%20Intermedi%C3%A1rio).",
        },
      },
      {
        name: "Alto Rendimento (Masculino & Feminino)",
        priceLabel: "Agende uma aula experimental",
        priceNote: "Venha treinar com a equipe e conhecer a comissão técnica.",
        description: "Preparação intensiva técnica, tática e física para atletas de competição no Masculino e Feminino.",
        highlight: "Terça a Sábado",
        featured: true,
        slots: [
          { time: "Terça a Sexta · 15:00 às 17:00", group: "Alto Rendimento Feminino & Masculino" },
          { time: "Sábado · 09:00 às 12:00", group: "Treino Avançado / Físico" },
        ],
        cta: {
          label: "Agendar aula experimental",
          href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20no%20treino%20de%20Alto%20Rendimento%20do%20PCVP.",
        },
      },
    ] satisfies PricingPlan[],
  },

  /**
   * Guias do time: reaproveita o layout de capas em degradê para informação
   * real do PCVP (como começar e quais são os programas de treino).
   * Não há e-book nem material pago: os CTAs levam ao WhatsApp e aos planos.
   */
  guides: {
    eyebrow: "Guias do time",
    title: "Tudo o que você precisa saber para começar a treinar no PCVP",
    items: [
      {
        kind: "Guia",
        badge: "Primeiro treino",
        title: "Como funciona a sua aula experimental",
        description:
          "Agende pelo WhatsApp, escolha a turma do seu nível e venha conhecer a rotina na areia com a comissão técnica. Traga roupa leve de treino, protetor solar e uma garrafa de água.",
        topics: ["Agendamento", "O que levar", "Turma ideal"],
        cta: {
          label: "Agendar aula experimental",
          href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PCVP%20e%20gostaria%20de%20agendar%20uma%20aula%20experimental.",
        },
      },
      {
        kind: "Programa",
        badge: "Programas de treino",
        title: "Da iniciação ao alto rendimento",
        description:
          "Iniciante e Escolinha às terças e quintas, turma Intermediária para quem já domina os fundamentos e equipe de Alto Rendimento Masculino e Feminino de terça a sábado.",
        topics: ["Iniciação & Escolinha", "Intermediário", "Alto Rendimento"],
        cta: { label: "Ver planos e horários", href: "#planos" },
      },
    ] satisfies TeamGuide[],
  },

  steps: {
    eyebrow: "Treinos",
    title: "Como treinamos",
    description: "Uma rotina pensada para evoluir técnica, físico e leitura de jogo, do iniciante ao competitivo.",
    items: [
      { title: "Aquecimento na areia", description: "Mobilidade, deslocamento e ativação para jogar sem lesão." },
      { title: "Fundamentos", description: "Saque, recepção, levantamento, ataque e bloqueio, com repetição e correção." },
      { title: "Jogo situacional", description: "Treinos de pontos reais em dupla para decisões rápidas sob pressão." },
      { title: "Competição", description: "Calendário de torneios para colocar tudo em prática." },
    ],
  },

  /** Seja um patrocinador / apoiador (antes do CTA final). */
  sponsorship: {
    eyebrow: "Patrocínio",
    title: "Seja um patrocinador / apoiador",
    description:
      "Investir no Paulo Coelho Vôlei de Praia é associar a sua marca a uma equipe vencedora, com visibilidade em competições estaduais e nacionais e forte engajamento nas redes sociais.",
    benefits: [
      "Exposição da marca em uniformes de jogo, treino e viagem em todo o Brasil.",
      "Presença nas publicações, vídeos e coberturas de etapas nas redes sociais oficiais.",
      "Impacto social direto no incentivo ao esporte e na formação de jovens atletas mato-grossenses.",
    ],
    cta: {
      label: "Quero patrocinar",
      href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PCVP%20e%20gostaria%20de%20conversar%20sobre%20patroc%C3%ADnio%20e%20parcerias.",
    },
  },

  cta: {
    title: "Vocês estão preparados para uma nova experiência no Vôlei de Praia?",
    description: "Treinos abertos para novos atletas. Mande uma mensagem e venha conhecer o time.",
    primary: { label: "Quero Treinar", href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PCVP%20e%20quero%20agendar%20um%20treino." },
    secondary: { label: "Seja patrocinador", href: "https://wa.me/5565999826809?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PCVP%20e%20gostaria%20de%20conversar%20sobre%20patroc%C3%ADnio%20e%20parcerias." },
  },

  footer: {
    columns: [
      {
        title: "Menu",
        links: [
          { label: "Início", href: "#inicio" },
          { label: "O time", href: "#time" },
          { label: "Treinos", href: "#treinos" },
        ],
      },
      {
        title: "Time",
        links: [
          { label: "Atletas", href: "#time" },
          { label: "Próximos jogos", href: "#time" },
          { label: "Patrocínio", href: "#patrocinio" },
        ],
      },
      {
        title: "Social",
        links: [
          { label: "Instagram", href: "https://www.instagram.com/paulocoelhovolei/" },
          { label: "YouTube", href: "#" },
          { label: "WhatsApp", href: "https://wa.me/5565999826809" },
        ],
      },
    ],
    copyright: "PCVP Vôlei de Praia",
    year: 2026,
  },
} as const;

export type SiteConfig = typeof siteConfig;
