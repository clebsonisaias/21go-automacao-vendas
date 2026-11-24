// PDF mínimo com camada de texto (fonte Courier), montado à mão para os testes. Só ASCII.
export function pdfComTexto(linhas: string[]): Buffer {
  const conteudo = [
    'BT',
    '/F1 9 Tf',
    '11 TL',
    '30 810 Td',
    ...linhas.map((l) => `(${l.replace(/[\\()]/g, '\\$&')}) Tj T*`),
    'ET',
  ].join('\n')
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const posicoes: number[] = []
  objetos.forEach((o, i) => {
    posicoes.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  pdf += posicoes.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

export const LINHAS_CRLV = [
  '                 REPUBLICA FEDERATIVA DO BRASIL',
  '  CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEICULO - DIGITAL',
  'CODIGO RENAVAM          PLACA            EXERCICIO',
  '01234567897             QWE1A23          2026',
  'ANO FABRICACAO          ANO MODELO',
  '2020                    2020',
  'CHASSI',
  '9BWZZZ377VT004251',
  'NOME',
  'FULANO DE TAL TESTE',
  'CPF / CNPJ',
  '529.982.247-25',
]
