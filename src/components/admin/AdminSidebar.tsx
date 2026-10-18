'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/index'
import Image from 'next/image'
import {
  LayoutDashboard, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Briefcase, Bus, Star, Users, Truck, Package,
  Wrench, UserCircle, DollarSign, Boxes, Receipt, BarChart3,
  FileText, Map, ClipboardList, Navigation, Activity,
  Ticket, MapPin, UserCheck,
  Fuel, Circle,
  UserCog, Banknote, CreditCard, PiggyBank, BookOpen, TrendingUp, TrendingDown, FileBarChart,
  Building2, Archive, ShoppingCart, Warehouse, CheckSquare,
  FileBadge, Bell, PieChart,
  Ship, PackageCheck, Layers, Calendar, Calculator,
} from 'lucide-react'
import { useState } from 'react'

/* ─── Paleta ───────────────────────────────────────────────────── */
const C = { sidebar: '#0F172A', hover: '#1E293B', border: '#1E293B', mute: '#475569' }

/* ─── Tipos ────────────────────────────────────────────────────── */
type Sub  = { href: string; label: string; icon: React.ElementType }
type Mod  = { href: string; label: string; icon: React.ElementType; dot: string; activeBg: string; subs: Sub[] }
type Grp  = { label: string; mods: Mod[] }

