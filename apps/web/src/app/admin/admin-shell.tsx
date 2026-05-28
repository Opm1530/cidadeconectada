'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Store, Truck, MapPin, Image, Settings,
  LogOut, ChevronRight, Menu, ExternalLink, Shield, BarChart3, Newspaper,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

interface AdminShellProps {
  city: { id: string; name: string; slug: string; active: boolean }
  user: { name: string; email: string; role: string }
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/empresas', label: 'Empresas', icon: Store },
  { href: '/admin/entregadores', label: 'Entregadores', icon: Truck },
  { href: '/admin/bairros', label: 'Bairros', icon: MapPin },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/noticias', label: 'Notícias', icon: Newspaper },
  { href: '/admin/enquetes', label: 'Enquetes', icon: BarChart3 },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export function AdminShell({ city, user, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    toast.success('Até logo!')
    router.push('/')
  }

  function isActive(item: (typeof NAV_ITEMS)[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-60 bg-white border-r border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-primary-600 font-bold text-base">
          <Shield size={18} />
          <span className="truncate">Admin</span>
        </div>
        <p className="text-sm font-medium text-gray-800 mt-1 truncate">{city.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', city.active ? 'bg-green-500' : 'bg-yellow-400')} />
          <span className="text-xs text-gray-400">{city.active ? 'Ativa' : 'Inativa'}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon size={17} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto text-primary-400" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 pt-3 flex flex-col gap-1">
        <Link
          href={`/${city.slug}`}
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50"
        >
          <ExternalLink size={14} />
          Ver cidade
        </Link>
        {user.role === 'SUPER_ADMIN' && (
          <Link
            href="/superadmin"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50"
          >
            <Shield size={14} />
            Super Admin
          </Link>
        )}
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-gray-700 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:flex flex-col"><Sidebar /></div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 shadow-xl"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-200">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm text-gray-800">Admin · {city.name}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
