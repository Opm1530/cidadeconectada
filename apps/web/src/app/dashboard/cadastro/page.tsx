'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-client'
import type { City } from '@cc/shared'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  cityId: z.string().min(1, 'Selecione a cidade'),
})
type FormData = z.infer<typeof schema>

export default function CompanyRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<City[]>([])

  useEffect(() => {
    api.get<City[]>('/api/cities').then((data) => setCities(data as any)).catch(() => {})
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await api.post('/api/companies', data)
      toast.success('Empresa cadastrada com sucesso!')
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-3">
          <Store size={32} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cadastre sua empresa</h1>
        <p className="text-sm text-gray-500 mt-1">Comece a vender na sua cidade</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Cidade *</label>
            <select
              {...register('cityId')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Selecione a cidade</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
              ))}
            </select>
            {errors.cityId && <p className="text-xs text-red-500 mt-1">{errors.cityId.message}</p>}
          </div>

          <Input label="Nome da empresa *" placeholder="Ex: Lanchonete do João" error={errors.name?.message} {...register('name')} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
            <select
              {...register('category')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Selecione (opcional)</option>
              {['Restaurante', 'Lanchonete', 'Pizzaria', 'Mercado', 'Farmácia', 'Padaria', 'Açaí', 'Sushi', 'Bebidas', 'Doceria', 'Petshop', 'Serviços', 'Moda', 'Eletrônicos', 'Hortifruti', 'Papelaria', 'Brinquedos'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
            <textarea
              {...register('description')}
              placeholder="Descreva sua empresa brevemente..."
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 resize-none focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" type="tel" placeholder="(11) 99999-9999" {...register('phone')} />
            <Input label="WhatsApp" type="tel" placeholder="11999999999" {...register('whatsapp')} />
          </div>

          <Input label="Endereço" placeholder="Rua, número, bairro..." {...register('address')} />

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
            Após o cadastro, configure as formas de pagamento e entrega em <strong>Configurações</strong>.
          </div>

          <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
            Cadastrar empresa
          </Button>
        </form>
      </div>
    </div>
  )
}
