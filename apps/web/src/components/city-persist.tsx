'use client'

import { useEffect } from 'react'

/**
 * Salva o slug da cidade atual no localStorage.
 * Usado no layout de cada cidade para que o próximo login redirecione
 * o cliente direto para a sua cidade sem precisar escolher novamente.
 */
export function CityPersist({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      localStorage.setItem('cc_city', slug)
    } catch {
      // localStorage pode não estar disponível (modo privado sem permissão)
    }
  }, [slug])

  return null
}
