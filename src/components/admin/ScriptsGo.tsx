'use client'

import React, { useState } from 'react'
import { MessageSquareText, Copy, CheckCircle2, Sparkles, Send } from 'lucide-react'

interface ScriptItem {
  id: string
  categoria: string
  titulo: string
  gatilho: string
  texto: string
}

const SCRIPTS: ScriptItem[] = [
  {
    id: 's1',
    categoria: 'Abordagem',
    titulo: 'Primeiro Contato após Cotação no Site',
    gatilho: 'Assim que o lead cotar no site 21go.seg.br',
    texto: `Olá, [Nome]! Tudo bem? Aqui é o Clebson da 21Go Proteção Veicular. 🚗✨

Vi que você simulou a proteção para o seu [Veiculo] no nosso site!
Consegui liberar uma condição especial com:
• 100% da Tabela FIPE (Roubo, Furto, Colisão e Perda Total)
• Terceiros até R$ 75.000,00
• Guincho 24h com até 1.000 km sem limite de acionamento
• 5% de desconto pontualidade na mensalidade

Você tem 2 minutinhos para eu te enviar o resumo da sua proposta?`,
  },
  {
    id: 's2',
    categoria: 'Objeções',
    titulo: 'Objeção: "Qual a diferença para Seguro de Banco?"',
    gatilho: 'Quando o cliente pergunta se é seguradora ou associação',
    texto: `Excelente pergunta! A principal diferença é a economia e a desburocratização:

1. Seguro Tradicional (Porto/Azul/HDI): Analisa seu score SPC/Serasa, seu CEP e quem vai dirigir. Se você for jovem ou morar em bairro com índice de sinistro, a mensalidade dobra e pode passar de R$ 350 a R$ 500/mês.
2. 21Go Proteção: Não temos perfil de condutor (qualquer pessoa habilitada pode dirigir seu carro) e não consultamos SPC/Serasa. Você tem a mesma cobertura 100% FIPE e guincho 1.000 km por quase metade do preço!

Faz sentido proteger seu carro pagando só o preço justo?`,
  },
  {
    id: 's3',
    categoria: 'Objeções',
    titulo: 'Objeção: "Como funciona a Cota de Participação (Franquia)?"',
    gatilho: 'Quando o cliente quer entender o valor em caso de batida',
    texto: `É super simples e transparente:

A cota de participação da 21Go é de apenas 6% da Tabela FIPE do veículo (com valor mínimo padrão). 
Importante: você SÓ paga essa cota se você sofrer uma colisão parcial e precisar acionar a oficina credenciada para consertar o seu carro.

Em caso de Roubo, Furto ou Perda Total com indenização de 100% da FIPE, você NÃO paga cota de participação!

Ficou clara essa garantia?`,
  },
  {
    id: 's4',
    categoria: 'Fechamento',
    titulo: 'Chamada para Vistoria 100% pelo Celular',
    gatilho: 'Para o cliente fazer a vistoria no mesmo dia',
    texto: `[Nome], para adiantar e já deixarmos sua proteção liberada hoje, você não precisa esperar vistoriador ir até a sua casa!

Nossa vistoria é 100% digital pelo celular:
👉 Basta abrir este link oficial: https://21go.seg.br/vistoria?nome=[Nome]&veiculo=[Veiculo]&placa=[Placa]

Leva só 2 minutos: você tira as fotos do carro e anexa a CNH. Assim que enviar, nossa equipe aprova e seu veículo já fica protegido!`,
  },
]

export function ScriptsGo() {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas')
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  const categorias = ['Todas', 'Abordagem', 'Objeções', 'Fechamento']

  const filtrados =
    categoriaAtiva === 'Todas'
      ? SCRIPTS
      : SCRIPTS.filter((s) => s.categoria === categoriaAtiva)

  const handleCopiar = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto)
    setCopiadoId(id)
    setTimeout(() => setCopiadoId(null), 2500)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-center gap-2.5 text-2xl font-extrabold text-navy-800">
          <MessageSquareText className="h-6 w-6 text-go-orange" />
          Central de Scripts 21Go & Objeções
        </h2>
        <p className="m-0 text-sm text-muted">
          Roteiros oficiais de alta conversão para WhatsApp e atendimento telefônico da sua franquia.
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categorias.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoriaAtiva(cat)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              categoriaAtiva === cat
                ? 'bg-navy-950 text-white shadow'
                : 'border border-line bg-white text-muted hover:bg-surface-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtrados.map((s) => (
          <div
            key={s.id}
            className="flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-card"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-surface-100 px-2 py-0.5 text-[11px] font-bold uppercase text-navy-700">
                  {s.categoria}
                </span>
                <span className="text-xs text-muted-soft">{s.gatilho}</span>
              </div>

              <h3 className="m-0 text-base font-extrabold text-navy-800">{s.titulo}</h3>

              <div className="mt-2 rounded-xl bg-surface-50 p-3.5 border border-line/60">
                <pre className="m-0 whitespace-pre-wrap font-sans text-xs leading-relaxed text-navy-900">
                  {s.texto}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/50 pt-3">
              <button
                type="button"
                onClick={() => handleCopiar(s.id, s.texto)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-navy-800 px-3.5 text-xs font-bold text-navy-800 transition hover:bg-surface-100"
              >
                {copiadoId === s.id ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Copiado para o WhatsApp!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Script
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
