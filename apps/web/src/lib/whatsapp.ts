/**
 * Integração com Evolution API (WhatsApp)
 * Docs: https://doc.evolution-api.com
 */

const EVOLUTION_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY

export async function sendWhatsApp(
  instance: string,
  instanceKey: string,
  phone: string,
  message: string,
): Promise<boolean> {
  if (!EVOLUTION_URL) {
    console.warn('[WhatsApp] EVOLUTION_API_URL não configurada')
    return false
  }

  // Remove caracteres não numéricos e garante DDI 55
  const digits = phone.replace(/\D/g, '')
  const formattedPhone = digits.startsWith('55') ? digits : `55${digits}`

  try {
    const response = await fetch(
      `${EVOLUTION_URL}/message/sendText/${instance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: instanceKey || EVOLUTION_KEY || '',
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      console.error(`[WhatsApp] Erro ao enviar para ${formattedPhone}:`, error)
      return false
    }

    return true
  } catch (err) {
    console.error('[WhatsApp] Falha na requisição:', err)
    return false
  }
}
