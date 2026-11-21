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
}

const CTA = 'Faça sua cotação em 2 minutos pelo link da bio. 👆'
const TAGS = '#protecaoveicular #21go #citmax #natalrn #parnamirim #macaiba #carro #moto'
const cap = (text: string) => `${text}\n\n${CTA}\n\n${TAGS}`

export const SOCIAL_CONTENT: SocialContent[] = [
  { id: 'cotacao-online', kicker: 'Cotação online', title: 'Saiba o valor da sua proteção em 2 minutos', body: 'Informe a placa ou o modelo e veja os planos na hora, sem falar com ninguém.', caption: cap('Quer saber quanto custa proteger seu carro ou sua moto? No nosso site você informa a placa ou o modelo e vê os planos na hora.') },
  { id: 'sem-spc', kicker: 'Sem burocracia', title: 'Sem consulta ao SPC e Serasa', body: 'Nome negativado não impede você de proteger o seu veículo.', caption: cap('Na proteção veicular não fazemos consulta ao SPC e Serasa para a adesão. O que conta é o veículo.') },
  { id: 'sem-perfil', kicker: 'Mesmo valor para todos', title: 'Sem análise de perfil do condutor', body: 'Idade e tempo de habilitação não mudam a sua mensalidade.', caption: cap('Aqui não existe análise de perfil do condutor. A mensalidade depende do veículo e do plano escolhido.') },
  { id: 'roubo-furto', kicker: 'Cobertura', title: 'Proteção contra roubo e furto', body: 'Coberturas conforme o plano contratado e o regulamento.', caption: cap('Roubo e furto estão entre as coberturas dos nossos planos, conforme o plano contratado e o regulamento da associação.') },
  { id: 'colisao', kicker: 'Cobertura', title: 'Bateu? Você não fica sozinho', body: 'Planos com cobertura de colisão, conforme o regulamento.', caption: cap('Imprevistos acontecem. Nossos planos incluem cobertura de colisão, conforme o plano contratado e o regulamento.') },
  { id: 'assistencia-24h', kicker: 'Assistência 24h', title: 'Guincho, chaveiro e socorro a qualquer hora', body: 'Atendimento em todo o Brasil, 24 horas por dia.', caption: cap('Pane, pneu furado ou chave trancada dentro do carro: a assistência 24h atende em todo o Brasil, conforme o plano.') },
  { id: 'vistoria-celular', kicker: 'Tudo pelo celular', title: 'Vistoria digital, sem sair de casa', body: 'Você envia os documentos e as fotos do veículo pelo nosso site.', caption: cap('A vistoria é digital: você envia os documentos e as fotos do veículo pelo celular, direto no nosso site.') },
  { id: 'app-taxi', kicker: 'Motorista de aplicativo', title: 'Trabalha com o carro? Temos proteção', body: 'Aceitamos veículos de aplicativo e táxi. Informe na cotação.', caption: cap('Veículo de aplicativo ou táxi também pode ser protegido. É só marcar essa opção na hora da cotação.') },
  { id: 'motos', kicker: 'Para motos', title: 'Sua moto também merece proteção', body: 'Planos para motos com cotação online na hora.', caption: cap('Tem moto? Faça a cotação online e veja os planos disponíveis para o seu modelo.') },
  { id: 'como-funciona', kicker: 'Como funciona', title: 'Proteção veicular é mutualismo', body: 'Os associados dividem os custos dos eventos do grupo. Não é seguro.', caption: cap('Proteção veicular funciona por mutualismo: os associados contribuem para um fundo que cobre os eventos do grupo. Não é seguro e não é vendida por seguradora.') },
  { id: 'pix-adesao', kicker: 'Adesão simples', title: 'Adesão online com pagamento por Pix', body: 'Cotação, cadastro e pagamento da adesão no mesmo lugar.', caption: cap('Você faz a cotação, o cadastro e paga a adesão por Pix, tudo pelo site. Depois é só enviar a vistoria.') },
  { id: 'atendimento', kicker: 'Fale com a gente', title: 'Dúvidas? Atendimento pelo WhatsApp', body: 'Nossa equipe em Natal e região responde você.', caption: cap('Ficou com dúvida sobre planos ou coberturas? Chame a nossa equipe no WhatsApp pelo link da bio.') },
  { id: 'carro-antigo', kicker: 'Carro com mais idade', title: 'Seu carro não é novo? Faça a cotação', body: 'Veja na hora se o seu modelo e ano são aceitos.', caption: cap('Muita gente acha que carro mais antigo não tem proteção. Faça a cotação e veja na hora se o seu modelo e ano são aceitos.') },
  { id: 'regiao', kicker: 'Grande Natal', title: 'Atendemos Natal, Parnamirim e Macaíba', body: 'E a assistência 24h vale em todo o Brasil.', caption: cap('Somos a franquia CITmax da 21Go na Grande Natal. A assistência 24h acompanha você em todo o Brasil, conforme o plano.') },
]

export function contentById(id: string): SocialContent | undefined {
  return SOCIAL_CONTENT.find((c) => c.id === id)
}
