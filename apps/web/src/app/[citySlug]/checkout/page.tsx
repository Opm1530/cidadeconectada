'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api-client'
import { formatCurrency } from '@cc/shared'
import type { DeliveryDriver, Order } from '@cc/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { MapPin, Bike, Store, CreditCard, QrCode, Wallet, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

type DeliveryType = 'PICKUP' | 'OWN_DELIVERY' | 'PLATFORM_DRIVER'
type PaymentMethod = 'MERCADO_PAGO' | 'PIX' | 'CASH_ON_DELIVERY'

export default function CheckoutPage() {
  const router = useRouter()
  const params = useParams<{ citySlug: string }>()
  const { cart, clearCart } = useCartStore()
  const { user } = useAuthStore()

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('PICKUP')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [company, setCompany] = useState<{
    acceptsMercadoPago: boolean
    acceptsPix: boolean
    pixKey?: string | null
    acceptsCashOnDelivery: boolean
    hasOwnDelivery: boolean
    ownDeliveryFee: number | null
    acceptsPlatformDrivers: boolean
    cityId: string
  } | null>(null)

  // Redireciona se sem carrinho
  useEffect(() => {
    if (!cart) { router.push(`/${params.citySlug}`); return }
    if (!user) { router.push(`/login?redirect=/${params.citySlug}/checkout`); return }
  }, [cart, user, router, params.citySlug])

  // Busca dados da empresa e entregadores
  useEffect(() => {
    if (!cart) return

    api.get<{ acceptsMercadoPago: boolean; acceptsPix: boolean; pixKey?: string | null; acceptsCashOnDelivery: boolean; hasOwnDelivery: boolean; ownDeliveryFee: number | null; acceptsPlatformDrivers: boolean; cityId: string }>(`/api/companies/${cart.companyId}`)
      .then((data) => {
        setCompany(data as any)
        // Primeira opção de entrega disponível
        if ((data as any).hasOwnDelivery) setDeliveryType('OWN_DELIVERY')
        else if ((data as any).acceptsPlatformDrivers) setDeliveryType('PLATFORM_DRIVER')
        else setDeliveryType('PICKUP')
        setLoadingCompany(false)
      })
      .catch(() => { setLoadingCompany(false) })

    api.get<DeliveryDriver[]>(`/api/drivers?cityId=${cart.cityId}&status=APPROVED&active=true`)
      .then((data) => setDrivers(data as any))
      .catch(() => {})
  }, [cart])

  if (!cart) return null // will redirect via useEffect
  if (loadingCompany) return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="h-8 w-48 bg-gray-100 animate-pulse rounded-lg" />
      {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}
    </div>
  )
  if (!company) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">
      Empresa não encontrada. <a href="/" className="text-primary-600 underline">Voltar</a>
    </div>
  )

  const deliveryFee =
    deliveryType === 'OWN_DELIVERY' ? (company.ownDeliveryFee ?? 0) :
    deliveryType === 'PLATFORM_DRIVER' && selectedDriver
      ? drivers.find((d) => d.id === selectedDriver)?.deliveryFee ?? 0
      : 0

  const total = cart.subtotal + deliveryFee

  async function handleSubmit() {
    if (!cart || !user || !company) return
    if (!paymentMethod) { toast.error('Selecione uma forma de pagamento'); return }
    if ((deliveryType === 'OWN_DELIVERY' || deliveryType === 'PLATFORM_DRIVER') && !address) {
      toast.error('Informe o endereço de entrega')
      return
    }
    if (deliveryType === 'PLATFORM_DRIVER' && !selectedDriver) {
      toast.error('Selecione um entregador')
      return
    }

    setLoading(true)
    try {
      const order = await api.post<Order>('/api/orders', {
        companyId: cart.companyId,
        deliveryType,
        deliveryAddress: address || undefined,
        driverId: deliveryType === 'PLATFORM_DRIVER' ? selectedDriver : undefined,
        paymentMethod,
        notes: notes || undefined,
        items: cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
          selectedOptions: item.selectedOptions.map((o) => ({ optionId: o.optionId })),
        })),
      })

      clearCart()
      toast.success('Pedido realizado com sucesso!')
      router.push(`/${params.citySlug}/pedido/${order.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao realizar pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Finalizar Pedido</h1>

      {/* Tipo de entrega */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Como quer receber?</h2>
        <div className="flex flex-col gap-2">
          <DeliveryOption
            label="Retirada no local"
            description="Você busca na loja"
            icon={<Store size={18} />}
            selected={deliveryType === 'PICKUP'}
            onClick={() => setDeliveryType('PICKUP')}
          />
          {company.hasOwnDelivery && (
            <DeliveryOption
              label="Entrega pela loja"
              description={company.ownDeliveryFee ? `Taxa: ${formatCurrency(company.ownDeliveryFee)}` : 'Grátis'}
              icon={<Bike size={18} />}
              selected={deliveryType === 'OWN_DELIVERY'}
              onClick={() => setDeliveryType('OWN_DELIVERY')}
            />
          )}
          {company.acceptsPlatformDrivers && (
            <DeliveryOption
              label="Entregador da plataforma"
              description="Escolha um entregador disponível"
              icon={<Bike size={18} />}
              selected={deliveryType === 'PLATFORM_DRIVER'}
              onClick={() => setDeliveryType('PLATFORM_DRIVER')}
            />
          )}
        </div>
      </section>

      {/* Endereço */}
      {(deliveryType === 'OWN_DELIVERY' || deliveryType === 'PLATFORM_DRIVER') && (
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-primary-600" />
            Endereço de entrega
          </h2>
          <Input
            placeholder="Rua, número, bairro..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </section>
      )}

      {/* Seleção de entregador */}
      {deliveryType === 'PLATFORM_DRIVER' && (
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Escolha o entregador</h2>
          {drivers.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum entregador disponível no momento.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {drivers.slice(0, 3).map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver.id)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-colors text-left',
                    selectedDriver === driver.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{driver.user?.name}</p>
                    <p className="text-xs text-gray-400">{driver.vehicle ?? 'Veículo não informado'}</p>
                  </div>
                  <p className="font-semibold text-sm text-primary-600">
                    {formatCurrency(driver.deliveryFee)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pagamento */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Forma de pagamento</h2>
        <div className="flex flex-col gap-2">
          {company.acceptsMercadoPago && (
            <PaymentOption
              label="Mercado Pago"
              description="Cartão, débito ou saldo MP"
              icon={<CreditCard size={18} />}
              selected={paymentMethod === 'MERCADO_PAGO'}
              onClick={() => setPaymentMethod('MERCADO_PAGO')}
            />
          )}
          {company.acceptsPix && (
            <PaymentOption
              label="Pix"
              description={company.pixKey ? `Chave: ${company.pixKey}` : 'Confirmação via WhatsApp'}
              icon={<QrCode size={18} />}
              selected={paymentMethod === 'PIX'}
              onClick={() => setPaymentMethod('PIX')}
            />
          )}
          {company.acceptsCashOnDelivery && (
            <PaymentOption
              label="Pagamento na entrega"
              description="Pague no recebimento"
              icon={<Wallet size={18} />}
              selected={paymentMethod === 'CASH_ON_DELIVERY'}
              onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
            />
          )}
        </div>
      </section>

      {/* Observações */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-2">Observações do pedido</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Alguma informação adicional para a loja?"
          rows={2}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </section>

      {/* Resumo */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Resumo</h2>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal ({cart.items.length} {cart.items.length === 1 ? 'item' : 'itens'})</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Taxa de entrega</span>
            <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 mt-1">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </section>

      <Button size="lg" onClick={handleSubmit} loading={loading} className="w-full gap-2">
        Confirmar pedido · {formatCurrency(total)}
        <ChevronRight size={18} />
      </Button>
    </div>
  )
}

function DeliveryOption({ label, description, icon, selected, onClick }: {
  label: string; description: string; icon: React.ReactNode
  selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-xl border transition-colors text-left',
        selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500')}>
        {icon}
      </div>
      <div>
        <p className={cn('text-sm font-medium', selected ? 'text-primary-700' : 'text-gray-800')}>{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </button>
  )
}

function PaymentOption({ label, description, icon, selected, onClick }: {
  label: string; description: string; icon: React.ReactNode
  selected: boolean; onClick: () => void
}) {
  return <DeliveryOption label={label} description={description} icon={icon} selected={selected} onClick={onClick} />
}
