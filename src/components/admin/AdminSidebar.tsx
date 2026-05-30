'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LayoutDashboard, MapPin, Truck, UserCircle, Settings,
  Briefcase, Users, Package, DollarSign, BarChart3,
  ChevronLeft, ChevronRight, Building2, FileText
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard, group: null },
  { href: '/comercial',   label: 'Comercial',       icon: Briefcase,       group: 'Negocio' },
  { href: '/operacion',   label: 'Operación',       icon: MapPin,          group: 'Negocio' },
  { href: '/turismo',     label: 'Turismo',         icon: Building2,       group: 'Negocio' },
  { href: '/personal',    label: 'Personal',        icon: Users,           group: 'Negocio' },
  { href: '/renta',       label: 'Renta',           icon: Truck,           group: 'Negocio' },
  { href: '/paqueteria',  label: 'Paquetería',      icon: Package,         group: 'Negocio' },
  { href: '/flota',       label: 'Flota',           icon: Truck,           group: 'Recursos' },
  { href: '/rrhh',        label: 'RRHH',            icon: UserCircle,      group: 'Recursos' },
  { href: '/finanzas',    label: 'Finanzas',        icon: DollarSign,      group: 'Recursos' },
  { href: '/admin',       label: 'Administración',  icon: Building2,       group: 'Recursos' },
  { href: '/fiscal',      label: 'Fiscal',          icon: FileText,        group: 'Recursos' },
  { href: '/bi',          label: 'Inteligencia',    icon: BarChart3,       group: 'Análisis' },
  { href: '/settings',    label: 'Configuración',   icon: Settings,        group: null },
]

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const groups = ['Negocio', 'Recursos', 'Análisis']

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-[#0a1628] text-white transition-all duration-200 relative flex-shrink-0',
      collapsed ? 'w-16' : 'w-58'
    )} style={{ width: collapsed ? 64 : 220 }}>

      {/* Logo */}
      <div className={cn(
        'flex items-center justify-center border-b border-white/10 py-3',
        collapsed ? 'px-2' : 'px-4'
      )}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/10">
            <span className="text-white font-bold text-xs">MB</span>
          </div>
        ) : (
          <Image
            src="/logo-mrbus.png"
            alt="MrBus"
            width={150}
            height={65}
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {/* Dashboard solo */}
        {NAV.filter(i => !i.group).slice(0,1).map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                collapsed && 'justify-center',
                active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Grupos */}
        {groups.map(group => {
          const items = NAV.filter(i => i.group === group)
          return (
            <div key={group} className="mt-3">
              {!collapsed && (
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-2.5 mb-1">
                  {group}
                </p>
              )}
              {items.map(item => {
                const Icon = item.icon
                const active = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                      collapsed && 'justify-center',
                      active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}

        {/* Settings */}
        <div className="mt-3 border-t border-white/10 pt-2">
          {NAV.filter(i => !i.group).slice(1).map(item => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                  collapsed && 'justify-center',
                  active ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full
                   flex items-center justify-center shadow-md hover:bg-gray-50 z-10">
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-gray-500" />
          : <ChevronLeft className="w-3 h-3 text-gray-500" />
        }
      </button>
    </aside>
  )
}
