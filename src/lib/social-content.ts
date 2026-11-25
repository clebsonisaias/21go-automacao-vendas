// Banco de posts do Instagram (@citmax.21go). Um por dia, em rodízio.
// Regra de conteúdo: só afirmar o que o site já afirma. Proteção veicular não é seguro;
// coberturas e valores dependem do plano e do regulamento, por isso não há preço nem promessa aqui.

export interface SocialContent {
  id: string
  /** Chamada curta no topo da arte. */
  kicker: string
  /** Frase principal da arte (até ~70 caracteres). */
  title: string
  /** Complemento na arte (até ~110 caracteres). */
  body: string
  caption: string
  /** Post avulso: fica fora do rodízio diário. */
  oneOff?: boolean
  /*
   * Campos do modelo de arte (src/lib/arte-instagram.tsx, padrão de docs/MANUAL_ARTES_INSTAGRAM.md).
   * Só valem para post sem arte pronta em public/social/<feed|story>/<id>.jpg.
   */
  /** Etiqueta (pílula) do topo, com o tema: COTAÇÃO GRÁTIS, PASSO A PASSO… Sem ela, vale o kicker. */
  etiqueta?: string
  /** Trecho do título (1 a 3 palavras) que fica em laranja. */
  destaque?: string
  /** Fundo da arte; sem ele, alterna pelos três. */
  fundo?: 'marinho' | 'laranja' | 'claro'
  /** Subtítulo da arte; sem ele, vale o body. */
  subtitulo?: string
  /** Um recurso só no meio: cards (até 5), o carro ou uma foto própria de public/social/fotos/. */
  miolo?:
    | { tipo: 'cards'; cards: { titulo: string; texto?: string }[]; numerados?: boolean }
    | { tipo: 'carro' }
    | { tipo: 'foto'; arquivo: string }
  /** Observação de 28 px abaixo do miolo (ex.: "As coberturas variam conforme o plano."). */
  observacao?: string
  /** Texto do botão, com verbo. Padrão: "Cote pela placa". */
  botao?: string
}

// Sem tempo em minutos: o manual não aceita estatística sem fonte.
export const CTA = 'Faça sua cotação grátis pela placa, no link da bio. 👆'
export const TAGS = '#protecaoveicular #21go #citmax #natalrn #parnamirim #macaiba #carro #moto'
const cap = (text: string) => `${text}\n\n${CTA}\n\n${TAGS}`

