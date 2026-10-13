'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Bus, CalendarDays, Navigation, Map, Radio, Gauge, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [todayTripsCount, setTodayTripsCount] = useState(0)
  const [weekTripsCount, setWeekTripsCount] = useState(0)
  const [activeTripsCount, setActiveTripsCount] = useState(0)
  const [activeVehiclesCount, setActiveVehiclesCount] = useState(0)
  const [activeDriversCount, setActiveDriversCount] = useState(0)
  const [hasRoutes, setHasRoutes] = useState(false)
  const [unassigned, setUnassigned] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const todayStr = new Date().toISOString().slice(0, 10)
    const in7 = new Date()
    in7.setDate(in7.getDate() + 7)
    const in7Str = in7.toISOString().slice(0, 10)

    const [todayTripsRes, weekTripsRes, activeTripsRes, vehiclesRes, driversRes, routesRes] = await Promise.all([
      supabase.from('trips').select('id, status').eq('departure_date', todayStr),
      supabase.from('trips').select('id').gte('departure_date', todayStr).lte('departure_date', in7Str),
      supabase.from('trips').select('id, status').in('status', ['boarding', 'in_transit']),
      supabase.from('vehicles').select('id, status').eq('status', 'active'),
      supabase.from('drivers').select('id, status').eq('status', 'active'),
      supabase.from('saved_routes').select('id').limit(1),
    ])

    const todayTrips = (todayTripsRes.data ?? []) as unknown as { id: string; status: string }[]
    const weekTrips = (weekTripsRes.data ?? []) as unknown as { id: string }[]
    const activeTrips = (activeTripsRes.data ?? []) as unknown as { id: string; status: string }[]
    const activeVehicles = (vehiclesRes.data ?? []) as unknown as { id: string; status: string }[]
    const activeDrivers = (driversRes.data ?? []) as unknown as { id: string; status: string }[]
    const routes = (routesRes.data ?? []) as unknown as { id: string }[]

    setTodayTripsCount(todayTrips.length)
    setWeekTripsCount(weekTrips.length)
    setActiveTripsCount(activeTrips.length)
    setActiveVehiclesCount(activeVehicles.length)
    setActiveDriversCount(activeDrivers.length)
    setHasRoutes(routes.length > 0)
    setUnassigned(todayTrips.filter(t => t.status === 'confirmed').length)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const modules = [
    {
      name: 'Servicios',
      desc: 'Registro y gestión de todos los viajes. Alta, asignación e historial.',
      href: '/operacion/servicios',
      icon: Bus,
      color: '#15803D',
      bg: '#DCFCE7',
      stats: [`${todayTripsCount} hoy`, `${weekTripsCount} esta semana`],
      alert: unassigned > 0,
    },
    {
      name: 'Programación',
      desc: 'Agenda de los próximos 7 días con estado de cada servicio.',
      href: '/operacion/programacion',
      icon: CalendarDays,
      color: '#1D4ED8',
      bg: '#DBEAFE',
      stats: [`${weekTripsCount} viajes programados`],
      alert: false,
    },
    {
      name: 'Tráfico',
      desc: 'Asignación diaria. Unidades libres y operadores disponibles.',
      href: '/operacion/trafico',
      icon: Gauge,
      color: '#D97706',
      bg: '#FFFBEB',
      stats: [`${activeVehiclesCount} unidades`, `${activeDriversCount} operadores`],
      alert: unassigned > 0,
    },
    {
      name: 'Rutas',
      desc: 'Catálogo de rutas con distancias, tiempos y costos de referencia.',
      href: '/operacion/rutas',
      icon: Map,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: [hasRoutes ? 'Rutas registradas' : 'Sin rutas guardadas'],
      alert: false,
    },
    {
      name: 'Centro de Control',
      desc: 'Monitor de viajes activos. Estado en tiempo real e incidencias.',
      href: '/operacion/control',
      icon: Radio,
      color: '#0891B2',
      bg: '#ECFEFF',
      stats: [`${activeTripsCount} viajes en curso`],
      alert: activeTripsCount > 0,
    },
  ]

  if (loading) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operación</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión integral de viajes, rutas y control en tiempo real</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Viajes hoy',         value: String(todayTripsCount),   color: '#15803D', bg: '#DCFCE7', icon: Bus },
          { label: 'Esta semana',        value: String(weekTripsCount),    color: '#1D4ED8', bg: '#DBEAFE', icon: CalendarDays },
          { label: 'En curso ahora',     value: String(activeTripsCount),  color: '#0891B2', bg: '#ECFEFF', icon: Radio },
          { label: 'Sin asignar hoy',    value: String(unassigned),        color: unassigned > 0 ? '#DC2626' : '#16A34A', bg: unassigned > 0 ? '#FFF1F2' : '#F0FDF4', icon: AlertTriangle },
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
