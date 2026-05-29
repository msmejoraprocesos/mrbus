// @ts-nocheck
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LayoutDashboard, MapPin, Users, Truck, UserCircle,
  Wrench, ShieldCheck, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/trips',       label: 'Viajes',        icon: MapPin },
  { href: '/passengers',  label: 'Pasajeros',     icon: Users },
  { href: '/fleet',       label: 'Flotilla',      icon: Truck },
  { href: '/drivers',     label: 'Operadores',    icon: UserCircle },
  { href: '/maintenance', label: 'Mantenimiento', icon: Wrench,    roles: ['super_admin','admin','supervisor'] },
  { href: '/compliance',  label: 'Compliance',    icon: ShieldCheck, roles: ['super_admin','admin','supervisor','auditor'] },
  { href: '/settings',    label: 'Configuración', icon: Settings,  roles: ['super_admin','admin'] },
]

export default function AdminSidebar({ userRole }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visible = NAV.filter(item => !item.roles || item.roles.includes(userRole))

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-[#0a1628] text-white transition-all duration-200 relative',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center justify-center border-b border-white/10 py-4 px-3',
        collapsed ? 'px-2' : 'px-4'
      )}>
        {collapsed ? (
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            MB
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="MrBus"
            width={140}
            height={55}
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full
                   flex items-center justify-center shadow-md hover:bg-gray-50 z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-gray-500" />
          : <ChevronLeft className="w-3 h-3 text-gray-500" />
        }
      </button>
    </aside>
  )
}
