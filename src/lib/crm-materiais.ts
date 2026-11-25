import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { CRM_BASE_URL, getCrmToken } from './crm'
import { DATA_DIR } from './db'
import { APP_BASE_URL } from './links'
import { ArteOficial, ID_MATERIAL, PastaOficial, lerArquivos, lista, obj } from './artes-oficiais'

export type { ArteOficial, PastaOficial }

/**
 * Artes oficiais da 21Go (Materiais do CRM, pedido do Clebson pela ideia do Grok nº 5): a aba
 * Instagram do /admin mostra as pastas de `/materiais` e publica a arte escolhida, sempre no clique
 * de alguém da equipe, com a legenda revisada.
 *
 * - O CRM devolve cada arquivo com uma URL assinada do Supabase que vale 2 horas: a lista fica
 *   10 minutos em cache e a prévia usa essa URL direto.
 * - A Meta só aceita JPEG pela API. Na hora de publicar, o site baixa o PNG, converte (fundo branco,
 *   no máximo 1080 de largura) e serve em `/api/social/oficial/{id}` para a Meta buscar.
 */

const ID = ID_MATERIAL
const CACHE_MS = 10 * 60_000
const MAX_BYTES = 15 * 1024 * 1024
const PASTA_JPG = path.join(DATA_DIR, 'social-oficial')

let cache: { em: number; pastas: PastaOficial[] } | null = null

async function crmGet(token: string, caminho: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${CRM_BASE_URL}${caminho}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      console.warn(`[Artes oficiais] CRM respondeu ${res.status}`)
      return null
    }
    return await res.json()
  } catch (e) {
    console.warn('[Artes oficiais] CRM sem resposta:', e instanceof Error ? e.name : 'erro')
    return null
  }
}

/** Pastas e artes do CRM (cache de 10 minutos). null = CRM fora do ar ou sem credenciais. */
export async function listarArtesOficiais(atualizar = false): Promise<PastaOficial[] | null> {
  if (!atualizar && cache && Date.now() - cache.em < CACHE_MS) return cache.pastas
  const token = await getCrmToken()
  if (!token) return null
  const bruto = await crmGet(token, '/materiais/pastas')
  if (!bruto) return null
  const pastas = lista(bruto)
    .map((p) => {
      const o = obj(p)
      return { id: typeof o.id === 'string' ? o.id : '', nome: typeof o.nome === 'string' ? o.nome.trim().slice(0, 80) : '' }
    })
    .filter((p) => ID.test(p.id) && p.nome)
  const comArtes = await Promise.all(
    pastas.map(async (p) => ({ ...p, artes: lerArquivos(await crmGet(token, `/materiais/pastas/${p.id}/arquivos`)) }))
  )
  const resultado = comArtes.filter((p) => p.artes.length)
  cache = { em: Date.now(), pastas: resultado }
  return resultado
}

export function caminhoDoJpg(id: string): string | null {
  return ID.test(id) ? path.join(PASTA_JPG, `${id}.jpg`) : null
}

/**
 * Baixa a arte (URL nova do CRM), converte para JPEG e guarda para a Meta buscar.
 * Devolve a URL pública e os dados da arte.
 */
export async function prepararArteOficial(id: string): Promise<{ url: string; arte: ArteOficial } | { erro: string }> {
  const destino = caminhoDoJpg(id)
  if (!destino) return { erro: 'Arte não encontrada.' }
  // A URL assinada vale 2 horas: a lista é relida para não usar uma vencida.
  const pastas = await listarArtesOficiais(true)
  if (!pastas) return { erro: 'O CRM não respondeu. Tente de novo em instantes.' }
  const arte = pastas.flatMap((p) => p.artes).find((a) => a.id === id)
  if (!arte) return { erro: 'Esta arte não está mais nos Materiais do CRM.' }
  try {
    const res = await fetch(arte.previa, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return { erro: 'Não foi possível baixar a arte do CRM.' }
    const tamanho = Number(res.headers.get('content-length') || 0)
    if (tamanho > MAX_BYTES) return { erro: 'A arte passa de 15 MB.' }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_BYTES) return { erro: 'A arte passa de 15 MB.' }
    const jpg = await sharp(buf, { limitInputPixels: 40_000_000 })
      .flatten({ background: '#ffffff' })
      .resize({ width: 1080, withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
    fs.mkdirSync(PASTA_JPG, { recursive: true })
    const tmp = `${destino}.${process.pid}.tmp`
    fs.writeFileSync(tmp, jpg)
    fs.renameSync(tmp, destino)
    return { url: `${APP_BASE_URL}/api/social/oficial/${id}?v=${Date.now().toString(36)}`, arte }
  } catch (e) {
    console.error('[Artes oficiais] falha ao preparar:', e instanceof Error ? e.message.slice(0, 120) : 'erro')
    return { erro: 'A arte não pôde ser convertida para o Instagram.' }
  }
}

/**
 * Prévia para o painel (o CSP do site não deixa a tela carregar direto do armazenamento do CRM):
 * JPEG de 400 ou 1080 px, guardado em disco. null = arte que não está mais no CRM ou falha.
 */
export async function previaDaArte(id: string, largura: 400 | 1080): Promise<Buffer | null> {
  if (!ID.test(id)) return null
  const arquivo = path.join(PASTA_JPG, 'previa', `${id}-${largura}.jpg`)
  try {
    if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo)
  } catch {}
  const pastas = await listarArtesOficiais()
  const arte = pastas?.flatMap((p) => p.artes).find((a) => a.id === id)
  if (!arte) return null
  try {
    const res = await fetch(arte.previa, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_BYTES) return null
    const jpg = await sharp(buf, { limitInputPixels: 40_000_000 })
      .flatten({ background: '#ffffff' })
      .resize({ width: largura, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
    fs.mkdirSync(path.dirname(arquivo), { recursive: true })
    fs.writeFileSync(arquivo, jpg)
    return jpg
  } catch (e) {
    console.warn('[Artes oficiais] prévia falhou:', e instanceof Error ? e.name : 'erro')
    return null
  }
}
