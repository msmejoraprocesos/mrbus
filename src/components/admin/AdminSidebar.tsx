'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { LayoutDashboard, MapPin, Users, Truck, UserCircle, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { href:'/dashboard',  label:'Dashboard',   icon:LayoutDashboard },
  { href:'/trips',      label:'Viajes',       icon:MapPin },
  { href:'/fleet',      label:'Flotilla',     icon:Truck },
  { href:'/drivers',    label:'Operadores',   icon:UserCircle },
  { href:'/settings',   label:'Configuración',icon:Settings },
]

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn('hidden md:flex flex-col bg-[#0a1628] text-white transition-all duration-200 relative', collapsed ? 'w-16' : 'w-56')}>
      <div className={cn('flex items-center justify-center border-b border-white/10 py-4', collapsed ? 'px-2' : 'px-4')}>
        {collapsed
          ? <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-bold text-sm">MB</div>
          : <Image src="/logo.png" alt="MrBus" width={140} height={56} className="object-contain" />
        }
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                collapsed && 'justify-center',
                active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white')}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md z-10">
        {collapsed ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
      </button>
    </aside>
  )
}
