/**
 * Gera o payload Pix (EMV QRCPS-MPM) conforme especificação do Banco Central do Brasil.
 * Funciona 100% client-side, sem APIs externas.
 */

function crc16ccitt(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`
}

/** Remove acentos e caracteres especiais para obedecer o charset ASCII do Pix */
function normalize(str: string, maxLen: number): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, maxLen)
    .toUpperCase()
}

export function generatePixPayload(params: {
  key: string
  amount: number
  merchantName: string
  merchantCity?: string
  txId?: string
  description?: string
}): string {
  const {
    key,
    amount,
    merchantName,
    merchantCity = 'BRASIL',
    txId = '***',
    description,
  } = params

  // Tag 26 — Merchant Account Information
  const gui      = tlv('00', 'BR.GOV.BCB.PIX')
  const keyField = tlv('01', key)
  const descPart = description ? tlv('02', description.slice(0, 72)) : ''
  const merchantAccountInfo = tlv('26', gui + keyField + descPart)

  // Tag 62 — Additional Data (txId obrigatório)
  const cleanTxId = (txId === '***' ? '***' : txId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25)) || '***'
  const additionalData = tlv('62', tlv('05', cleanTxId))

  const name = normalize(merchantName, 25)
  const city = normalize(merchantCity, 15)

  const payload = [
    tlv('00', '01'),               // Payload Format Indicator
    merchantAccountInfo,            // Merchant Account Info
    tlv('52', '0000'),             // Merchant Category Code
    tlv('53', '986'),              // Transaction Currency (BRL)
    tlv('54', amount.toFixed(2)),  // Transaction Amount
    tlv('58', 'BR'),               // Country Code
    tlv('59', name),               // Merchant Name
    tlv('60', city),               // Merchant City
    additionalData,                 // Additional Data
    '6304',                        // CRC tag (sem valor ainda)
  ].join('')

  return payload + crc16ccitt(payload)
}
