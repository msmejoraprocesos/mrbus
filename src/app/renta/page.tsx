import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CalendarClock, Gauge, FileCheck, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Renta de Vehículos — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const [rentalRes, completedRes] = await Promise.all([
    supabase.from('rental_services').select('id, status, extra_hours, extra_km').in('status', ['active', 'confirmed']),
    supabase.from('rental_services').select('id, status, extra_hours, extra_km').in('status', ['completed', 'billed']),
  ])

  const activeRentals = rentalRes.data ?? []
  const completedRentals = completedRes.data ?? []

  const activeCount = activeRentals.length
  const withExcedents = completedRentals.filter(r => (r.extra_hours ?? 0) > 0 || (r.extra_km ?? 0) > 0).length
  const totalCompleted = completedRentals.length

  const modules = [
    {
      name: 'Servicios Eventuales',
      desc: 'Registro de rentas puntuales. Contrato, operador y condiciones.',
      href: '/renta/servicios',
      icon: FileCheck,
      color: '#C2410C',
      bg: '#FFEDD5',
      stats: [`${activeCount} servicios activos`],
      alert: false,
    },
    {
      name: 'Control Horas / Km',
      desc: 'Seguimiento de horas y km por contrato. Excedentes facturables.',
      href: '/renta/control',
      icon: Gauge,
      color: '#D97706',
      bg: '#FFFBEB',
      stats: [`${totalCompleted} completados`, withExcedents > 0 ? `${withExcedents} con excedentes` : 'Sin excedentes'],
      alert: withExcedents > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Renta de Vehículos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Servicios eventuales y control de horas y kilómetros por contrato</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Servicios activos',   value: String(activeCount),     color: '#C2410C', bg: '#FFEDD5', icon: CalendarClock },
          { label: 'Completados',         value: String(totalCompleted),  color: '#16A34A', bg: '#F0FDF4', icon: FileCheck },
          { label: 'Con excedentes',      value: String(withExcedents),   color: withExcedents > 0 ? '#D97706' : '#16A34A', bg: withExcedents > 0 ? '#FFFBEB' : '#F0FDF4', icon: Gauge },
          { label: 'Sin excedentes',      value: String(totalCompleted - withExcedents), color: '#0891B2', bg: '#ECFEFF', icon: AlertTriangle },
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
                {m.stats.filter(Boolean).map(s => (
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
