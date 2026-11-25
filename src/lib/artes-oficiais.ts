/**
 * Leitura das artes oficiais do CRM (Materiais), sem rede e sem imports (testada com `node --test`).
 * A busca, o cache e a conversão ficam em `crm-materiais.ts`.
 */

export interface ArteOficial {
  id: string
  nome: string
  formato: 'feed' | 'story'
  tamanho: number
  previa: string
}

export interface PastaOficial {
  id: string
  nome: string
  artes: ArteOficial[]
}

export const ID_MATERIAL = /^[A-Za-z0-9-]{8,64}$/
export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
export const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : Array.isArray(obj(v).data) ? (obj(v).data as unknown[]) : [])

/** Story pelo nome do arquivo ("story", "1080x1920"); o resto vai para o feed. */
export function formatoPeloNome(nome: string): 'feed' | 'story' {
  return /story|stories|1080\s*x\s*1920|9\s*[x:]\s*16/i.test(nome) ? 'story' : 'feed'
}

/** Só imagem PNG ou JPEG, com URL https do armazenamento do CRM. */
export function lerArquivos(bruto: unknown): ArteOficial[] {
  return lista(obj(bruto).arquivos)
    .map((a) => {
      const o = obj(a)
      const nome = typeof o.nome === 'string' ? o.nome.trim().slice(0, 120) : ''
      const url = typeof o.url === 'string' ? o.url : ''
      return {
        id: typeof o.id === 'string' ? o.id : '',
        nome,
        formato: formatoPeloNome(nome),
        tamanho: typeof o.tamanho === 'number' ? o.tamanho : 0,
        previa: url,
        mime: typeof o.mime === 'string' ? o.mime : '',
      }
    })
    .filter((a) => ID_MATERIAL.test(a.id) && a.nome && /^image\/(png|jpe?g)$/.test(a.mime) && /^https:\/\/[^/]+\//.test(a.previa))
    .map(({ mime: _m, ...a }) => a)
}

/** Nome para a tela: "21go-carro-reserva-feed-2.png" → "Carro reserva". */
export function tituloDaArte(nome: string): string {
  const t = nome
    .replace(/\.(png|jpe?g)$/i, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/^21\s*go[-_ ]*/i, '')
    .replace(/[-_ ](feed|story|stories)([-_ ]?\d+)?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : nome
}
