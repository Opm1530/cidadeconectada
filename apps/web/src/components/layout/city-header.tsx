'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, LogOut, ChevronDown, Search, Store, Bike } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'

interface CityHeaderProps {
  citySlug: string
  cityName: string
}

export function CityHeader({ citySlug, cityName }: CityHeaderProps) {
  const router = useRouter()
  const cart = useCartStore((s) => s.cart)
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const cartCount = cart?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0

  async function handleLogout() {
    await logout()
    toast.success('Até logo!')
    router.push(`/${citySlug}`)  // stays in city, never goes to /
  }

  const dashboardHref =
    user?.role === 'COMPANY_OWNER' ? '/dashboard' :
    user?.role === 'CITY_ADMIN' ? '/admin' :
    user?.role === 'SUPER_ADMIN' ? '/superadmin' : null

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo — only links within city, never to / */}
        <Link
          href={`/${citySlug}`}
          className="flex items-center gap-2.5 font-bold text-primary-600 text-lg shrink-0"
        >
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Store size={18} className="text-white" />
          </div>
          <span className="hidden sm:inline truncate max-w-[160px]">{cityName}</span>
        </Link>

        {/* Search bar — desktop */}
        <Link
          href={`/${citySlug}`}
          className="hidden md:flex flex-1 max-w-md items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-200 transition-colors cursor-text"
        >
          <Search size={16} />
          <span>Buscar lojas e serviços...</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Cart */}
          <Link
            href={`/${citySlug}/carrinho`}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ShoppingCart size={20} className="text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {/* User */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 text-xs font-bold">{user.name[0].toUpperCase()}</span>
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href={`/${citySlug}/pedidos`}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <ShoppingCart size={15} className="text-gray-400" />
                        Meus pedidos
                      </Link>
                      {dashboardHref && (
                        <Link
                          href={dashboardHref}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <Store size={15} className="text-gray-400" />
                          Painel
                        </Link>
                      )}
                      {/* Link de entregador para clientes comuns */}
                      {user.role === 'CUSTOMER' && (
                        <Link
                          href="/entregador/cadastro"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <Bike size={15} className="text-gray-400" />
                          Seja entregador
                        </Link>
                      )}
                      <hr className="my-1 border-gray-50" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href={`/login?redirect=/${citySlug}`}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
