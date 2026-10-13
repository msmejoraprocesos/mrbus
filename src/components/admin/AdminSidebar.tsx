'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/index'
import Image from 'next/image'
import {
  LayoutDashboard, MapPin, Truck, UserCircle, Settings,
  Briefcase, Users, Package, DollarSign, BarChart3,
  ChevronLeft, ChevronRight, Building2, FileText, Wrench,
  Bus, Ship, Star, Receipt, Boxes
} from 'lucide-react'
import { useState } from 'react'

/* ─── Paleta de colores MrBus ──────────────────────────────────── */
const C = {
  sidebar:  '#0F172A',   // Azul marino profundo — fondo sidebar
  hover:    '#1E293B',   // Hover sobre ítem
  active:   '#1E40AF',   // Ítem activo — azul MrBus
  accent:   '#22C55E',   // Verde MrBus
  text:     '#CBD5E1',   // Texto normal
  textMute: '#64748B',   // Texto de grupos/labels
  border:   '#1E293B',   // Separador
  white:    '#FFFFFF',
}

/* ─── Mapa de color por suite ───────────────────────────────────── */
const SUITE_COLORS: Record<string, { dot: string; activeBg: string }> = {
  '/comercial':  { dot: '#3B82F6', activeBg: 'rgba(59,130,246,0.15)' },
  '/operacion':  { dot: '#22C55E', activeBg: 'rgba(34,197,94,0.15)' },
  '/turismo':    { dot: '#06B6D4', activeBg: 'rgba(6,182,212,0.15)' },
  '/personal':   { dot: '#10B981', activeBg: 'rgba(16,185,129,0.15)' },
  '/renta':      { dot: '#F97316', activeBg: 'rgba(249,115,22,0.15)' },
  '/paqueteria': { dot: '#94A3B8', activeBg: 'rgba(148,163,184,0.15)' },
  '/flota':      { dot: '#A855F7', activeBg: 'rgba(168,85,247,0.15)' },
  '/rrhh':       { dot: '#F43F5E', activeBg: 'rgba(244,63,94,0.15)' },
  '/finanzas':   { dot: '#14B8A6', activeBg: 'rgba(20,184,166,0.15)' },
  '/admin':      { dot: '#6B7280', activeBg: 'rgba(107,114,128,0.15)' },
  '/fiscal':     { dot: '#EF4444', activeBg: 'rgba(239,68,68,0.15)' },
  '/bi':         { dot: '#6366F1', activeBg: 'rgba(99,102,241,0.15)' },
  '/dashboard':  { dot: '#94A3B8', activeBg: 'rgba(148,163,184,0.12)' },
  '/settings':   { dot: '#94A3B8', activeBg: 'rgba(148,163,184,0.12)' },
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard, group: null        },
  { href: '/comercial',  label: 'Comercial',        icon: Briefcase,       group: 'Negocio'   },
  { href: '/operacion',  label: 'Operación',        icon: Bus,             group: 'Negocio'   },
  { href: '/turismo',    label: 'Turismo',           icon: Star,            group: 'Negocio'   },
  { href: '/personal',   label: 'Personal',          icon: Users,           group: 'Negocio'   },
  { href: '/renta',      label: 'Renta',             icon: Truck,           group: 'Negocio'   },
  { href: '/paqueteria', label: 'Paquetería',        icon: Package,         group: 'Negocio'   },
  { href: '/flota',      label: 'Flota',             icon: Wrench,          group: 'Recursos'  },
  { href: '/rrhh',       label: 'RRHH',              icon: UserCircle,      group: 'Recursos'  },
  { href: '/finanzas',   label: 'Finanzas',          icon: DollarSign,      group: 'Recursos'  },
  { href: '/admin',      label: 'Administración',   icon: Boxes,           group: 'Recursos'  },
  { href: '/fiscal',     label: 'Fiscal',            icon: Receipt,         group: 'Recursos'  },
  { href: '/bi',         label: 'Inteligencia',      icon: BarChart3,       group: 'Análisis'  },
  { href: '/settings',   label: 'Configuración',     icon: Settings,        group: null        },
]

const GROUPS = ['Negocio', 'Recursos', 'Análisis']

export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  function NavItem({ item }: { item: typeof NAV[0] }) {
    const Icon = item.icon
    const active = item.href === '/dashboard'
      ? pathname === item.href
      : pathname.startsWith(item.href)
    const colors = SUITE_COLORS[item.href] ?? { dot: '#94A3B8', activeBg: 'rgba(148,163,184,0.12)' }

    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        style={active ? { backgroundColor: colors.activeBg } : undefined}
        className={cn(
          'flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative',
          collapsed ? 'justify-center' : '',
          active
            ? 'text-white'
            : 'text-slate-400 hover:text-slate-200',
        )}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = C.hover }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
      >
        {/* Indicador de actividad */}
        {active && !collapsed && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
            style={{ backgroundColor: colors.dot }}
          />
        )}

        {/* Ícono con fondo de color de suite */}
        <span
          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all"
          style={{
            backgroundColor: active ? colors.dot : 'rgba(255,255,255,0.06)',
            color: active ? '#fff' : colors.dot,
          }}
        >
          <Icon size={14} />
        </span>

        {!collapsed && (
          <span className="truncate leading-none">{item.label}</span>
        )}

        {/* Tooltip al colapsar */}
        {collapsed && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {item.label}
          </span>
        )}
      </Link>
    )
  }

  const standalone = NAV.filter(n => !n.group)
  const grouped = GROUPS.map(g => ({ group: g, items: NAV.filter(n => n.group === g) }))

  return (
    <aside
      style={{ backgroundColor: C.sidebar, borderRightColor: C.border, width: collapsed ? 56 : 200 }}
      className="flex-shrink-0 h-screen flex flex-col border-r transition-all duration-200 overflow-hidden"
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b px-3 py-3 flex-shrink-0',
        collapsed ? 'justify-center' : 'gap-2'
      )}
        style={{ borderBottomColor: C.border }}
      >
        {!collapsed ? (
          <Image src="/logo-white.png" alt="MrBus" width={110} height={32} className="object-contain" />
        ) : (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1D4ED8' }}>
            <Bus size={16} className="text-white" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1.5 space-y-0.5">
        {/* Items sin grupo */}
        {standalone.map(item => <NavItem key={item.href} item={item} />)}

        {/* Grupos */}
        {grouped.map(({ group, items }) => (
          <div key={group} className="mt-3">
            {!collapsed && (
              <p
                className="px-2 py-1 text-[10px] font-semibold tracking-widest uppercase select-none"
                style={{ color: C.textMute }}
              >
                {group}
              </p>
            )}
            {collapsed && <div className="border-t mx-1 my-1.5" style={{ borderColor: C.border }} />}
            {items.map(item => <NavItem key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      {/* Footer — collapse toggle */}
      <div
        className="flex-shrink-0 border-t p-2"
        style={{ borderTopColor: C.border }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all',
            'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
          )}
        >
          {collapsed
            ? <ChevronRight size={14} className="mx-auto" />
            : <><ChevronLeft size={14} /><span>Colapsar</span></>
          }
        </button>
      </div>
    </aside>
  )
}