/* ─── Datos ────────────────────────────────────────────────────── */
const GROUPS: Grp[] = [
  {
    label: 'Negocio',
    mods: [
      {
        href: '/comercial', label: 'Comercial', icon: Briefcase,
        dot: '#3B82F6', activeBg: 'rgba(59,130,246,0.15)',
        subs: [
          { href: '/comercial/crm',             label: 'CRM / Leads',    icon: Users },
          { href: '/comercial/cotizacion/list',  label: 'Cotizaciones',   icon: FileText },
          { href: '/comercial/contratos',        label: 'Contratos',      icon: ClipboardList },
          { href: '/comercial/seguimiento',      label: 'Seguimiento',    icon: Activity },
        ],
      },
      {
        href: '/operacion', label: 'Operación', icon: Bus,
        dot: '#22C55E', activeBg: 'rgba(34,197,94,0.15)',
        subs: [
          { href: '/operacion/servicios',        label: 'Servicios',      icon: Calendar },
          { href: '/operacion/trafico',          label: 'Tráfico',        icon: Navigation },
          { href: '/operacion/programacion',     label: 'Programación',   icon: ClipboardList },
          { href: '/operacion/rutas',            label: 'Rutas',          icon: Map },
          { href: '/operacion/control',          label: 'Control',        icon: Activity },
        ],
      },
      {
        href: '/turismo', label: 'Turismo', icon: Star,
        dot: '#06B6D4', activeBg: 'rgba(6,182,212,0.15)',
        subs: [
          { href: '/turismo/cotizador/lista',    label: 'Cotizador',      icon: Calculator },
          { href: '/turismo/reservaciones',      label: 'Reservaciones',  icon: Ticket },
          { href: '/turismo/paquetes',           label: 'Paquetes',       icon: Package },
          { href: '/turismo/abordaje',           label: 'Abordaje',       icon: UserCheck },
        ],
      },
      {
        href: '/personal', label: 'Personal', icon: Users,
        dot: '#10B981', activeBg: 'rgba(16,185,129,0.15)',
        subs: [
          { href: '/personal/rutas',             label: 'Rutas',          icon: Map },
          { href: '/personal/paradas',           label: 'Paradas',        icon: MapPin },
          { href: '/personal/asistencia',        label: 'Asistencia',     icon: UserCheck },
        ],
      },
      {
        href: '/renta', label: 'Renta', icon: Truck,
        dot: '#F97316', activeBg: 'rgba(249,115,22,0.15)',
        subs: [
          { href: '/renta/servicios',            label: 'Servicios',      icon: Calendar },
          { href: '/renta/control',              label: 'Control',        icon: Activity },
        ],
      },
      {
        href: '/paqueteria', label: 'Paquetería', icon: Package,
        dot: '#94A3B8', activeBg: 'rgba(148,163,184,0.15)',
        subs: [
          { href: '/paqueteria/guias',           label: 'Guías',          icon: FileText },
          { href: '/paqueteria/entregas',        label: 'Entregas',       icon: PackageCheck },
          { href: '/paqueteria/consolidacion',   label: 'Consolidación',  icon: Layers },
        ],
      },
    ],
  },
  {
    label: 'Recursos',
    mods: [
      {
        href: '/flota', label: 'Flota', icon: Wrench,
        dot: '#A855F7', activeBg: 'rgba(168,85,247,0.15)',
        subs: [
          { href: '/flota/unidades',             label: 'Unidades',       icon: Bus },
          { href: '/flota/combustible',          label: 'Combustible',    icon: Fuel },
          { href: '/flota/mantenimiento',        label: 'Mantenimiento',  icon: Wrench },
          { href: '/flota/llantas',              label: 'Llantas',        icon: Circle },
        ],
      },
      {
        href: '/rrhh', label: 'RRHH', icon: UserCircle,
        dot: '#F43F5E', activeBg: 'rgba(244,63,94,0.15)',
        subs: [
          { href: '/rrhh/operadores',            label: 'Operadores',     icon: UserCog },
          { href: '/rrhh/rh',                    label: 'Empleados',      icon: Users },
          { href: '/rrhh/nomina',                label: 'Nómina',         icon: Banknote },
          { href: '/rrhh/liquidaciones',         label: 'Liquidaciones',  icon: CreditCard },
        ],
      },
      {
        href: '/finanzas', label: 'Finanzas', icon: DollarSign,
        dot: '#14B8A6', activeBg: 'rgba(20,184,166,0.15)',
        subs: [
          { href: '/finanzas/cxc',               label: 'Por Cobrar',     icon: TrendingUp },
          { href: '/finanzas/cxp',               label: 'Por Pagar',      icon: TrendingDown },
          { href: '/finanzas/caja',              label: 'Caja Chica',     icon: PiggyBank },
          { href: '/finanzas/tesoreria',         label: 'Tesorería',      icon: Banknote },
          { href: '/finanzas/contabilidad',      label: 'Contabilidad',   icon: BookOpen },
          { href: '/finanzas/presupuestos',      label: 'Presupuestos',   icon: FileBarChart },
        ],
      },
      {
        href: '/admin', label: 'Administración', icon: Boxes,
        dot: '#6B7280', activeBg: 'rgba(107,114,128,0.15)',
        subs: [
          { href: '/admin/activos',              label: 'Activos Fijos',  icon: Building2 },
          { href: '/admin/almacenes',            label: 'Almacenes',      icon: Warehouse },
          { href: '/admin/inventarios',          label: 'Inventarios',    icon: Archive },
          { href: '/admin/compras',              label: 'Compras',        icon: ShoppingCart },
          { href: '/admin/aprobaciones',         label: 'Aprobaciones',   icon: CheckSquare },
        ],
      },
    ],
  },
  {
    label: 'Fiscal & BI',
    mods: [
      {
        href: '/fiscal', label: 'Fiscal', icon: Receipt,
        dot: '#EF4444', activeBg: 'rgba(239,68,68,0.15)',
        subs: [
          { href: '/fiscal/facturas',            label: 'Facturas CFDI',  icon: FileBadge },
          { href: '/fiscal/cartaporte',          label: 'Carta Porte',    icon: Ship },
        ],
      },
      {
        href: '/bi', label: 'Inteligencia', icon: BarChart3,
        dot: '#6366F1', activeBg: 'rgba(99,102,241,0.15)',
        subs: [
          { href: '/bi/dashboards',              label: 'Dashboards',     icon: PieChart },
          { href: '/bi/kpi',                     label: 'KPIs',           icon: TrendingUp },
          { href: '/bi/rentabilidad',            label: 'Rentabilidad',   icon: BarChart3 },
          { href: '/bi/alertas',                 label: 'Alertas',        icon: Bell },
        ],
      },
    ],
  },
]