export const SOCIAL_CONTENT: SocialContent[] = [
  {
    id: 'cotacao-online',
    kicker: 'Cotação online',
    etiqueta: 'COTAÇÃO GRÁTIS',
    title: 'Quanto custa proteger o seu veículo?',
    destaque: 'seu veículo',
    body: 'O valor sai na hora, pela placa. Sem compromisso e sem sair de casa.',
    fundo: 'marinho',
    miolo: { tipo: 'carro' },
    caption: cap('Quer saber quanto custa proteger seu carro ou sua moto? No nosso site você informa a placa e vê os planos na hora.'),
  },
  {
    id: 'sem-spc',
    kicker: 'Sem burocracia',
    etiqueta: 'SEM BUROCRACIA',
    title: 'Sem consulta ao SPC e Serasa',
    destaque: 'SPC e Serasa',
    body: 'Nome negativado não impede você de proteger o seu veículo.',
    fundo: 'laranja',
    miolo: {
      tipo: 'cards',
      cards: [
        { titulo: 'Nome com restrição não impede', texto: 'A adesão não passa por consulta de crédito.' },
        { titulo: 'O que conta é o veículo', texto: 'Cotação pela placa, no site.' },
      ],
    },
    caption: cap('Na proteção veicular não fazemos consulta ao SPC e Serasa para a adesão. O que conta é o veículo.'),
  },
  {
    id: 'sem-perfil',
    kicker: 'Mesmo valor para todos',
    etiqueta: 'MESMO VALOR PARA TODOS',
    title: 'Sem análise de perfil do condutor',
    destaque: 'perfil do condutor',
    body: 'Idade e tempo de habilitação não mudam a sua mensalidade.',
    fundo: 'claro',
    miolo: {
      tipo: 'cards',
      cards: [
        { titulo: 'Idade não muda o valor' },
        { titulo: 'Tempo de habilitação também não' },
        { titulo: 'O valor depende do veículo', texto: 'E do plano que você escolher.' },
      ],
    },
    caption: cap('Aqui não existe análise de perfil do condutor. A mensalidade depende do veículo e do plano escolhido.'),
  },
  {
    id: 'roubo-furto',
    kicker: 'Cobertura',
    etiqueta: 'COBERTURAS',
    title: 'Proteção contra roubo e furto',
    destaque: 'roubo e furto',
    body: 'Uma das coberturas dos planos da 21Go.',
    fundo: 'marinho',
    miolo: { tipo: 'carro' },
    observacao: 'As coberturas variam conforme o plano.',
    caption: cap('Roubo e furto estão entre as coberturas dos nossos planos, conforme o plano contratado e o regulamento da associação.'),
  },
  {
    id: 'colisao',
    kicker: 'Cobertura',
    etiqueta: 'COBERTURAS',
    title: 'Bateu? Você não fica sozinho',
    destaque: 'não fica sozinho',
    body: 'Planos com cobertura de colisão e assistência 24h.',
    fundo: 'laranja',
    miolo: {
      tipo: 'cards',
      cards: [
        { titulo: 'Colisão', texto: 'Batidas e acidentes de trânsito.' },
        { titulo: 'Assistência 24h', texto: 'Guincho e socorro em todo o Brasil.' },
      ],
    },
    observacao: 'As coberturas variam conforme o plano.',
    caption: cap('Imprevistos acontecem. Nossos planos incluem cobertura de colisão, conforme o plano contratado e o regulamento.'),
  },
  {
    id: 'assistencia-24h',
    kicker: 'Assistência 24h',
    etiqueta: 'ASSISTÊNCIA 24H',
    title: 'Guincho, chaveiro e socorro a qualquer hora',
    destaque: 'qualquer hora',
    body: 'Atendimento em todo o Brasil, 24 horas por dia.',
    fundo: 'claro',
    miolo: {
      tipo: 'cards',
      cards: [{ titulo: 'Guincho' }, { titulo: 'Chaveiro' }, { titulo: 'Pane e pneu furado' }],
    },
    observacao: 'As coberturas variam conforme o plano.',
    caption: cap('Pane, pneu furado ou chave trancada dentro do carro: a assistência 24h atende em todo o Brasil, conforme o plano.'),
  },
  {
    id: 'vistoria-celular',
    kicker: 'Tudo pelo celular',
    etiqueta: 'TUDO PELO CELULAR',
    title: 'Vistoria digital, sem sair de casa',
    destaque: 'Vistoria digital',
    body: 'Você envia os documentos e as fotos do veículo pelo celular.',
    fundo: 'marinho',
    miolo: {
      tipo: 'cards',
      numerados: true,
      cards: [
        { titulo: 'Documentos', texto: 'CNH, documento do carro e comprovante.' },
        { titulo: 'Fotos do veículo', texto: 'Pelo link que chega no WhatsApp.' },
      ],
    },
    caption: cap('A vistoria é digital: você envia os documentos e as fotos do veículo pelo celular, sem sair de casa.'),
  },
  {
    id: 'app-taxi',
    kicker: 'Motorista de aplicativo',
    etiqueta: 'MOTORISTA DE APLICATIVO',
    title: 'Trabalha com o carro? Temos proteção',
    destaque: 'Temos proteção',
    body: 'Aceitamos veículos de aplicativo e táxi. Informe na cotação.',
    fundo: 'laranja',
    miolo: { tipo: 'carro' },
    caption: cap('Veículo de aplicativo ou táxi também pode ser protegido. É só marcar essa opção na hora da cotação.'),
  },
  {
    id: 'motos',
    kicker: 'Para motos',
    etiqueta: 'PARA MOTOS',
    title: 'Sua moto também merece proteção',
    destaque: 'moto',
    body: 'Planos para motos, com cotação pela placa.',
    fundo: 'claro',
    miolo: {
      tipo: 'cards',
      cards: [
        { titulo: 'Cotação pela placa', texto: 'Os planos aparecem na hora.' },
        { titulo: 'Tudo pelo celular', texto: 'Sem sair de casa.' },
      ],
    },
    caption: cap('Tem moto? Faça a cotação pela placa e veja os planos disponíveis para ela.'),
  },
  {
    id: 'como-funciona',
    kicker: 'Como funciona',
    etiqueta: 'COMO FUNCIONA',
    title: 'Proteção veicular é mutualismo',
    destaque: 'mutualismo',
    body: 'Os associados dividem os custos dos eventos do grupo.',
    fundo: 'marinho',
    miolo: {
      tipo: 'cards',
      cards: [
        { titulo: 'Os associados contribuem', texto: 'Para um fundo comum do grupo.' },
        { titulo: 'O fundo cobre os eventos', texto: 'Conforme o plano e o regulamento.' },
      ],
    },
    caption: cap('Proteção veicular funciona por mutualismo: os associados contribuem para um fundo que cobre os eventos do grupo. Não é seguro e não é vendida por seguradora.'),
  },
  {
    id: 'pix-adesao',
    kicker: 'Adesão simples',
    etiqueta: 'PASSO A PASSO',
    title: 'Adesão online com pagamento por Pix',
    destaque: 'por Pix',
    body: 'Tudo pelo celular. A adesão é o último passo.',
    fundo: 'laranja',
    miolo: {
      tipo: 'cards',
      numerados: true,
      cards: [
        { titulo: 'Cotação pela placa' },
        { titulo: 'Documentos pelo celular' },
        { titulo: 'Vistoria pelas fotos' },
        { titulo: 'Adesão por Pix' },
      ],
    },
    caption: cap('Você faz a cotação, o cadastro e a vistoria pelo celular. A adesão é paga por Pix no fim, depois da vistoria aprovada.'),
  },
  {
    id: 'atendimento',
    kicker: 'Fale com a gente',
    etiqueta: 'DÚVIDA FREQUENTE',
    title: 'Dúvidas? Atendimento pelo WhatsApp',
    destaque: 'pelo WhatsApp',
    body: 'Cotação, cadastro e situação do seu cadastro na conversa.',
    fundo: 'claro',
    botao: 'Link na bio',
    miolo: {
      tipo: 'cards',
      cards: [{ titulo: 'Cotação e planos' }, { titulo: 'Documentos e vistoria' }, { titulo: 'Pagamento da adesão' }],
    },
    caption: cap('Ficou com dúvida sobre planos ou coberturas? Chame no WhatsApp pelo link da bio.'),
  },
  {
    id: 'carro-antigo',
    kicker: 'Carro com mais idade',
    etiqueta: 'COTAÇÃO GRÁTIS',
    title: 'Seu carro não é novo? Faça a cotação',
    destaque: 'Faça a cotação',
    body: 'Veja na hora se o seu veículo é aceito.',
    fundo: 'marinho',
    miolo: { tipo: 'carro' },
    caption: cap('Muita gente acha que carro mais antigo não tem proteção. Faça a cotação e veja na hora se o seu veículo é aceito.'),
  },
  {
    id: 'regiao',
    kicker: 'Grande Natal',
    etiqueta: 'GRUPO CITMAX · 21GO',
    title: 'Atendemos Natal, Parnamirim e Macaíba',
    destaque: 'Parnamirim e Macaíba',
    body: 'E a assistência 24h vale em todo o Brasil.',
    fundo: 'laranja',
    miolo: {
      tipo: 'cards',
      cards: [
        { titulo: 'Atendimento na Grande Natal' },
        { titulo: 'Assistência 24h em todo o Brasil', texto: 'Conforme o plano.' },
      ],
    },
    caption: cap('Somos a franquia CITmax da 21Go na Grande Natal. A assistência 24h acompanha você em todo o Brasil, conforme o plano.'),
  },
]

