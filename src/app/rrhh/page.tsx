import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserCircle, Users2, Banknote, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'RRHH — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const [driversRes, staffRes, liquidRes] = await Promise.all([
    supabase.from('drivers').select('id, status, license_expiry').order('last_name'),
    supabase.from('employees').select('id, status').eq('status', 'active'),
    supabase.from('payroll_settlements').select('id, status, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const drivers = driversRes.data ?? []
  const staff = staffRes.data ?? []
  const liquidations = liquidRes.data ?? []

  const activeDrivers = drivers.filter(d => d.status === 'active').length
  const inactiveDrivers = drivers.filter(d => d.status !== 'active').length

  // Check for expiring licenses (within 30 days)
  const today = new Date()
  const in30 = new Date(today)
  in30.setDate(today.getDate() + 30)
  const expiringLicenses = drivers.filter(d => {
    if (!d.license_expiry) return false
    const exp = new Date(d.license_expiry)
    return exp <= in30 && exp >= today
  }).length

  const pendingLiquidations = liquidations.filter(l => l.status === 'pending').length
  const activeStaff = staff.length

  const modules = [
    {
      name: 'Operadores',
      desc: 'Catálogo de operadores. Licencias, documentos y perfil de costos.',
      href: '/rrhh/operadores',
      icon: UserCircle,
      color: '#BE123C',
      bg: '#FFE4E6',
      stats: [`${activeDrivers} activos`, expiringLicenses > 0 ? `${expiringLicenses} licencias por vencer` : 'Licencias al día'],
      alert: expiringLicenses > 0,
    },
    {
      name: 'Recursos Humanos',
      desc: 'Personal administrativo. Contratos y asistencia.',
      href: '/rrhh/rh',
      icon: Users2,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: [`${activeStaff > 0 ? activeStaff : activeDrivers + inactiveDrivers} empleados`],
      alert: false,
    },
    {
      name: 'Liquidaciones',
      desc: 'Nómina de operadores. Descuentos, bonos y comprobantes.',
      href: '/rrhh/liquidaciones',
      icon: Banknote,
      color: '#16A34A',
      bg: '#F0FDF4',
      stats: [pendingLiquidations > 0 ? `${pendingLiquidations} pendientes` : 'Sin liquidaciones pendientes'],
      alert: pendingLiquidations > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Recursos Humanos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de operadores, personal y liquidaciones de nómina</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Operadores activos',    value: String(activeDrivers),        color: '#BE123C', bg: '#FFE4E6', icon: UserCircle },
          { label: 'Personal administrativo', value: String(activeStaff || '—'), color: '#7C3AED', bg: '#EDE9FE', icon: Users2 },
          { label: 'Licencias por vencer',  value: String(expiringLicenses),     color: expiringLicenses > 0 ? '#D97706' : '#16A34A', bg: expiringLicenses > 0 ? '#FFFBEB' : '#F0FDF4', icon: AlertTriangle },
          { label: 'Liquidaciones pendientes', value: String(pendingLiquidations), color: pendingLiquidations > 0 ? '#DC2626' : '#16A34A', bg: pendingLiquidations > 0 ? '#FFF1F2' : '#F0FDF4', icon: Banknote },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(m => (
          <Link key={m.name} href={m.href}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
              <m.icon size={18} style={{ color: m.color }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">{m.name}</h3>
                {m.alert && <AlertTriangle size={12} className="text-amber-500" />}
              </div>
              <p className="text-xs text-slate-500 mb-2">{m.desc}</p>
              <div className="flex flex-wrap gap-2">
                {m.stats.map(s => (
                  <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
