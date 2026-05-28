'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, User, LogOut, ChevronDown, Store } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

interface HeaderProps {
  citySlug?: string
  cityName?: string
}

export function Header({ citySlug, cityName }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const cart = useCartStore((s) => s.cart)
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const cartCount = cart?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0

  async function handleLogout() {
    await logout()
    toast.success('Até logo!')
    router.push(citySlug ? `/${citySlug}` : '/')
  }

  const dashboardHref =
    user?.role === 'COMPANY_OWNER' ? '/dashboard' :
    user?.role === 'CITY_ADMIN' ? '/admin' :
    user?.role === 'SUPER_ADMIN' ? '/superadmin' : null

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo / cidade */}
        <Link
          href={citySlug ? `/${citySlug}` : '/'}
          className="flex items-center gap-2 font-bold text-primary-600 text-lg shrink-0"
        >
          <Store size={22} />
          <span className="hidden sm:inline">{cityName ?? 'Cidade Conectada'}</span>
        </Link>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {/* Carrinho */}
          {citySlug && (
            <Link
              href={`/${citySlug}/carrinho`}
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors',
                pathname.includes('/carrinho') && 'bg-primary-50 text-primary-600',
              )}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Usuário */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700"
              >
                <User size={16} />
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown size={14} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                    {dashboardHref && (
                      <Link
                        href={dashboardHref}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Store size={15} />
                        Painel
                      </Link>
                    )}
                    {citySlug && (
                      <Link
                        href={`/${citySlug}/pedidos`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <ShoppingCart size={15} />
                        Meus pedidos
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={15} />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href={`/login${citySlug ? `?city=${citySlug}` : ''}`}
              className="px-3 py-1.5 rounded-lg border border-primary-600 text-primary-600 text-sm font-medium hover:bg-primary-50 transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