// Posts oficiais com arte pronta (Feed + Story) e dia/hora marcados (horário de Natal/RN).
// Segunda, quarta e sexta — 25/11 a 30/12/2026. Toda arte sai no feed e no story no mesmo dia.
export const SOCIAL_ONE_OFFS: SocialContent[] = [
  {
    id: 'inauguracao-rn',
    oneOff: true,
    kicker: 'Inauguração · 21/11',
    title: 'Chegamos ao Rio Grande do Norte',
    body: 'A proteção veicular da 21Go agora tem atendimento potiguar, com o Grupo CITmax.',
    caption:
      'Chegamos ao Rio Grande do Norte! 🧡\nA partir de hoje, a proteção veicular da 21Go tem atendimento potiguar, com o Grupo CITmax.\nCarro ou moto, a cotação é grátis e sai pela placa.\n👉 Link na bio ou www.21go.seg.br\n\n#21Go #ProteçãoVeicular #RioGrandeDoNorte #Natal #RN #GrupoCITmax',
  },
  {
    id: '23-11-protecao-sem-complicacao',
    oneOff: true,
    kicker: '23/11 (seg) · Feed + Story',
    title: 'Proteção veicular sem complicação',
    body: 'Tudo resolvido pelo celular, sem sair de casa.',
    caption: cap('Proteger o seu veículo não precisa ser complicado. Na 21Go você faz a cotação pela placa em minutos, sem consulta ao SPC ou Serasa, sem análise de perfil de condutor e com assistência 24h em todo o Brasil (as coberturas variam conforme o plano).'),
  },
  {
    id: '25-11-quem-esta-por-tras',
    oneOff: true,
    kicker: '25/11 (qua) · Feed + Story',
    title: 'Quem está por trás (foto da equipe)',
    body: 'Atendimento local no Rio Grande do Norte com o Grupo CITmax.',
    caption: cap('Por trás da 21Go no Rio Grande do Norte existe gente de verdade, pronta para atender você com a estrutura e a confiança do Grupo CITmax. Conheça nossa equipe!'),
  },
  {
    id: '27-11-capa-reels-30s',
    oneOff: true,
    kicker: '27/11 (sex) · Feed + Story',
    title: 'Da placa ao preço em 30s',
    body: 'Digite a placa do seu veículo e veja os planos na hora, sem burocracia.',
    caption: cap('Da placa ao preço em 30 segundos! Sem formulário gigante e sem espera: você informa a placa do seu carro ou moto e já vê os planos disponíveis na hora.'),
  },
  {
    id: '30-11-seguradora-disse-nao',
    oneOff: true,
    kicker: '30/11 (seg) · Feed + Story',
    title: 'A seguradora disse não? A 21Go diz sim',
    body: 'Sem consulta ao SPC/Serasa e sem análise de perfil do condutor.',
    caption: cap('A seguradora recusou ou cobrou caro demais pelo seu veículo? Na proteção veicular 21Go não tem análise de perfil de condutor nem consulta ao SPC/Serasa. Faça sua cotação!'),
  },
  {
    id: '02-12-como-funciona-pelo-celular',
    oneOff: true,
    kicker: '02/12 (qua) · Feed + Story',
    title: 'Vistoria pelo celular, sem sair de casa',
    body: 'Cotação, envio de documentos e vistoria 100% digitais pelo celular.',
    caption: cap('Tudo resolvido direto pelo celular, sem sair de casa! Você faz a cotação pela placa, envia os documentos e faz a vistoria digital com praticidade e rapidez.'),
  },
  {
    id: '04-12-cotacao-gratis-pela-placa',
    oneOff: true,
    kicker: '04/12 (sex) · Feed + Story',
    title: 'Quanto custa proteger o seu veículo?',
    body: 'Cotação grátis pela placa em menos de 2 minutos.',
    caption: cap('Quer saber quanto custa proteger o seu veículo sem compromisso? A cotação pela placa é 100% grátis e sai na hora no nosso site ou pelo WhatsApp.'),
  },
  {
    id: '07-12-seu-nome-nao-importa',
    oneOff: true,
    kicker: '07/12 (seg) · Feed + Story',
    title: 'Seu nome não importa. Seu carro importa',
    body: 'Sem consulta ao SPC e Serasa para a adesão.',
    caption: cap('Aqui o que importa é proteger o seu patrimônio. Na 21Go não fazemos consulta ao SPC ou Serasa para adesão — confira os planos disponíveis para o seu veículo.'),
  },
  {
    id: '09-12-motorista-de-aplicativo',
    oneOff: true,
    kicker: '09/12 (qua) · Feed + Story',
    title: 'Sou motorista de aplicativo. Posso contratar?',
    body: 'Proteção veicular também para quem roda na Uber, 99 e aplicativos.',
    caption: cap('Trabalha com Uber, 99 ou outro aplicativo? Seu carro é sua ferramenta de trabalho e pode rodar protegido com a 21Go! É só marcar uso em aplicativo na hora da cotação.'),
  },
  {
    id: '11-12-ferias-na-estrada',
    oneOff: true,
    kicker: '11/12 (sex) · Feed + Story',
    title: 'Vai pegar estrada? Guincho e assistência 24h',
    body: 'Viaje tranquilo com assistência 24h em todo o Brasil.',
    caption: cap('Vai pegar estrada neste fim de ano? Conte com guincho, socorro mecânico, chaveiro e assistência 24h em todo o Brasil, conforme o plano escolhido.'),
  },
  {
    id: '14-12-posso-cancelar',
    oneOff: true,
    kicker: '14/12 (seg) · Feed + Story',
    title: 'Posso cancelar quando quiser?',
    body: 'Transparência e regras claras no regulamento da associação.',
    caption: cap('Sem letras miúdas: transparência total do início ao fim. Tire suas dúvidas sobre planos, coberturas e regulamento direto no nosso site ou pelo WhatsApp.'),
  },
  {
    id: '16-12-chuva-forte',
    oneOff: true,
    kicker: '16/12 (qua) · Feed + Story',
    title: 'Chuva forte: o que está coberto',
    body: 'Planos com cobertura para eventos da natureza, conforme o regulamento.',
    caption: cap('Chuva forte e alagamento pegam qualquer um de surpresa. Conheça os nossos planos com cobertura para danos da natureza, conforme o plano contratado e o regulamento.'),
  },
  {
    id: '18-12-moto',
    oneOff: true,
    kicker: '18/12 (sex) · Feed + Story',
    title: 'Qualquer moto tem vez',
    body: 'Planos completos para proteger a sua moto no dia a dia.',
    caption: cap('Anda de moto no trabalho ou no dia a dia? A 21Go também tem proteção para a sua moto! Informe a placa no nosso site e veja os planos disponíveis na hora.'),
  },
  {
    id: '21-12-assistencia-24h',
    oneOff: true,
    kicker: '21/12 (seg) · Feed + Story',
    title: 'Assistência 24h: o que está incluso',
    body: 'Guincho, pane elétrica/mecânica, chaveiro e troca de pneu 24 horas.',
    caption: cap('Pneu furado, pane seca, bateria descarregada ou guincho de madrugada? A assistência 24h da 21Go acompanha você em todo o Brasil, conforme o plano contratado.'),
  },
  {
    id: '23-12-o-que-a-protecao-cobre',
    oneOff: true,
    kicker: '23/12 (qua) · Feed + Story',
    title: 'O que a proteção veicular cobre?',
    body: 'Roubo, furto, colisão, incêndio, terceiros e muito mais conforme o plano.',
    caption: cap('Roubo, furto, colisão, incêndio, danos a terceiros e assistência 24h: compare os 4 planos da 21Go e escolha a proteção ideal para o seu veículo.'),
  },
  {
    id: '25-12-feliz-natal',
    oneOff: true,
    kicker: '25/12 (sex) · Feed + Story',
    title: 'Feliz Natal',
    body: 'A equipe 21Go · Grupo CITmax deseja um Natal de paz e tranquilidade.',
    caption: 'A equipe 21Go · Grupo CITmax deseja um Feliz Natal cheio de paz, saúde e viagens tranquilas para você e sua família! 🎄🧡\n\n#FelizNatal #21Go #GrupoCITmax #NatalRN #ProteçãoVeicular',
  },
  {
    id: '28-12-4-passos',
    oneOff: true,
    kicker: '28/12 (seg) · Feed + Story',
    title: 'Proteja o seu veículo em 4 passos',
    body: '1. Cotação pela placa · 2. Documentos · 3. Vistoria no celular · 4. Adesão via Pix.',
    caption: cap('Proteger seu carro ou sua moto é simples em 4 passos: cotação pela placa, envio dos documentos, vistoria pelo celular e adesão via Pix só depois da vistoria aprovada!'),
  },
  {
    id: '30-12-ano-novo-protegido',
    oneOff: true,
    kicker: '30/12 (qua) · Feed + Story',
    title: 'Comece o ano novo protegido',
    body: 'Entre em 2027 com seu carro ou moto protegido pela 21Go.',
    caption: cap('Que o novo ano comece com tranquilidade na estrada! Faça sua cotação grátis pela placa e entre em 2027 com o seu veículo protegido pela 21Go · Grupo CITmax. ✨'),
  },
]

