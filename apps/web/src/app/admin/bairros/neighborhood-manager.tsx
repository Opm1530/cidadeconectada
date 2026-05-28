'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'

interface Neighborhood { id: string; name: string }

interface Props {
  cityId: string
  initialNeighborhoods: Neighborhood[]
}

export function NeighborhoodManager({ cityId, initialNeighborhoods }: Props) {
  const [neighborhoods, setNeighborhoods] = useState(initialNeighborhoods)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function addNeighborhood() {
    const name = newName.trim()
    if (!name) return
    if (neighborhoods.some((n) => n.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Bairro já cadastrado')
      return
    }

    setLoading(true)
    try {
      // Usa a API de cidades para criar bairro
      const result = await api.post<Neighborhood>(`/api/cities/neighborhoods`, { name, cityId })
      setNeighborhoods((prev) => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      toast.success(`Bairro "${name}" adicionado!`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setLoading(false)
    }
  }

  async function deleteNeighborhood(id: string, name: string) {
    setDeleting(id)
    try {
      await api.delete(`/api/cities/neighborhoods/${id}`)
      setNeighborhoods((prev) => prev.filter((n) => n.id !== id))
      toast.success(`Bairro "${name}" removido`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Adicionar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Adicionar bairro</p>
        <div className="flex gap-2">
          <Input
            placeholder="Nome do bairro"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNeighborhood()}
            className="flex-1"
          />
          <Button onClick={addNeighborhood} loading={loading} className="gap-1.5 shrink-0">
            <Plus size={15} />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {neighborhoods.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Nenhum bairro cadastrado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {neighborhoods.map((n) => (
              <li key={n.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-800">{n.name}</span>
                <button
                  onClick={() => deleteNeighborhood(n.id, n.name)}
                  disabled={deleting === n.id}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
