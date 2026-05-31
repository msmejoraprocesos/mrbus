'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/index'
import Image from 'next/image'
import {
  LayoutDashboard, MapPin, Truck, UserCircle, Settings,
  Briefcase, Users, Package, DollarSign, BarChart3,
  ChevronLeft, ChevronRight, Building2, FileText, Wrench
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',            icon: LayoutDashboard, group: null,       color: '#6B7280', bg: '#F3F4F6' },
  { href: '/comercial',  label: 'Comercial',             icon: Briefcase,       group: 'Negocio',  color: '#1D4ED8', bg: '#DBEAFE' },
  { href: '/operacion',  label: 'Operación',             icon: MapPin,          group: 'Negocio',  color: '#15803D', bg: '#DCFCE7' },
  { href: '/turismo',    label: 'Turismo',               icon: Building2,       group: 'Negocio',  color: '#0369A1', bg: '#E0F2FE' },
  { href: '/personal',   label: 'Personal',              icon: Users,           group: 'Negocio',  color: '#15803D', bg: '#DCFCE7' },
  { href: '/renta',      label: 'Renta',                 icon: Truck,           group: 'Negocio',  color: '#C2410C', bg: '#FFEDD5' },
  { href: '/paqueteria', label: 'Paquetería',            icon: Package,         group: 'Negocio',  color: '#475569', bg: '#F1F5F9' },
  { href: '/flota',      label: 'Flota',                 icon: Truck,           group: 'Recursos', color: '#7C3AED', bg: '#EDE9FE' },
  { href: '/rrhh',       label: 'RRHH',                  icon: UserCircle,      group: 'Recursos', color: '#BE123C', bg: '#FFE4E6' },
  { href: '/finanzas',   label: 'Finanzas',              icon: DollarSign,      group: 'Recursos', color: '#0F766E', bg: '#CCFBF1' },
  { href: '/admin',      label: 'Administración',        icon: Wrench,          group: 'Recursos', color: '#374151', bg: '#F1F5F9' },
  { href: '/fiscal',     label: 'Fiscal',                icon: FileText,        group: 'Recursos', color: '#C2410C', bg: '#FFEDD5' },
  { href: '/bi',         label: 'Inteligencia',          icon: BarChart3,       group: 'Análisis', color: '#4338CA', bg: '#E0E7FF' },
  { href: '/settings',   label: 'Configuración',         icon: Settings,        group: null,       color: '#6B7280', bg: '#F3F4F6' },
]

const GROUPS = ['Negocio', 'Recursos', 'Análisis']
const GROUP_LABEL_COLOR: Record<string, string> = {
  'Negocio':  'text-blue-600',
  'Recursos': 'text-purple-600',
  'Análisis': 'text-indigo-600',
}

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  function NavItem({ item }: { item: typeof NAV[0] }) {
    const Icon = item.icon
    const active = item.href === '/dashboard'
      ? pathname === item.href
      : pathname.startsWith(item.href)
    return (
      <Link href={item.href} title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
          collapsed && 'justify-center',
          active ? 'shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        )}
        style={active ? { backgroundColor: item.bg, color: item.color } : {}}>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0')}
          style={active ? { backgroundColor: item.color, color: '#fff' } : { backgroundColor: 'transparent' }}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && active && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }} />
        )}
      </Link>
    )
  }

  return (
    <aside className={cn('hidden md:flex flex-col bg-white border-r border-gray-100 transition-all duration-200 relative flex-shrink-0')}
      style={{ width: collapsed ? 60 : 216 }}>
      <div className={cn('flex items-center border-b border-gray-100 py-3', collapsed ? 'justify-center px-2' : 'px-3')}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-[#0F2D52] flex items-center justify-center">
            <span className="text-white font-bold text-xs">MB</span>
          </div>
        ) : (
          <Image src="/logo-mrbus.png" alt="MrBus" width={144} height={58} className="object-contain" priority />
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
        <NavItem item={NAV[0]} />
        {GROUPS.map(group => (
          <div key={group} className="mt-3">
            {!collapsed && (
              <p className={cn('text-[9px] font-bold uppercase tracking-widest px-2 mb-1', GROUP_LABEL_COLOR[group])}>
                {group}
              </p>
            )}
            {collapsed && <div className="border-t border-gray-100 my-2" />}
            <div className="space-y-0.5">
              {NAV.filter(i => i.group === group).map(item => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3 border-t border-gray-100 pt-2">
          <NavItem item={NAV[NAV.length - 1]} />
        </div>
      </nav>
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md z-10 transition-all">
        {collapsed ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronLeft className="w-3 h-3 text-gray-400" />}
      </button>
    </aside>
  )
}