export const SOCIAL_SCHEDULE: { contentId: string; at: string }[] = [
  { contentId: 'inauguracao-rn', at: '2026-11-21T11:50:00-03:00' },
  { contentId: '25-11-quem-esta-por-tras', at: '2026-11-25T18:00:00-03:00' },
  { contentId: '27-11-capa-reels-30s', at: '2026-11-27T18:00:00-03:00' },
  { contentId: '30-11-seguradora-disse-nao', at: '2026-11-30T18:00:00-03:00' },
  { contentId: '02-12-como-funciona-pelo-celular', at: '2026-12-02T18:00:00-03:00' },
  { contentId: '04-12-cotacao-gratis-pela-placa', at: '2026-12-04T18:00:00-03:00' },
  { contentId: '07-12-seu-nome-nao-importa', at: '2026-12-07T18:00:00-03:00' },
  { contentId: '09-12-motorista-de-aplicativo', at: '2026-12-09T18:00:00-03:00' },
  { contentId: '11-12-ferias-na-estrada', at: '2026-12-11T18:00:00-03:00' },
  { contentId: '14-12-posso-cancelar', at: '2026-12-14T18:00:00-03:00' },
  { contentId: '16-12-chuva-forte', at: '2026-12-16T18:00:00-03:00' },
  { contentId: '18-12-moto', at: '2026-12-18T18:00:00-03:00' },
  { contentId: '21-12-assistencia-24h', at: '2026-12-21T18:00:00-03:00' },
  { contentId: '23-12-o-que-a-protecao-cobre', at: '2026-12-23T18:00:00-03:00' },
  { contentId: '25-12-feliz-natal', at: '2026-12-25T18:00:00-03:00' },
  { contentId: '28-12-4-passos', at: '2026-12-28T18:00:00-03:00' },
  { contentId: '30-12-ano-novo-protegido', at: '2026-12-30T18:00:00-03:00' },
]

export function contentById(id: string): SocialContent | undefined {
  return SOCIAL_CONTENT.find((c) => c.id === id) || SOCIAL_ONE_OFFS.find((c) => c.id === id)
}
