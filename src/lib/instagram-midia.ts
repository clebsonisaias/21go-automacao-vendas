/**
 * O que vai no POST {user}/media da API do Instagram, por tipo de mídia e destino. Puro (testado
 * em tests/instagram-midia.test.mts); quem envia é src/lib/instagram.ts.
 *
 * - Imagem no feed: image_url + caption. Imagem no story: image_url + STORIES (story não tem legenda).
 * - Vídeo no feed: Reel (REELS + video_url + caption), que também aparece na grade (share_to_feed).
 * - Vídeo no story: STORIES + video_url.
 */
export type Destino = 'feed' | 'story'
export type Midia = { tipo: 'imagem'; url: string } | { tipo: 'video'; url: string }

export function paramsDaMidia(midia: Midia, destino: Destino, caption: string): Record<string, string> {
  if (midia.tipo === 'imagem') {
    return destino === 'story' ? { image_url: midia.url, media_type: 'STORIES' } : { image_url: midia.url, caption }
  }
  return destino === 'story'
    ? { video_url: midia.url, media_type: 'STORIES' }
    : { video_url: midia.url, media_type: 'REELS', caption, share_to_feed: 'true' }
}

/** Vídeo demora mais para a Meta processar: espera mais vezes e mais tempo entre as consultas. */
export function esperaDoProcessamento(midia: Midia): { tentativas: number; intervaloMs: number } {
  return midia.tipo === 'video' ? { tentativas: 36, intervaloMs: 10_000 } : { tentativas: 12, intervaloMs: 5_000 }
}
