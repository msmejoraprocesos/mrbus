'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initials, fullName } from '@/lib/utils/index'
import { LogOut, Bell, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

// Mapa de rutas → breadcrumb legible
const LABELS: Record<string, string> = {
  dashboard:    'Dashboard',
  comercial:    'Comercial',
  operacion:    'Operación',
  turismo:      'Turismo',
  personal:     'Personal',
  renta:        'Renta',
  paqueteria:   'Paquetería',
  flota:        'Flota',
  rrhh:         'RRHH',
  finanzas:     'Finanzas',
  admin:        'Administración',
  fiscal:       'Fiscal',
  bi:           'Inteligencia',
  settings:     'Configuración',
  crm:          'CRM',
  cotizacion:   'Cotizaciones',
  contratos:    'Contratos',
  servicios:    'Servicios',
  programacion: 'Programación',
  trafico:      'Tráfico',
  rutas:        'Rutas',
  control:      'Control',
  reservaciones:'Reservaciones',
  abordaje:     'Abordaje',
  paquetes:     'Paquetes',
  paradas:      'Paradas',
  asistencia:   'Asistencia',
  unidades:     'Unidades',
  combustible:  'Combustible',
  mantenimiento:'Mantenimiento',
  llantas:      'Llantas',
  operadores:   'Operadores',
  rh:           'Recursos Humanos',
  liquidaciones:'Liquidaciones',
  nomina:       'Nómina',
  cxc:          'Cuentas por Cobrar',
  cxp:          'Cuentas por Pagar',
  caja:         'Caja Chica',
  tesoreria:    'Tesorería',
  contabilidad: 'Contabilidad',
  presupuestos: 'Presupuestos',
  activos:      'Activo Fijo',
  compras:      'Compras',
  almacenes:    'Almacenes',
  inventarios:  'Inventarios',
  facturas:     'Facturación',
  cartaporte:   'Carta Porte',
  kpi:          'KPIs',
  rentabilidad: 'Rentabilidad',
  dashboards:   'Dashboards',
  alertas:      'Alertas',
  guias:        'Guías',
  entregas:     'Entregas',
  consolidacion:'Consolidación',
}

function useBreadcrumb() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  return parts.map(p => LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1))
}

export default function AdminTopbar({ user }: { user: { first_name?: string; last_name?: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const breadcrumb = useBreadcrumb()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sesión cerrada')
  }

  const name = fullName(user.first_name ?? null, user.last_name ?? null)
  const av = initials(user.first_name ?? null, user.last_name ?? null)

  return (
    <header className="bg-white border-b border-slate-100 px-5 py-0 h-12 flex items-center justify-between flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        {breadcrumb.map((label, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
            <span className={i === breadcrumb.length - 1 ? 'text-slate-700 font-medium' : ''}>
              {label}
            </span>
          </span>
        ))}
      </nav>

      {/* Acciones */}
      <div className="flex items-center gap-2">
        {/* Notificaciones (placeholder) */}
        <button className="relative p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* Avatar + nombre */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)' }}
          >
            {av}
          </div>
          <span className="text-[13px] font-medium text-slate-700 hidden sm:block">{name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
