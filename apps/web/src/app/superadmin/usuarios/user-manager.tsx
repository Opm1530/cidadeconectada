'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Search, Trash2, ShieldCheck, User, Store, Truck, Shield } from 'lucide-react'
import { formatDate } from '@cc/shared'

type Role = 'SUPER_ADMIN' | 'CITY_ADMIN' | 'COMPANY_OWNER' | 'CUSTOMER' | 'DELIVERY_DRIVER'

interface UserItem {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  city: { id: string; name: string; state: string } | null
  company: { id: string; name: string; active: boolean } | null
  _count: { orders: number }
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  SUPER_ADMIN:      { label: 'Super Admin',  color: 'bg-yellow-100 text-yellow-700', icon: Shield },
  CITY_ADMIN:       { label: 'Admin Cidade', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
  COMPANY_OWNER:    { label: 'Lojista',      color: 'bg-blue-100 text-blue-700',     icon: Store },
  DELIVERY_DRIVER:  { label: 'Entregador',   color: 'bg-green-100 text-green-700',   icon: Truck },
  CUSTOMER:         { label: 'Cliente',      color: 'bg-gray-100 text-gray-600',     icon: User },
}

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'CITY_ADMIN', 'COMPANY_OWNER', 'DELIVERY_DRIVER', 'CUSTOMER']

export function UserManager({ users: initialUsers }: { users: UserItem[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [changing, setChanging] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchQ = !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
      const matchRole = !roleFilter || u.role === roleFilter
      return matchQ && matchRole
    })
  }, [initialUsers, q, roleFilter])

  async function handleDelete(user: UserItem) {
    if (!confirm(`Apagar usuário "${user.name}"?\n\nEsta ação não pode ser desfeita.`)) return
    setDeleting(user.id)
    try {
      await api.delete(`/api/superadmin/users/${user.id}`)
      toast.success('Usuário apagado.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao apagar')
    } finally {
      setDeleting(null)
    }
  }

  async function handleRoleChange(user: UserItem, role: Role) {
    if (!confirm(`Alterar o perfil de "${user.name}" para ${ROLE_CONFIG[role].label}?`)) return
    setChanging(user.id)
    try {
      await api.patch(`/api/superadmin/users/${user.id}`, { role })
      toast.success('Perfil atualizado.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setChanging(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400 text-gray-700"
        >
          <option value="">Todos os perfis</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
          ))}
        </select>
      </div>

      {/* Contagem */}
      <p className="text-xs text-gray-400">{filtered.length} usuário(s) encontrado(s)</p>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</div>
        )}
        {filtered.map((user) => {
          const cfg = ROLE_CONFIG[user.role]
          const Icon = cfg.icon
          return (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon size={15} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {user.city ? `${user.city.name}/${user.city.state}` : 'Sem cidade'}
                  {user.company ? ` · Loja: ${user.company.name}` : ''}
                  {' · '}{user._count.orders} pedido(s)
                  {' · '}Desde {formatDate(user.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Trocar perfil */}
                <select
                  value={user.role}
                  disabled={changing === user.id}
                  onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400 text-gray-600 disabled:opacity-50"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>

                {/* Apagar */}
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deleting === user.id || user.role === 'SUPER_ADMIN'}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  title={user._count.orders > 0 ? 'Usuário com pedidos — só desative' : 'Apagar usuário'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
