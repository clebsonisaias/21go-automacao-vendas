#!/usr/bin/env node
/**
 * Hooks do Claude Code neste repositório (.claude/settings.json).
 *
 *   node .claude/hooks/protecao.mjs pre-edit   (PreToolUse em Edit/Write/MultiEdit/NotebookEdit)
 *   node .claude/hooks/protecao.mjs pre-bash   (PreToolUse em Bash)
 *
 * - pre-edit: recusa editar segredos e dados de clientes (.env*, .coolify.local, data/).
 * - pre-bash: antes de `git commit`, roda os testes (npm test); se falharem, o commit não sai.
 *
 * Saída 2 = bloqueia a ferramenta e mostra o motivo ao Claude. Qualquer outro problema do próprio
 * hook (JSON inválido, comando desconhecido) libera: o hook nunca trava a sessão por erro dele.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const modo = process.argv[2]
const raiz = process.env.CLAUDE_PROJECT_DIR || process.cwd()

function lerEntrada() {
  try {
    const bruto = readFileSync(0, 'utf8')
    return bruto ? JSON.parse(bruto) : {}
  } catch {
    return {}
  }
}

function bloquear(motivo) {
  process.stderr.write(`${motivo}\n`)
  process.exit(2)
}

/** Caminho relativo à raiz do projeto, com barras normais. */
function relativo(arquivo) {
  const abs = path.resolve(raiz, String(arquivo || ''))
  return path.relative(raiz, abs).split(path.sep).join('/')
}

/** Arquivos que o Claude nunca edita por ferramenta. Exportado para o teste. */
export function caminhoProtegido(rel) {
  if (!rel || rel.startsWith('..')) return null
  const nome = rel.split('/').pop() || ''
  if (/^\.env(\..*)?$/.test(nome) && nome !== '.env.example') return 'arquivo de segredos (.env)'
  if (nome === '.coolify.local') return 'arquivo de segredos do Coolify'
  if (rel === 'data' || rel.startsWith('data/')) return 'dados de clientes (data/)'
  return null
}

/** O comando faz um commit? (git commit, com ou sem opções antes). Exportado para o teste. */
export function ehCommit(comando) {
  return /(^|[;&|(\s])git(\s+-[a-zA-Z]\s+\S+|\s+--[\w-]+(=\S+)?)*\s+commit\b/.test(String(comando || ''))
}

function preEdit() {
  const e = lerEntrada()
  const i = e.tool_input || {}
  const alvo = i.file_path || i.notebook_path || i.path
  const motivo = caminhoProtegido(relativo(alvo))
  if (motivo) bloquear(`Bloqueado pelo hook do projeto: ${motivo} não se edita pelo Claude. Peça ao Clebson para mudar no Coolify ou no servidor.`)
}

function preBash() {
  const e = lerEntrada()
  const comando = e.tool_input?.command
  if (!ehCommit(comando)) return
  // Commit em outro repositório (cd para fora deste projeto) não roda os testes daqui.
  const cds = [...String(comando).matchAll(/\bcd\s+("[^"]+"|'[^']+'|\S+)/g)].map((m) => m[1].replace(/^["']|["']$/g, ''))
  if (cds.length && !cds.some((d) => path.resolve(raiz, d).startsWith(raiz))) return
  const r = spawnSync('npm', ['test', '--silent'], { cwd: raiz, encoding: 'utf8', timeout: 170000 })
  if (r.error) return // sem npm ou tempo esgotado: não trava o commit por causa do hook
  if (r.status !== 0) {
    const saida = `${r.stdout || ''}${r.stderr || ''}`.split('\n').filter((l) => /not ok|fail|Error|✖/.test(l)).slice(0, 20).join('\n')
    bloquear(`Bloqueado pelo hook do projeto: os testes falharam (npm test). Corrija antes do commit.\n${saida}`)
  }
}

const direto = process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href
if (direto) {
  if (modo === 'pre-edit') preEdit()
  else if (modo === 'pre-bash') preBash()
}
