'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  role: string
  citySlug?: string // se já tem uma cidade única
}

/**
 * Redireciona automaticamente usuários logados na homepage para seu painel.
 * Clientes são redirecionados para a cidade salva no localStorage (se houver).
 */
export function HomeRedirect({ role, citySlug }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (role === 'SUPER_ADMIN' || role === 'CITY_ADMIN') {
      router.replace('/admin')
      return
    }
    if (role === 'COMPANY_OWNER') {
      router.replace('/dashboard')
      return
    }
    if (role === 'DELIVERY_DRIVER') {
      router.replace('/entregador')
      return
    }
    // CUSTOMER — usa cidade salva no browser
    if (role === 'CUSTOMER') {
      const saved = localStorage.getItem('cc_city')
      const dest = saved ? `/${saved}` : citySlug ? `/${citySlug}` : null
      if (dest) router.replace(dest)
    }
  }, [role, citySlug, router])

  return null
}
