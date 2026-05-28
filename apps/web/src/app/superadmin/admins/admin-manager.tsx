'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, UserCheck } from 'lucide-react'

interface City { id: string; name: string; state: string }
interface User { id: string; name: string; email: string; role: string }
interface CityAdmin {
  id: string
  user: User
  city: City
}

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  cityId: z.string().min(1, 'Selecione uma cidade'),
})

type FormData = z.infer<typeof schema>

export function AdminManager({ cityAdmins, cities, users }: { cityAdmins: CityAdmin[]; cities: City[]; users: User[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onAssign(data: FormData) {
    setCreating(true)
    try {
      await api.post('/api/superadmin/city-admins', data)
      toast.success('Administrador vinculado! O usuário precisa fazer login novamente para acessar o painel.')
      reset()
      setShowForm(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao vincular')
    } finally {
      setCreating(false)
    }
  }

  async function onRemove(cityAdminId: string) {
    setRemoving(cityAdminId)
    try {
      await api.delete(`/api/superadmin/city-admins/${cityAdminId}`)
      toast.success('Vínculo removido')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Vincular administrador
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-4">Vincular administrador a uma cidade</h2>
          <p className="text-xs text-gray-400 mb-3">O usuário já deve estar cadastrado no sistema. O perfil será promovido para Admin da Cidade automaticamente.</p>
          <form onSubmit={handleSubmit(onAssign)} className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">E-mail do usuário</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="admin@exemplo.com"
                list="users-list"
              />
              <datalist id="users-list">
                {users.map((u) => <option key={u.id} value={u.email}>{u.name}</option>)}
              </datalist>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cidade</label>
              <select
                {...register('cityId')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione...</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
                ))}
              </select>
              {errors.cityId && <p className="text-xs text-red-500 mt-1">{errors.cityId.message}</p>}
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" size="sm" loading={creating}>Vincular</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {cityAdmins.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhum administrador vinculado.</div>
        )}
        {cityAdmins.map((ca) => (
          <div key={ca.id} className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                <UserCheck size={15} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{ca.user.name}</p>
                <p className="text-xs text-gray-400">{ca.user.email} · {ca.city.name} — {ca.city.state}</p>
              </div>
            </div>
            <button
              onClick={() => onRemove(ca.id)}
              disabled={removing === ca.id}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
