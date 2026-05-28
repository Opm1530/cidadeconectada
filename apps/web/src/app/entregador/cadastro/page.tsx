'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Bike } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  deliveryFee: z.number({ coerce: true }).min(1, 'Taxa deve ser maior que zero'),
  vehicle: z.string().min(1, 'Informe o veículo'),
  vehiclePlate: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function DriverRegisterPage() {
  return <Suspense><DriverRegisterForm /></Suspense>
}

function DriverRegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const cityId = params.get('cityId') ?? user?.cityId ?? ''

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    if (!cityId) { toast.error('Cidade não identificada'); return }
    setLoading(true)
    try {
      await api.post('/api/drivers', { ...data, cityId })
      toast.success('Cadastro enviado! Aguarde a aprovação da cidade.')
      router.push('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
            <Bike size={32} className="text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Seja um entregador</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre-se e comece a receber entregas na sua cidade
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Taxa de entrega (R$)"
              type="number"
              step="0.50"
              placeholder="Ex: 5.00"
              error={errors.deliveryFee?.message}
              {...register('deliveryFee')}
            />
            <Input
              label="Veículo"
              placeholder="Ex: Moto, Bicicleta, Carro"
              error={errors.vehicle?.message}
              {...register('vehicle')}
            />
            <Input
              label="Placa do veículo (opcional)"
              placeholder="ABC-1234"
              {...register('vehiclePlate')}
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              Seu cadastro passará por aprovação do administrador da cidade. Você será notificado.
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              Enviar cadastro
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
