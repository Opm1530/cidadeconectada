'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-client'

const schema = z.object({
  cityId:      z.string().min(1, 'Selecione a cidade'),
  name:        z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  category:    z.string().optional(),
  description: z.string().optional(),
  phone:       z.string().optional(),
  whatsapp:    z.string().optional(),
  address:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

const CATEGORIES = [
  'Restaurante', 'Lanchonete', 'Pizzaria', 'Mercado', 'Farmácia',
  'Pet Shop', 'Beleza', 'Eletrônicos', 'Roupas', 'Serviços', 'Outro',
]

interface City { id: string; name: string; state: string }

export function CadastrarLojaForm({ cities, userName }: { cities: City[]; userName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await api.post('/api/companies', data)
      setDone(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar loja')
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso
  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Loja criada com sucesso!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Faça login novamente para acessar seu painel e começar a vender.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push('/login?redirect=/dashboard')}
        >
          Entrar no painel →
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <p className="text-sm text-gray-500 mb-5">
        Olá, <strong className="text-gray-800">{userName}</strong>! Preencha os dados da sua loja:
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* Cidade */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Cidade <span className="text-red-500">*</span>
          </label>
          <select
            {...register('cityId')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Selecione a cidade…</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
            ))}
          </select>
          {errors.cityId && <p className="text-xs text-red-500 mt-1">{errors.cityId.message}</p>}
        </div>

        {/* Nome */}
        <Input
          label="Nome da loja *"
          placeholder="Ex: Lanchonete do João"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Categoria */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
          <select
            {...register('category')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Selecione (opcional)</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
          <textarea
            {...register('description')}
            placeholder="Descreva sua loja brevemente…"
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 resize-none focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Telefone e WhatsApp */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Telefone" type="tel" placeholder="(11) 3333-3333" {...register('phone')} />
          <Input label="WhatsApp" type="tel" placeholder="(11) 99999-9999" {...register('whatsapp')} />
        </div>

        {/* Endereço */}
        <Input label="Endereço" placeholder="Rua, número, bairro…" {...register('address')} />

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
          💡 Após o cadastro, configure formas de pagamento, entrega e adicione seus produtos no painel.
        </div>

        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Criar minha loja
        </Button>
      </form>
    </div>
  )
}
