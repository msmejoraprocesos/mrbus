'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LayoutDashboard, MapPin, Truck, UserCircle, Settings,
  Briefcase, Users, Package, DollarSign, BarChart3,
  ChevronLeft, ChevronRight, Building2, FileText, Wrench
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',             icon: LayoutDashboard, group: null },
  { href: '/comercial',  label: 'Comercial',              icon: Briefcase,       group: 'Negocio' },
  { href: '/operacion',  label: 'Operación',              icon: MapPin,          group: 'Negocio' },
  { href: '/turismo',    label: 'Turismo',                icon: Building2,       group: 'Negocio' },
  { href: '/personal',   label: 'Personal',               icon: Users,           group: 'Negocio' },
  { href: '/renta',      label: 'Renta',                  icon: Truck,           group: 'Negocio' },
  { href: '/paqueteria', label: 'Paquetería',             icon: Package,         group: 'Negocio' },
  { href: '/flota',      label: 'Flota',                  icon: Truck,           group: 'Recursos' },
  { href: '/rrhh',       label: 'RRHH',                   icon: UserCircle,      group: 'Recursos' },
  { href: '/finanzas',   label: 'Finanzas',               icon: DollarSign,      group: 'Recursos' },
  { href: '/admin',      label: 'Administración',         icon: Wrench,          group: 'Recursos' },
  { href: '/fiscal',     label: 'Fiscal',                 icon: FileText,        group: 'Recursos' },
  { href: '/bi',         label: 'Inteligencia',           icon: BarChart3,       group: 'Análisis' },
  { href: '/settings',   label: 'Configuración',          icon: Settings,        group: null },
]

const GROUP_COLORS: Record<string, string> = {
  'Negocio':  'text-[#0F2D52]',
  'Recursos': 'text-[#1B5E20]',
  'Análisis': 'text-[#4A148C]',
}

const ACTIVE_COLORS: Record<string, string> = {
  'Negocio':  'bg-[#0F2D52]/8 text-[#0F2D52]',
  'Recursos': 'bg-[#1B5E20]/8 text-[#1B5E20]',
  'Análisis': 'bg-[#4A148C]/8 text-[#4A148C]',
}

const ACTIVE_DOT: Record<string, string> = {
  'Negocio':  'bg-[#0F2D52]',
  'Recursos': 'bg-[#1B5E20]',
  'Análisis': 'bg-[#4A148C]',
}

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const groups = ['Negocio', 'Recursos', 'Análisis']

  function getGroup(href: string) {
    return NAV.find(i => i.href === href)?.group ?? 'Negocio'
  }

  return (
    <aside className={cn(
      'hidden md:flex flex-col bg-white border-r border-gray-100 transition-all duration-200 relative flex-shrink-0 shadow-sm',
    )} style={{ width: collapsed ? 64 : 220 }}>

      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-gray-100 py-3',
        collapsed ? 'justify-center px-2' : 'px-4'
      )}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-[#0F2D52] flex items-center justify-center">
            <span className="text-white font-bold text-xs">MB</span>
          </div>
        ) : (
          <Image
            src="/logo-mrbus.png"
            alt="MrBus"
            width={148}
            height={60}
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

        {/* Dashboard */}
        {(() => {
          const item = NAV[0]
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                collapsed && 'justify-center',
                active
                  ? 'bg-[#0F2D52]/8 text-[#0F2D52]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}>
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#0F2D52]' : 'text-gray-400')} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0F2D52]" />}
            </Link>
          )
        })()}

        {/* Grupos */}
        {groups.map(group => {
          const items = NAV.filter(i => i.group === group)
          return (
            <div key={group} className="mt-4">
              {!collapsed && (
                <p className={cn(
                  'text-[9px] font-bold uppercase tracking-widest px-2.5 mb-1.5',
                  GROUP_COLORS[group]
                )}>
                  {group}
                </p>
              )}
              {collapsed && <div className="border-t border-gray-100 my-2" />}
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href)
                  const grp = item.group ?? 'Negocio'
                  return (
                    <Link key={item.href} href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                        collapsed && 'justify-center',
                        active
                          ? ACTIVE_COLORS[grp]
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      )}>
                      <Icon className={cn(
                        'w-4 h-4 flex-shrink-0',
                        active ? '' : 'text-gray-400'
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && active && (
                        <div className={cn('ml-auto w-1.5 h-1.5 rounded-full', ACTIVE_DOT[grp])} />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Settings */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          {(() => {
            const item = NAV[NAV.length - 1]
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                  collapsed && 'justify-center',
                  active
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })()}
        </div>
      </nav>

      {/* Colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full
                   flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-50 z-10 transition-all">
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-gray-400" />
          : <ChevronLeft className="w-3 h-3 text-gray-400" />
        }
      </button>
    </aside>
  )
}
