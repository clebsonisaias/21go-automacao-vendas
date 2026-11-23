import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from '@/lib/db'
import { UTILITARIOS_PADRAO, normalizarModelo } from '@/lib/tabela-nordeste'

/**
 * Lista de modelos que usam a faixa de utilitário da tabela regional (picapes médias e grandes e
 * SUVs), editada no /admin. Sem arquivo ainda, vale a lista inicial do código.
 */

const ARQUIVO = path.join(DATA_DIR, 'utilitarios-nordeste.json')
const NOME = /^[\p{L}\p{N}][\p{L}\p{N} .\-/]{0,38}[\p{L}\p{N}]$|^[\p{L}\p{N}]{1,2}$/u

/** Lê a lista. Arquivo ilegível é lançado: devolver a padrão faria a próxima gravação apagar o que a equipe acrescentou. */
export function lerUtilitarios(): string[] {
  let bruto: string
  try {
    bruto = fs.readFileSync(ARQUIVO, 'utf-8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return [...UTILITARIOS_PADRAO]
    throw e
  }
  const d = JSON.parse(bruto)
  if (!Array.isArray(d) || d.some((x) => typeof x !== 'string')) throw new Error('utilitarios-nordeste.json não é uma lista de nomes')
  return d as string[]
}

/** Para a cotação: com o arquivo ilegível, usa a lista padrão (a cotação não pode parar por isso). */
export function utilitariosParaCotacao(): string[] {
  try {
    return lerUtilitarios()
  } catch (e) {
    console.error('[utilitarios] lista ilegível, usando a padrão:', e instanceof Error ? e.message : e)
    return [...UTILITARIOS_PADRAO]
  }
}

function gravar(lista: string[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${ARQUIVO}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(lista, null, 2), 'utf-8')
  fs.renameSync(tmp, ARQUIVO)
}

export type ResultadoLista = { ok: true; lista: string[] } | { ok: false; erro: string }

export function acrescentarUtilitario(nome: unknown): ResultadoLista {
  const n = String(nome ?? '').replace(/\s+/g, ' ').trim()
  if (!NOME.test(n)) return { ok: false, erro: 'Escreva o nome do modelo como aparece na cotação (ex.: Hilux, Corolla Cross), com até 40 letras.' }
  const lista = lerUtilitarios()
  if (lista.some((x) => normalizarModelo(x) === normalizarModelo(n))) return { ok: false, erro: `${n} já está na lista.` }
  const nova = [...lista, n].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  gravar(nova)
  return { ok: true, lista: nova }
}

export function tirarUtilitario(nome: unknown): ResultadoLista {
  const alvo = normalizarModelo(nome)
  const lista = lerUtilitarios()
  const nova = lista.filter((x) => normalizarModelo(x) !== alvo)
  if (nova.length === lista.length) return { ok: false, erro: 'Esse modelo não está na lista.' }
  gravar(nova)
  return { ok: true, lista: nova }
}
