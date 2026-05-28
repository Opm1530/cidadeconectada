import { NextRequest } from 'next/server'
import { prisma } from '@cc/database'
import { ok, badRequest, notFound } from '@/lib/api-response'

// GET /api/coupons/validate?code=X&companyId=Y&subtotal=Z&deliveryType=OWN_DELIVERY
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code        = searchParams.get('code')?.toUpperCase()
  const companyId   = searchParams.get('companyId')
  const subtotal    = Number(searchParams.get('subtotal') ?? 0)
  const deliveryType = searchParams.get('deliveryType') ?? ''

  if (!code || !companyId) return badRequest('code e companyId são obrigatórios')

  const coupon = await prisma.coupon.findUnique({
    where: { companyId_code: { companyId, code } },
  })

  if (!coupon || !coupon.active) return notFound('Cupom inválido ou inativo')

  // Verificar validade
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return notFound('Cupom expirado')
  }

  // Verificar limite de usos
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return notFound('Cupom esgotado')
  }

  // Verificar pedido mínimo
  if (coupon.minOrder !== null && subtotal < Number(coupon.minOrder)) {
    return badRequest(`Pedido mínimo de R$ ${Number(coupon.minOrder).toFixed(2)} para este cupom`)
  }

  // FREE_SHIPPING só funciona com entrega própria
  if (coupon.type === 'FREE_SHIPPING' && deliveryType !== 'OWN_DELIVERY') {
    return badRequest('Este cupom é válido apenas para entregas feitas pela loja')
  }

  return ok({
    id:       coupon.id,
    code:     coupon.code,
    type:     coupon.type,
    value:    coupon.value ? Number(coupon.value) : null,
    valid:    true,
  })
}
