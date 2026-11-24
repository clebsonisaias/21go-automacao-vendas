/**
 * Texto de um PDF digital pelo `pdftotext` (poppler-utils, instalado no Dockerfile).
 *
 * Roda sem shell, com tempo e tamanho de saída limitados, só nas 3 primeiras páginas, numa
 * pasta temporária própria que é apagada no fim. Sem o programa, com PDF protegido por senha ou
 * com qualquer erro, devolve null: quem chama segue para a IA como antes.
 * `DOCUMENTO_PDF_CODIGO=off` desliga a leitura sem mexer no código.
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export function leituraDePdfLigada(): boolean {
  return (process.env.DOCUMENTO_PDF_CODIGO || '').toLowerCase() !== 'off'
}

function rodar(programa: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(programa, args, { timeout: 10_000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' }, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    )
  })
}

export async function textoDoPdf(buf: Buffer): Promise<string | null> {
  if (!leituraDePdfLigada()) return null
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') return null
  let pasta: string | null = null
  try {
    pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-pdf-'))
    const arquivo = path.join(pasta, 'documento.pdf')
    await fs.writeFile(arquivo, buf, { mode: 0o600 })
    const programa = process.env.PDFTOTEXT_BIN || 'pdftotext'
    return await rodar(programa, ['-q', '-layout', '-enc', 'UTF-8', '-l', '3', arquivo, '-'])
  } catch (err) {
    const codigo = (err as NodeJS.ErrnoException)?.code
    console.warn('[pdf-texto] sem texto do PDF:', codigo === 'ENOENT' ? 'pdftotext não instalado' : codigo || 'erro')
    return null
  } finally {
    if (pasta) await fs.rm(pasta, { recursive: true, force: true }).catch(() => undefined)
  }
}
