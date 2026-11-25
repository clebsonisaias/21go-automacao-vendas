'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Car,
} from 'lucide-react'
import { DocumentAiResult, ExtractedDocType } from '@/lib/types'

interface DocumentAiUploaderProps {
  label?: string
  hint?: ExtractedDocType
  onExtracted: (result: DocumentAiResult) => void
  className?: string
  /** Abre direto a câmera no celular. Desligado, o celular deixa escolher arquivo (PDF) ou câmera. */
  camera?: boolean
}

export function DocumentAiUploader({
  label = 'Preencher com foto do documento (IA)',
  hint,
  onExtracted,
  className = '',
  camera = true,
}: DocumentAiUploaderProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [lastResult, setLastResult] = useState<DocumentAiResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setErrorMsg('')
    setStatusMsg('Analisando documento com Inteligência Artificial...')
    setLastResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (hint) formData.append('hint', hint)

      const res = await fetch('/api/documents/ocr', {
        method: 'POST',
        body: formData,
      })

      const data: DocumentAiResult = await res.json()

      if (data.success) {
        setLastResult(data)
        setStatusMsg('Dados extraídos com sucesso!')
        onExtracted(data)
      } else {
        setErrorMsg(data.error || 'Não foi possível ler o documento. Tente uma foto mais nítida.')
      }
    } catch {
      setErrorMsg('Sem conexão com o serviço de IA. Verifique sua internet.')
    } finally {
      setIsScanning(false)
      // Limpa o input para permitir selecionar o mesmo arquivo se quiser
      e.target.value = ''
    }
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <label className="relative flex min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-go-orange bg-surface-50 px-4 py-3 text-sm font-bold text-navy-800 transition hover:bg-surface-100 hover:shadow-card">
        <input
          type="file"
          accept="image/*,application/pdf"
          {...(camera ? { capture: 'environment' as const } : {})}
          disabled={isScanning}
          onChange={handleFileChange}
          className="sr-only"
        />

        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-go-orange" />
            <span className="text-navy-950 font-semibold">{statusMsg}</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-go-orange" />
            {camera ? (
              <Camera aria-hidden className="h-4 w-4 text-navy-700" />
            ) : (
              <Upload aria-hidden className="h-4 w-4 text-navy-700" />
            )}
            <span>{label}</span>
          </>
        )}
      </label>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {lastResult && (
        <div className="flex flex-col gap-2 rounded-xl border border-go-lime bg-[#f6f9e1] p-3 text-xs text-navy-950 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-go-lime-dark">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {lastResult.documentType === 'crlv'
                ? 'Documento do Veículo (CRLV) identificado!'
                : lastResult.documentType === 'cnh'
                  ? 'CNH / Identificação pessoal identificada!'
                  : 'Documento reconhecido pela IA!'}
            </span>
          </div>

          {lastResult.vehicle?.placa && (
            <div className="flex items-center gap-2 font-semibold">
              <Car className="h-3.5 w-3.5 text-navy-700" />
              <span>
                {lastResult.vehicle.marcaModelo || 'Veículo'}{' '}
                {lastResult.vehicle.placa && `· Placa: ${lastResult.vehicle.placa}`}{' '}
                {lastResult.vehicle.anoModelo && `· Ano: ${lastResult.vehicle.anoModelo}`}
              </span>
            </div>
          )}

          {lastResult.personal?.nome && (
            <div className="flex items-center gap-2 font-semibold">
              <User className="h-3.5 w-3.5 text-navy-700" />
              <span>
                {lastResult.personal.nome}
                {lastResult.personal.cpf && ` · CPF: ${lastResult.personal.cpf}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
