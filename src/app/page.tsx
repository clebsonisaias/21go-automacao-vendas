import type { Metadata } from 'next'
import { HomeClient } from '@/components/home/HomeClient'

// A home é a página de cotação (componente cliente em components/home/HomeClient.tsx). Este
// arquivo é do servidor só para dar título, descrição e canonical próprios à página.

export const metadata: Metadata = {
  title: { absolute: '21Go Proteção Veicular: cotação pela placa · CITmax, consultor autorizado' },
  description:
    'Cote a proteção veicular da 21Go pela placa e veja os planos na hora: 100% da Tabela FIPE, sem consulta ao SPC/Serasa e vistoria pelo celular. CITmax, consultor autorizado da 21Go.',
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return <HomeClient />
}
