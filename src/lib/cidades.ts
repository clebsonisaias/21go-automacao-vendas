/**
 * Páginas por cidade (`/protecao-veicular/[cidade]`, Frente 2b do plano "aparecer no Google").
 *
 * Regras (programmatic SEO sem página fina, skill `programmatic-seo`):
 * - cada cidade tem texto próprio (introdução, rotina e perguntas), não só o nome trocado;
 * - só fatos que dá para conferir: estado, DDD, região, vizinhas e as regras da 21Go que valem lá;
 * - nada de estatística, preço, bairro, oficina ou atendimento presencial inventado;
 * - nada de "seguro" (proteção veicular não é seguro).
 *
 * Só dados e funções puras: roda no teste com `node --test`.
 */

export type UfCidade = 'RN' | 'PB' | 'CE'

export interface PerguntaCidade {
  p: string
  r: string
}

export interface CidadeSeo {
  slug: string
  nome: string
  uf: UfCidade
  ddd: string
  /** Região do estado (como o IBGE e o uso comum chamam). */
  regiao: string
  /** Slugs de outras cidades da lista, para os links "perto de você". */
  vizinhas: string[]
  intro: string[]
  rotina: string
  faqs: PerguntaCidade[]
  publicada: boolean
  revisadoEm: string
}

export const NOME_UF: Record<UfCidade, string> = { RN: 'Rio Grande do Norte', PB: 'Paraíba', CE: 'Ceará' }
const NO_UF: Record<UfCidade, string> = { RN: 'no Rio Grande do Norte', PB: 'na Paraíba', CE: 'no Ceará' }

export function noEstado(uf: UfCidade): string {
  return NO_UF[uf]
}

