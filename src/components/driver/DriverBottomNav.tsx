// @ts-nocheck
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, AlertTriangle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/driver/home',    icon: Home,          label: 'Inicio' },
  { href: '/driver/trip',    icon: MapPin,         label: 'Viaje' },
  { href: '/driver/profile', icon: User,           label: 'Perfil' },
]

export default function DriverBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto
                    bg-white border-t border-gray-200 px-2 pb-safe
                    grid grid-cols-3 z-50 shadow-lg">
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href}
            className={cn('flex flex-col items-center justify-center py-3 gap-1 transition-colors',
              active ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
