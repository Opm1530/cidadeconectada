'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Globe, Users, LogOut, ChevronRight, Menu, Shield, Store } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

interface SuperAdminShellProps {
  user: { name: string; email: string }
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/superadmin',          label: 'Visão geral',      icon: LayoutDashboard, exact: true },
  { href: '/superadmin/cidades',  label: 'Cidades',          icon: Globe },
  { href: '/superadmin/lojas',    label: 'Lojas',            icon: Store },
  { href: '/superadmin/usuarios', label: 'Usuários',         icon: Users },
  { href: '/superadmin/admins',   label: 'Administradores',  icon: Shield },
]

export function SuperAdminShell({ user, children }: SuperAdminShellProps) {
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
    <aside className="flex flex-col h-full w-60 bg-gray-900 text-white">
      <div className="px-5 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-base">
          <Shield size={18} />
          <span>Super Admin</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Cidade Conectada</p>
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
                active ? 'bg-yellow-400/10 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon size={17} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto text-yellow-400/60" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-700 pt-3 flex flex-col gap-1">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-gray-300 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 w-full"
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
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-gray-900 border-b border-gray-700">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm text-white">Super Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
