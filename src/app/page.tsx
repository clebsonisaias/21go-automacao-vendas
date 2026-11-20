import { HomeClient } from '@/components/HomeClient'

// Lê o WhatsApp da franquia em cada requisição (mesma variável usada em /api/quote/submit),
// em vez de gravar o número no bundle do navegador.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  const whatsapp = (process.env.FRANQUIA_WHATSAPP || '5521999999999').replace(/\D/g, '')
  return <HomeClient whatsapp={whatsapp} />
}
