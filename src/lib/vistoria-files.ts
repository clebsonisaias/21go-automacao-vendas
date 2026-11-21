import fs from 'fs'
import path from 'path'
import { DATA_DIR } from './db'

// Arquivos da vistoria (documentos e fotos) gravados no volume de dados, fora da pasta pública.
// Só o painel /admin (autenticado) consegue baixá-los.

export { VISTORIA_SLOTS, isVistoriaSlot, type VistoriaSlot } from './vistoria-slots'
import { VISTORIA_SLOTS, isVistoriaSlot, type VistoriaSlot } from './vistoria-slots'

export const MAX_FILE_BYTES = 12 * 1024 * 1024

export interface StoredVistoriaFile {
  ext: string
  mime: string
  size: number
  originalName: string
  savedAt: string
}

/** Identifica o tipo pelo conteúdo (bytes iniciais), nunca pela extensão ou pelo mime informado. */
export function sniffType(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' }
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('latin1')
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return { ext: 'heic', mime: 'image/heic' }
  }
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' }
  return null
}

// O id do cadastro é gerado pelo servidor; ainda assim só aceitamos caracteres seguros no caminho.
function leadDir(leadId: string): string {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(leadId)) throw new Error('id inválido')
  return path.join(DATA_DIR, 'vistorias', leadId)
}

export function saveVistoriaFile(leadId: string, slot: VistoriaSlot, buf: Buffer, ext: string): void {
  const dir = leadDir(leadId)
  fs.mkdirSync(dir, { recursive: true })
  // Um arquivo por item: remove versões anteriores (outra extensão) antes de gravar.
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(`${slot}.`)) fs.unlinkSync(path.join(dir, f))
  }
  const tmp = path.join(dir, `.${slot}.${process.pid}.tmp`)
  fs.writeFileSync(tmp, buf, { mode: 0o600 })
  fs.renameSync(tmp, path.join(dir, `${slot}.${ext}`))
}

export function readVistoriaFile(leadId: string, slot: VistoriaSlot, ext: string): Buffer | null {
  if (!/^[a-z0-9]{2,5}$/.test(ext)) return null
  try {
    return fs.readFileSync(path.join(leadDir(leadId), `${slot}.${ext}`))
  } catch {
    return null
  }
}
