'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Search, Trash2, Store, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatDate } from '@cc/shared'

interface CompanyItem {
  id: string
  name: string
  slug: string
  category: string | null
  active: boolean
  createdAt: string
  city: { id: string; name: string; state: string }
  owner: { id: string; name: string; email: string }
  _count: { orders: number; products: number }
}

interface City {
  id: string
  name: string
  state: string
}

export function CompanyManagerSuperadmin({
  companies: initialCompanies,
  cities,
}: {
  companies: CompanyItem[]
  cities: City[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return initialCompanies.filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.owner.name.toLowerCase().includes(q.toLowerCase())
      const matchCity = !cityFilter || c.city.id === cityFilter
      const matchStatus = !statusFilter || (statusFilter === 'active' ? c.active : !c.active)
      return matchQ && matchCity && matchStatus
    })
  }, [initialCompanies, q, cityFilter, statusFilter])

  async function handleToggle(company: CompanyItem) {
    setToggling(company.id)
    try {
      await api.patch(`/api/superadmin/companies/${company.id}`, { active: !company.active })
      toast.success(company.active ? 'Loja desativada.' : 'Loja ativada.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(company: CompanyItem) {
    if (company._count.orders > 0) {
      toast.error(`Esta loja tem ${company._count.orders} pedido(s) no histórico. Desative-a ao invés de apagar.`)
      return
    }
    if (!confirm(`Apagar a loja "${company.name}"?\n\nTodos os produtos serão removidos. Esta ação não pode ser desfeita.`)) return

    setDeleting(company.id)
    try {
      await api.delete(`/api/superadmin/companies/${company.id}`)
      toast.success('Loja apagada.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao apagar')
    } finally {
      setDeleting(null)
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
            placeholder="Buscar por nome ou dono…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400 text-gray-700"
        >
          <option value="">Todas as cidades</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.state}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400 text-gray-700"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} loja(s) encontrada(s)</p>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhuma loja encontrada.</div>
        )}
        {filtered.map((company) => (
          <div key={company.id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Store size={15} className="text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 truncate">{company.name}</p>
                {company.category && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{company.category}</span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${company.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {company.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                {company.city.name}/{company.city.state} · Dono: {company.owner.name}
              </p>
              <p className="text-xs text-gray-300 mt-0.5">
                {company._count.products} produto(s) · {company._count.orders} pedido(s) · Desde {formatDate(company.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Ativar/Desativar */}
              <button
                onClick={() => handleToggle(company)}
                disabled={toggling === company.id}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {company.active
                  ? <ToggleRight size={15} className="text-green-600" />
                  : <ToggleLeft size={15} />
                }
                {company.active ? 'Desativar' : 'Ativar'}
              </button>

              {/* Apagar */}
              <button
                onClick={() => handleDelete(company)}
                disabled={deleting === company.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                title={company._count.orders > 0 ? 'Loja com pedidos — use Desativar' : 'Apagar loja'}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
