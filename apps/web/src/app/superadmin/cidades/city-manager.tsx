'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, ChevronDown, ChevronUp, Globe, Trash2 } from 'lucide-react'

interface CityAdmin {
  user: { id: string; name: string; email: string }
}

interface City {
  id: string
  name: string
  state: string
  slug: string
  active: boolean
  _count: { companies: number; drivers: number }
  cityAdmins: CityAdmin[]
}

const createSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  state: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
})

type CreateData = z.infer<typeof createSchema>

export function CityManager({ cities }: { cities: City[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateData>({
    resolver: zodResolver(createSchema),
  })

  async function onCreate(data: CreateData) {
    setCreating(true)
    try {
      await api.post('/api/cities', data)
      toast.success('Cidade criada!')
      reset()
      setShowForm(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar cidade')
    } finally {
      setCreating(false)
    }
  }

  async function deleteCity(city: City) {
    const total = city._count.companies + city._count.drivers
    if (total > 0) {
      toast.error(`Não é possível apagar: a cidade tem ${city._count.companies} empresa(s) e ${city._count.drivers} entregador(es). Desative-a ao invés disso.`)
      return
    }
    if (!confirm(`Apagar a cidade "${city.name} — ${city.state}"?\n\nEsta ação não pode ser desfeita.`)) return
    setDeleting(city.id)
    try {
      await api.delete(`/api/superadmin/cities/${city.id}`)
      toast.success('Cidade apagada.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao apagar')
    } finally {
      setDeleting(null)
    }
  }

  async function toggleCity(city: City) {
    setToggling(city.id)
    try {
      await api.patch(`/api/cities/${city.slug}`, { active: !city.active })
      toast.success(city.active ? 'Cidade desativada' : 'Cidade ativada')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Nova cidade
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Nova cidade</h2>
          <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-3">
            <Input label="Nome" {...register('name')} error={errors.name?.message} />
            <Input label="Estado (sigla)" {...register('state')} error={errors.state?.message} maxLength={2} placeholder="SP" />
            <Input label="Slug (URL)" {...register('slug')} error={errors.slug?.message} placeholder="sao-paulo" />
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" size="sm" loading={creating}>Criar</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {cities.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhuma cidade cadastrada.</div>
        )}
        {cities.map((city) => (
          <div key={city.id}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Globe size={17} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{city.name} — {city.state}</p>
                  <p className="text-xs text-gray-400">/{city.slug} · {city._count.companies} empresas · {city._count.drivers} entregadores</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${city.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {city.active ? 'Ativa' : 'Inativa'}
                </span>
                <Button
                  size="sm"
                  variant={city.active ? 'outline' : 'secondary'}
                  loading={toggling === city.id}
                  onClick={() => toggleCity(city)}
                >
                  {city.active ? 'Desativar' : 'Ativar'}
                </Button>
                <button
                  onClick={() => deleteCity(city)}
                  disabled={deleting === city.id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title={city._count.companies > 0 || city._count.drivers > 0 ? 'Cidade com dados — desative ao invés de apagar' : 'Apagar cidade'}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setExpanded(expanded === city.id ? null : city.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  {expanded === city.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expanded === city.id && (
              <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Administradores</p>
                {city.cityAdmins.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum administrador vinculado.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {city.cityAdmins.map((ca) => (
                      <div key={ca.user.id} className="text-xs text-gray-700">
                        {ca.user.name} — <span className="text-gray-400">{ca.user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
