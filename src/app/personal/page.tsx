import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Navigation, Clock, Users, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Transporte Personal — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const todayStr = new Date().toISOString().slice(0, 10)

  const [routesRes, stopsRes, boardingRes] = await Promise.all([
    supabase.from('agreement_routes').select('id').limit(100),
    supabase.from('agreement_routes').select('id, agreement_id').limit(100),
    supabase.from('boarding_events').select('id, boarded').gte('created_at', todayStr),
  ])

  const routes = routesRes.data ?? []
  const boardingToday = boardingRes.data ?? []

  const totalRoutes = routes.length
  const boardedToday = boardingToday.filter(b => b.boarded).length
  const absentToday = boardingToday.filter(b => !b.boarded).length

  const modules = [
    {
      name: 'Rutas',
      desc: 'Definición de rutas fijas. Origen, destino, paradas y horarios.',
      href: '/personal/rutas',
      icon: MapPin,
      color: '#0369A1',
      bg: '#E0F2FE',
      stats: [`${totalRoutes} rutas registradas`],
      alert: false,
    },
    {
      name: 'Control de Paradas',
      desc: 'Paradas por ruta. Coordenadas GPS y pasajeros asignados.',
      href: '/personal/paradas',
      icon: Navigation,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: ['Paradas y pasajeros'],
      alert: false,
    },
    {
      name: 'Asistencia',
      desc: 'Registro de abordajes e inasistencias por servicio.',
      href: '/personal/asistencia',
      icon: Clock,
      color: '#16A34A',
      bg: '#F0FDF4',
      stats: [`${boardedToday} abordajes hoy`, absentToday > 0 ? `${absentToday} inasistencias` : ''],
      alert: absentToday > 3,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Transporte Personal</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de rutas fijas, paradas y asistencia de pasajeros</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Rutas activas',      value: String(totalRoutes),   color: '#0369A1', bg: '#E0F2FE', icon: MapPin },
          { label: 'Abordajes hoy',      value: String(boardedToday),  color: '#16A34A', bg: '#F0FDF4', icon: Users },
          { label: 'Inasistencias hoy',  value: String(absentToday),   color: absentToday > 0 ? '#D97706' : '#16A34A', bg: absentToday > 0 ? '#FFFBEB' : '#F0FDF4', icon: AlertTriangle },
          { label: 'Total abordajes',    value: String(boardingToday.length), color: '#7C3AED', bg: '#EDE9FE', icon: Clock },
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