export const CIDADES: CidadeSeo[] = [
  {
    slug: 'natal-rn',
    nome: 'Natal',
    uf: 'RN',
    ddd: '84',
    regiao: 'Região Metropolitana de Natal',
    vizinhas: ['parnamirim-rn', 'sao-goncalo-do-amarante-rn', 'macaiba-rn', 'ceara-mirim-rn'],
    intro: [
      'Em Natal, a cotação da proteção veicular 21Go é feita pela placa, no próprio site, e mostra na hora os planos para o seu carro ou a sua moto.',
      'A CITmax, consultor autorizado da 21Go, atende a capital potiguar pelo WhatsApp com DDD 84: o cadastro, os documentos e a vistoria são feitos pelo celular, sem precisar ir a um escritório.',
    ],
    rotina:
      'Quem roda todo dia entre as zonas da cidade, a orla e as saídas pela BR-101 precisa de guincho e de assistência 24h que funcionem na hora. Na 21Go, a assistência atende em todo o Brasil, então vale também para quem sai de Natal para o interior ou para outro estado.',
    faqs: [
      {
        p: 'A tabela regional vale para quem mora em Natal?',
        r: 'Sim. Natal fica no Rio Grande do Norte, um dos estados da tabela regional da 21Go. Para carro, o plano VIP sai pela tabela regional, em promoção, até o limite de valor da tabela; acima dele, vale o preço nacional. O comprovante de residência confirma o estado.',
      },
      {
        p: 'Preciso levar o carro a algum lugar em Natal para a vistoria?',
        r: 'Não. A vistoria é por fotos no celular, pelo link que chega no WhatsApp. Só alguns modelos específicos pedem vistoria presencial, e a cotação avisa quando é o caso.',
      },
      {
        p: 'Motorista de aplicativo em Natal pode contratar?',
        r: 'Pode. Carro de aplicativo (Uber, 99) entra sem mudar o valor nem a indenização, que é de 100% da Tabela FIPE. E não há consulta ao SPC/Serasa.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'parnamirim-rn',
    nome: 'Parnamirim',
    uf: 'RN',
    ddd: '84',
    regiao: 'Região Metropolitana de Natal',
    vizinhas: ['natal-rn', 'macaiba-rn', 'sao-goncalo-do-amarante-rn'],
    intro: [
      'Para quem mora em Parnamirim, a proteção veicular 21Go se contrata sem sair de casa: a cotação é pela placa, no site, e o restante segue pelo WhatsApp.',
      'Parnamirim faz parte da Grande Natal e tem o mesmo atendimento da CITmax, consultor autorizado da 21Go, com DDD 84.',
    ],
    rotina:
      'Muita gente de Parnamirim trabalha ou estuda em Natal e passa todos os dias pela BR-101. Para esse vaivém, contam o guincho, a troca de pneu e o socorro em pane, que fazem parte da assistência 24h de todos os planos.',
    faqs: [
      {
        p: 'Moro em Parnamirim: entro na tabela regional do RN?',
        r: 'Sim. A tabela regional vale para quem mora no Rio Grande do Norte, e o comprovante de residência em Parnamirim confirma isso. Para carro, o destaque é o plano VIP em promoção.',
      },
      {
        p: 'O atendimento é o mesmo de Natal?',
        r: 'É. A cotação, o cadastro, os documentos e a vistoria são online e iguais para toda a Grande Natal.',
      },
      {
        p: 'Quando a proteção começa a valer?',
        r: 'Com a vistoria aprovada e a adesão paga, roubo e furto ficam protegidos na hora. Reboque, assistência 24h, colisão e fenômenos da natureza liberam em 72 horas úteis. Não existe carência de 90 dias.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'mossoro-rn',
    nome: 'Mossoró',
    uf: 'RN',
    ddd: '84',
    regiao: 'Oeste Potiguar',
    vizinhas: ['caico-rn', 'natal-rn'],
    intro: [
      'Em Mossoró, a maior cidade do Oeste Potiguar, dá para cotar a proteção veicular 21Go pela placa e fazer todo o resto pelo celular.',
      'O atendimento é da CITmax, consultor autorizado da 21Go, pelo WhatsApp com DDD 84, o mesmo de todo o Rio Grande do Norte.',
    ],
    rotina:
      'Quem sai de Mossoró pela BR-304 rumo a Natal ou ao Ceará faz estrada longa. Por isso os planos variam no alcance do guincho: dos 200 km do Básico aos 1.400 km do Premium, com assistência em todo o país.',
    faqs: [
      {
        p: 'Mossoró entra na tabela regional?',
        r: 'Entra. A tabela regional vale para todo o Rio Grande do Norte, não só para a Grande Natal. Para carro, o plano VIP sai pela tabela regional, em promoção.',
      },
      {
        p: 'Preciso viajar até Natal para contratar?',
        r: 'Não. A cotação, os documentos e a vistoria são feitos online, de Mossoró mesmo.',
      },
      {
        p: 'O guincho atende fora do RN?',
        r: 'Sim. A assistência 24h e o guincho funcionam em todo o território nacional, dentro do limite de quilômetros do plano escolhido.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'sao-goncalo-do-amarante-rn',
    nome: 'São Gonçalo do Amarante',
    uf: 'RN',
    ddd: '84',
    regiao: 'Região Metropolitana de Natal',
    vizinhas: ['natal-rn', 'macaiba-rn', 'ceara-mirim-rn', 'parnamirim-rn'],
    intro: [
      'São Gonçalo do Amarante, na Grande Natal, tem a mesma cotação online da proteção veicular 21Go: digite a placa e veja os planos.',
      'A CITmax, consultor autorizado da 21Go, faz o atendimento pelo WhatsApp com DDD 84, e a vistoria é por fotos no celular.',
    ],
    rotina:
      'A cidade, que abriga o aeroporto que atende Natal, tem muito movimento de carros e motos indo e voltando da capital. Para o dia a dia, a assistência 24h cobre chaveiro, troca de pneu, pane seca e pane elétrica.',
    faqs: [
      {
        p: 'Quem mora em São Gonçalo do Amarante paga a tabela regional?',
        r: 'Sim, para carro: a cidade fica no Rio Grande do Norte, e o plano VIP sai pela tabela regional, em promoção. O comprovante de residência confirma o estado.',
      },
      {
        p: 'Dá para proteger moto?',
        r: 'Dá, motos de 2006 em diante, com cota de participação de 15% da FIPE no conserto. A promoção do VIP pela tabela regional vale só para carro.',
      },
      {
        p: 'Carro financiado pode entrar?',
        r: 'Pode. Na perda total, a 21Go paga 100% da Tabela FIPE e abate o que falta do financiamento.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'macaiba-rn',
    nome: 'Macaíba',
    uf: 'RN',
    ddd: '84',
    regiao: 'Região Metropolitana de Natal',
    vizinhas: ['natal-rn', 'sao-goncalo-do-amarante-rn', 'parnamirim-rn'],
    intro: [
      'Em Macaíba, a proteção veicular 21Go começa com a cotação pela placa no site, com os valores na hora.',
      'O atendimento da CITmax, consultor autorizado da 21Go, é pelo WhatsApp com DDD 84, como em toda a Grande Natal.',
    ],
    rotina:
      'Quem mora em Macaíba e se desloca até Natal pela BR-304 ou pelas estradas da região usa o carro ou a moto todos os dias. Na batida, a 21Go paga o conserto direto à oficina e você paga só a cota de participação; em roubo, furto ou perda total, a indenização é de 100% da Tabela FIPE.',
    faqs: [
      {
        p: 'Macaíba entra na tabela regional da 21Go?',
        r: 'Sim. A tabela regional vale para quem mora no Rio Grande do Norte. Para carro, o plano VIP sai em promoção até o limite de valor da tabela.',
      },
      {
        p: 'Carro mais antigo pode ter proteção?',
        r: 'Pode, se for de 2006 em diante. A cotação pela placa diz na hora quais planos valem para o seu veículo.',
      },
      {
        p: 'Como mando os documentos?',
        r: 'Pelo link do site ou pelo WhatsApp, de preferência em PDF: CNH ou identidade, o documento do veículo (CRLV de 2023 em diante, mesmo atrasado) e um comprovante de residência no seu nome.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'caico-rn',
    nome: 'Caicó',
    uf: 'RN',
    ddd: '84',
    regiao: 'Seridó',
    vizinhas: ['mossoro-rn', 'natal-rn'],
    intro: [
      'Caicó, no Seridó potiguar, tem a cotação da proteção veicular 21Go pela placa, com o resultado na tela em poucos segundos.',
      'Todo o atendimento da CITmax, consultor autorizado da 21Go, é a distância: WhatsApp com DDD 84 e vistoria pelo celular.',
    ],
    rotina:
      'No Seridó, as distâncias até a capital são grandes e boa parte dos trajetos é por estrada. Guincho com alcance maior e carro reserva (7 dias no VIP em roubo e furto, 15 dias no Premium) fazem diferença para quem não pode ficar parado.',
    faqs: [
      {
        p: 'Quem mora em Caicó tem a tabela regional?',
        r: 'Tem. A tabela regional vale em todo o Rio Grande do Norte, inclusive no Seridó. Para carro, o plano VIP sai em promoção.',
      },
      {
        p: 'Preciso ir a Natal para a vistoria?',
        r: 'Não. A vistoria é por fotos no celular. Só alguns modelos pedem vistoria presencial, e a cotação avisa quando é o caso.',
      },
      {
        p: 'Os planos têm carro reserva?',
        r: 'O VIP tem 7 dias de carro reserva em caso de roubo ou furto, e o Premium tem 15 dias. O Básico e o Do Seu Jeito não têm.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'ceara-mirim-rn',
    nome: 'Ceará-Mirim',
    uf: 'RN',
    ddd: '84',
    regiao: 'Região Metropolitana de Natal',
    vizinhas: ['natal-rn', 'sao-goncalo-do-amarante-rn'],
    intro: [
      'Apesar do nome, Ceará-Mirim fica no Rio Grande do Norte, na Grande Natal, e tem a cotação da proteção veicular 21Go pela placa, no site.',
      'O atendimento é da CITmax, consultor autorizado da 21Go, pelo WhatsApp com DDD 84.',
    ],
    rotina:
      'Para quem usa a BR-101 entre Ceará-Mirim e Natal, a assistência 24h cobre o essencial na estrada: guincho, troca de pneu, pane seca e pane elétrica, em todos os planos.',
    faqs: [
      {
        p: 'Ceará-Mirim é do Ceará ou do RN para a tabela?',
        r: 'Do Rio Grande do Norte. Quem mora em Ceará-Mirim entra na tabela regional do RN; para carro, o plano VIP sai em promoção. O comprovante de residência confirma o estado.',
      },
      {
        p: 'Enchente e alagamento estão cobertos?',
        r: 'Estão, a partir do plano Do Seu Jeito (o Básico não tem fenômenos da natureza). Na perda total por alagamento, a indenização é de 100% da FIPE, sem cota.',
      },
      {
        p: 'Posso pagar a adesão por Pix?',
        r: 'Pode. Depois da vistoria aprovada, o Pix da adesão chega no WhatsApp e a confirmação é automática.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'joao-pessoa-pb',
    nome: 'João Pessoa',
    uf: 'PB',
    ddd: '83',
    regiao: 'Região Metropolitana de João Pessoa',
    vizinhas: ['campina-grande-pb', 'natal-rn'],
    intro: [
      'Em João Pessoa, a proteção veicular 21Go é cotada pela placa, no site, e a contratação segue toda pelo celular.',
      'A Paraíba é um dos estados da tabela regional da 21Go. O atendimento é da CITmax, consultor autorizado da 21Go, pelo WhatsApp.',
    ],
    rotina:
      'Na capital paraibana, entre a orla e os bairros mais afastados, o carro é usado o dia inteiro. Na batida com outro carro, a cobertura de danos a terceiros vai de R$ 5 mil a R$ 100 mil, conforme o plano.',
    faqs: [
      {
        p: 'A tabela regional vale para quem mora em João Pessoa?',
        r: 'Vale. A Paraíba está na tabela regional da 21Go: para carro, o plano VIP sai em promoção até o limite de valor da tabela; acima dele, vale o preço nacional.',
      },
      {
        p: 'O atendimento é de Natal: atende a Paraíba?',
        r: 'Atende. A cotação, o cadastro e a vistoria são online, e a assistência 24h funciona em todo o Brasil.',
      },
      {
        p: 'Meu filho pode dirigir o carro?',
        r: 'Pode. É livre condutor: qualquer pessoa dirige, sem restrição de idade, e o carro fica protegido do mesmo jeito.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'campina-grande-pb',
    nome: 'Campina Grande',
    uf: 'PB',
    ddd: '83',
    regiao: 'Agreste Paraibano',
    vizinhas: ['joao-pessoa-pb'],
    intro: [
      'Campina Grande, no Agreste Paraibano, tem a cotação da proteção veicular 21Go pela placa, com os planos na hora.',
      'Como fica na Paraíba, entra na tabela regional da 21Go. O atendimento é da CITmax, consultor autorizado da 21Go, pelo WhatsApp.',
    ],
    rotina:
      'Quem pega a BR-230 entre Campina Grande e João Pessoa, ou segue para o sertão, precisa de assistência que vá junto. O guincho dos planos atende em todo o país, com alcance que cresce do Básico ao Premium.',
    faqs: [
      {
        p: 'Campina Grande entra na tabela regional?',
        r: 'Entra. A tabela regional vale para quem mora na Paraíba. Para carro, o plano VIP sai em promoção.',
      },
      {
        p: 'Como é a vistoria?',
        r: 'Pelo app VISTO, no celular, com o link que chega no WhatsApp: são de 6 a 15 fotos, incluindo o chassi e a bateria. Abra o link na frente do carro, porque ele vale 30 minutos depois de aberto.',
      },
      {
        p: 'Moto também tem proteção?',
        r: 'Tem, com guincho de 1.000 km e assistência 24h. Moto não tem táxi nem moto reserva, e a promoção do VIP vale só para carro.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'fortaleza-ce',
    nome: 'Fortaleza',
    uf: 'CE',
    ddd: '85',
    regiao: 'Região Metropolitana de Fortaleza',
    vizinhas: ['caucaia-ce', 'juazeiro-do-norte-ce'],
    intro: [
      'Em Fortaleza, a cotação da proteção veicular 21Go é pela placa, no site, e mostra os planos para carro e moto na hora.',
      'O Ceará é um dos estados da tabela regional da 21Go. O atendimento é da CITmax, consultor autorizado da 21Go, todo pelo WhatsApp.',
    ],
    rotina:
      'Numa capital grande como Fortaleza, o carro fica muito tempo na rua e no trânsito. Em roubo, furto ou perda total, a indenização é de 100% da Tabela FIPE do mês do sinistro; na batida, a 21Go paga o conserto direto à oficina e você paga só a cota de participação.',
    faqs: [
      {
        p: 'Quem mora em Fortaleza tem a tabela regional?',
        r: 'Tem. O Ceará está na tabela regional da 21Go: para carro, o plano VIP sai em promoção até o limite de valor da tabela. O comprovante de residência confirma o estado.',
      },
      {
        p: 'O WhatsApp é de outro DDD: atende Fortaleza?',
        r: 'Atende. A CITmax faz o atendimento a distância, e a cotação, os documentos e a vistoria são online para qualquer cidade do Ceará.',
      },
      {
        p: 'O carro está no nome do meu pai. Posso proteger?',
        r: 'Pode. A proteção é feita normalmente; se houver indenização, ela é paga a quem está no documento do veículo.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'caucaia-ce',
    nome: 'Caucaia',
    uf: 'CE',
    ddd: '85',
    regiao: 'Região Metropolitana de Fortaleza',
    vizinhas: ['fortaleza-ce'],
    intro: [
      'Caucaia, na Região Metropolitana de Fortaleza, tem a mesma cotação online da proteção veicular 21Go: placa no site e planos na tela.',
      'Por ficar no Ceará, entra na tabela regional da 21Go. O atendimento é da CITmax, consultor autorizado da 21Go, pelo WhatsApp.',
    ],
    rotina:
      'Para quem vai e volta de Fortaleza todos os dias, problema na estrada não pode virar dia perdido. A assistência 24h de todos os planos tem guincho, chaveiro, troca de pneu e socorro em pane.',
    faqs: [
      {
        p: 'Caucaia entra na tabela regional do Ceará?',
        r: 'Entra. A tabela regional vale para quem mora no Ceará. Para carro, o plano VIP sai em promoção.',
      },
      {
        p: 'Quanto tempo leva para ficar protegido?',
        r: 'Com a vistoria aprovada e a adesão paga por Pix, roubo e furto valem na hora; o restante libera em 72 horas úteis.',
      },
      {
        p: 'Tem fidelidade ou multa para cancelar?',
        r: 'Não. Dá para cancelar quando quiser, sem multa, avisando 10 dias antes do vencimento do boleto.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
  {
    slug: 'juazeiro-do-norte-ce',
    nome: 'Juazeiro do Norte',
    uf: 'CE',
    ddd: '88',
    regiao: 'Cariri cearense',
    vizinhas: ['fortaleza-ce'],
    intro: [
      'Juazeiro do Norte, no Cariri cearense, tem a cotação da proteção veicular 21Go pela placa, direto no site.',
      'O Ceará inteiro está na tabela regional da 21Go, inclusive o Cariri. O atendimento é da CITmax, consultor autorizado da 21Go, pelo WhatsApp.',
    ],
    rotina:
      'No Cariri, muitos trajetos são por estrada entre cidades vizinhas e até a capital, que fica longe. Guincho com alcance maior, nos planos de cima, e assistência em todo o país pesam na escolha.',
    faqs: [
      {
        p: 'A tabela regional vale no Cariri?',
        r: 'Vale. A tabela regional é para quem mora no Ceará, em qualquer cidade. Para carro, o plano VIP sai em promoção.',
      },
      {
        p: 'Preciso ir a Fortaleza para contratar?',
        r: 'Não. A cotação, os documentos e a vistoria são feitos online, de Juazeiro do Norte mesmo.',
      },
      {
        p: 'O guincho atende longe de casa?',
        r: 'Atende em todo o território nacional, dentro do limite de quilômetros do plano: de 200 km no Básico a 1.400 km no Premium.',
      },
    ],
    publicada: true,
    revisadoEm: '2026-11-25',
  },
]

export function cidadesPublicadas(): CidadeSeo[] {
  return CIDADES.filter((c) => c.publicada)
}

export function cidadePorSlug(slug: string): CidadeSeo | null {
  return cidadesPublicadas().find((c) => c.slug === slug) ?? null
}

/** Cidades publicadas agrupadas por estado, na ordem RN, PB, CE. */
export function cidadesPorEstado(): { uf: UfCidade; nome: string; cidades: CidadeSeo[] }[] {
  return (['RN', 'PB', 'CE'] as const).map((uf) => ({ uf, nome: NOME_UF[uf], cidades: cidadesPublicadas().filter((c) => c.uf === uf) }))
}

/** Texto todo da cidade que é só dela (para o teste de conteúdo próprio). */
export function textoProprio(c: CidadeSeo): string {
  return [...c.intro, c.rotina, ...c.faqs.flatMap((f) => [f.p, f.r])].join(' ')
}
