'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

interface Option { value: string; label: string }

export function OrderFilters({ options, current }: { options: Option[]; current: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => {
            const sp = new URLSearchParams()
            if (opt.value) sp.set('status', opt.value)
            router.push(`${pathname}?${sp.toString()}`)
          }}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            current === opt.value
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
