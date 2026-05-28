'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  state: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
  maxDrivers: z.coerce.number().int().min(0).nullable(),
  freeCompanyRegistration: z.boolean(),
  // Rodapé
  footerAbout: z.string().max(500).nullable(),
  footerPhone: z.string().max(20).nullable(),
  footerEmail: z.string().email('E-mail inválido').nullable().or(z.literal('')),
  footerAddress: z.string().max(200).nullable(),
  footerInstagram: z.string().url('URL inválida').nullable().or(z.literal('')),
  footerFacebook: z.string().url('URL inválida').nullable().or(z.literal('')),
  footerWhatsapp: z.string().max(20).nullable(),
})

type FormData = z.infer<typeof schema>

interface City {
  id: string
  name: string
  state: string
  slug: string
  active: boolean
  maxDrivers: number | null
  freeCompanyRegistration: boolean
  footerAbout?: string | null
  footerPhone?: string | null
  footerEmail?: string | null
  footerAddress?: string | null
  footerInstagram?: string | null
  footerFacebook?: string | null
  footerWhatsapp?: string | null
}

export function CitySettingsForm({ city }: { city: City }) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: city.name,
      state: city.state,
      maxDrivers: city.maxDrivers,
      freeCompanyRegistration: city.freeCompanyRegistration,
      footerAbout: city.footerAbout ?? '',
      footerPhone: city.footerPhone ?? '',
      footerEmail: city.footerEmail ?? '',
      footerAddress: city.footerAddress ?? '',
      footerInstagram: city.footerInstagram ?? '',
      footerFacebook: city.footerFacebook ?? '',
      footerWhatsapp: city.footerWhatsapp ?? '',
    },
  })

  const freeReg = watch('freeCompanyRegistration')

  async function onSubmit(data: FormData) {
    setLoading(true)
    // Converte strings vazias para null
    const payload = {
      ...data,
      footerAbout: data.footerAbout || null,
      footerPhone: data.footerPhone || null,
      footerEmail: data.footerEmail || null,
      footerAddress: data.footerAddress || null,
      footerInstagram: data.footerInstagram || null,
      footerFacebook: data.footerFacebook || null,
      footerWhatsapp: data.footerWhatsapp || null,
    }
    try {
      await api.patch(`/api/cities/${city.slug}`, payload)
      toast.success('Configurações salvas!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Informações básicas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800 text-sm">Informações básicas</h2>
        <Input label="Nome da cidade" {...register('name')} error={errors.name?.message} />
        <Input
          label="Estado (sigla)"
          {...register('state')}
          error={errors.state?.message}
          maxLength={2}
          placeholder="SP"
        />
      </div>

      {/* Empresas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800 text-sm">Empresas</h2>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-700">Cadastro livre de empresas</p>
            <p className="text-xs text-gray-400">Qualquer empresa pode se cadastrar sem aprovação prévia</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={freeReg}
            onClick={() => setValue('freeCompanyRegistration', !freeReg)}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${freeReg ? 'bg-primary-600' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${freeReg ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </label>
      </div>

      {/* Entregadores */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-800 text-sm">Entregadores</h2>
        <div>
          <Input
            label="Limite de vagas para entregadores"
            type="number"
            min={0}
            {...register('maxDrivers')}
            error={errors.maxDrivers?.message}
            placeholder="Deixe vazio para sem limite"
          />
          <p className="text-xs text-gray-400 mt-1">Defina 0 ou deixe vazio para não limitar o número de entregadores.</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Rodapé da cidade</h2>
          <p className="text-xs text-gray-400 mt-0.5">Informações exibidas no rodapé do catálogo público</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sobre a cidade / prefeitura</label>
          <textarea
            {...register('footerAbout')}
            rows={3}
            placeholder="Breve descrição da cidade ou mensagem da prefeitura..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          {errors.footerAbout && <p className="text-xs text-red-500 mt-1">{errors.footerAbout.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Telefone de contato"
            {...register('footerPhone')}
            placeholder="(11) 3333-0000"
            error={errors.footerPhone?.message}
          />
          <Input
            label="E-mail de contato"
            {...register('footerEmail')}
            placeholder="prefeitura@cidade.gov.br"
            error={errors.footerEmail?.message}
          />
        </div>

        <Input
          label="Endereço"
          {...register('footerAddress')}
          placeholder="Rua da Prefeitura, 1 — Centro"
          error={errors.footerAddress?.message}
        />

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Instagram (URL completa)"
            {...register('footerInstagram')}
            placeholder="https://instagram.com/prefeitura"
            error={errors.footerInstagram?.message}
          />
          <Input
            label="Facebook (URL completa)"
            {...register('footerFacebook')}
            placeholder="https://facebook.com/prefeitura"
            error={errors.footerFacebook?.message}
          />
          <Input
            label="WhatsApp (número com DDD)"
            {...register('footerWhatsapp')}
            placeholder="11933330000"
            error={errors.footerWhatsapp?.message}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={loading}>
          Salvar configurações
        </Button>
      </div>
    </form>
  )
}
