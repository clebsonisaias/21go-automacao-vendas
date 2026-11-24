// Texto do PDF pelo pdftotext: node --experimental-strip-types --no-warnings --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { textoDoPdf } from '../src/lib/pdf-texto.ts'
import { lerTextoDoDocumento } from '../src/lib/documento-pdf.ts'
import { LINHAS_CRLV, pdfComTexto } from './pdf-sintetico.mts'

let temPdftotext = true
try {
  execFileSync('pdftotext', ['-v'], { stdio: 'ignore' })
} catch {
  temPdftotext = false
}
const pastasTemporarias = () => fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('doc-pdf-')).length

test('PDF com texto: lê e o CRLV sai sem IA, sem deixar pasta temporária', { skip: !temPdftotext && 'pdftotext não instalado' }, async () => {
  const antes = pastasTemporarias()
  const texto = await textoDoPdf(pdfComTexto(LINHAS_CRLV))
  assert.ok(texto && texto.includes('CERTIFICADO DE REGISTRO'))
  assert.equal(lerTextoDoDocumento(texto!).parsed?.vehicle?.placa, 'QWE1A23')
  assert.equal(pastasTemporarias(), antes)
})

test('arquivo que não é PDF, PDF quebrado e leitura desligada devolvem null', async () => {
  assert.equal(await textoDoPdf(Buffer.from('não sou pdf')), null)
  assert.equal(await textoDoPdf(Buffer.from('%PDF-1.4 quebrado')), null)
  process.env.DOCUMENTO_PDF_CODIGO = 'off'
  assert.equal(await textoDoPdf(pdfComTexto(LINHAS_CRLV)), null)
  delete process.env.DOCUMENTO_PDF_CODIGO
})