/* ─── Componente principal ─────────────────────────────────────── */
export default function AdminSidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Abre automáticamente el módulo activo
  const activeMod = GROUPS.flatMap(g => g.mods).find(m => pathname.startsWith(m.href))?.href ?? null
  const [openMod, setOpenMod] = useState<string | null>(activeMod)

  return (
    <aside
      style={{ backgroundColor: C.sidebar, borderRightColor: C.border, width: collapsed ? 56 : 224 }}
      className="flex-shrink-0 h-screen flex flex-col border-r transition-all duration-200 overflow-hidden"
    >
      {/* Logo */}
      <div
        className={cn('flex items-center border-b px-3 py-3 flex-shrink-0', collapsed ? 'justify-center' : 'gap-2')}
        style={{ borderBottomColor: C.border }}
      >
        {!collapsed
          ? <Image src="/logo-white.png" alt="MrBus" width={110} height={32} className="object-contain" />
          : <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-700"><Bus size={16} className="text-white" /></div>
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5">

        {/* Dashboard */}
        <SimpleLink href="/dashboard" label="Dashboard" icon={LayoutDashboard}
          dot="#94A3B8" activeBg="rgba(148,163,184,0.12)" pathname={pathname} collapsed={collapsed} />

        {/* Grupos */}
        {GROUPS.map(grp => (
          <div key={grp.label} className="mt-3">
            {/* Encabezado de grupo */}
            {!collapsed && (
              <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold tracking-widest uppercase select-none"
                style={{ color: C.mute }}>
                {grp.label}
              </p>
            )}
            {collapsed && <div className="border-t mx-1 my-1.5" style={{ borderColor: C.border }} />}

            {/* Módulos del grupo */}
            <div className="space-y-0.5">
              {grp.mods.map(mod => {
                const isOpen   = openMod === mod.href && !collapsed
                const isActive = pathname.startsWith(mod.href)
                const Icon     = mod.icon

                return (
                  <div key={mod.href}>
                    {/* Cabecera del módulo */}
                    <button
                      onClick={() => !collapsed && setOpenMod(p => p === mod.href ? null : mod.href)}
                      title={collapsed ? mod.label : undefined}
                      style={isActive ? { backgroundColor: mod.activeBg } : undefined}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 group relative',
                        collapsed ? 'justify-center' : 'justify-between',
                        isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                      )}
                    >
                      {/* Barra activa */}
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                          style={{ backgroundColor: mod.dot }} />
                      )}

                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all"
                          style={{ backgroundColor: isActive ? mod.dot : 'rgba(255,255,255,0.07)', color: isActive ? '#fff' : mod.dot }}>
                          <Icon size={13} />
                        </span>
                        {!collapsed && <span className="truncate leading-none">{mod.label}</span>}
                      </div>

                      {!collapsed && (
                        <ChevronDown size={12} className={cn('flex-shrink-0 text-slate-600 transition-transform duration-200', isOpen && 'rotate-180')} />
                      )}

                      {/* Tooltip colapsado */}
                      {collapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {mod.label}
                        </span>
                      )}
                    </button>

                    {/* Subítems */}
                    {isOpen && (
                      <div className="ml-4 pl-2.5 mt-0.5 mb-1 border-l space-y-0.5"
                        style={{ borderColor: mod.dot + '35' }}>
                        {mod.subs.map(sub => {
                          const SIcon  = sub.icon
                          const active = pathname === sub.href || pathname.startsWith(sub.href + '/')
                          return (
                            <Link key={sub.href} href={sub.href}
                              style={active ? { backgroundColor: mod.activeBg } : undefined}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] font-medium transition-all',
                                active ? 'text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
                              )}
                            >
                              <SIcon size={12} className="flex-shrink-0" style={{ color: active ? '#fff' : mod.dot + 'CC' }} />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Configuración */}
        <div className="mt-3 pt-2 border-t" style={{ borderColor: C.border }}>
          <SimpleLink href="/settings" label="Configuración" icon={Settings}
            dot="#94A3B8" activeBg="rgba(148,163,184,0.12)" pathname={pathname} collapsed={collapsed} />
        </div>
      </nav>

      {/* Colapsar */}
      <div className="flex-shrink-0 border-t p-2" style={{ borderTopColor: C.border }}>
        <button onClick={() => setCollapsed(p => !p)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all">
          {collapsed ? <ChevronRight size={14} className="mx-auto" /> : <><ChevronLeft size={14} /><span>Colapsar</span></>}
        </button>
      </div>
    </aside>
  )
}

/* ─── Link simple sin hijos ────────────────────────────────────── */
function SimpleLink({ href, label, icon: Icon, dot, activeBg, pathname, collapsed }: {
  href: string; label: string; icon: React.ElementType
  dot: string; activeBg: string; pathname: string; collapsed: boolean
}) {
  const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  return (
    <Link href={href} title={collapsed ? label : undefined}
      style={active ? { backgroundColor: activeBg } : undefined}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] font-medium transition-all group relative',
        collapsed ? 'justify-center' : '',
        active ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
      )}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{ backgroundColor: dot }} />
      )}
      <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center"
        style={{ backgroundColor: active ? dot : 'rgba(255,255,255,0.07)', color: active ? '#fff' : dot }}>
        <Icon size={13} />
      </span>
      {!collapsed && <span className="truncate leading-none">{label}</span>}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </Link>
  )
}
