'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Ticket, QrCode, Package2, Star, Users, ChevronRight, AlertTriangle } from 'lucide-react'

export default function Page() {
  const [reservations, setReservations] = useState<any[]>([])
  const [boardingToday, setBoardingToday] = useState<any[]>([])
  const [agencyTrips, setAgencyTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const todayStr = new Date().toISOString().slice(0, 10)
    const [reservationsRes, boardingRes, agencyTripsRes] = await Promise.all([
      supabase.from('seat_reservations').select('id, status, trip_id').eq('status', 'confirmed'),
      supabase.from('boarding_events').select('id, created_at').gte('created_at', todayStr),
      supabase.from('agency_trips').select('id, total_seats, sold_seats').eq('status', 'open'),
    ])
    setReservations(reservationsRes.data ?? [])
    setBoardingToday(boardingRes.data ?? [])
    setAgencyTrips(agencyTripsRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const confirmedReservations = reservations.length
  const boardingCount = boardingToday.length
  const openTrips = agencyTrips.length
  const totalAvailable = agencyTrips.reduce((s, t) => s + ((t.total_seats ?? 0) - (t.sold_seats ?? 0)), 0)

  const modules = [
    {
      name: 'Reservaciones',
      desc: 'Venta de asientos por viaje. Selección, cobro y confirmación.',
      href: '/turismo/reservaciones',
      icon: Ticket,
      color: '#0369A1',
      bg: '#E0F2FE',
      stats: [`${confirmedReservations} reservaciones activas`, `${openTrips} viajes abiertos`],
      alert: false,
    },
    {
      name: 'Abordaje',
      desc: 'Control de abordaje digital con QR. Registro al subir al autobús.',
      href: '/turismo/abordaje',
      icon: QrCode,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: [`${boardingCount} abordajes hoy`],
      alert: false,
    },
    {
      name: 'Paquetes',
      desc: 'Catálogo de paquetes turísticos con precio e itinerario.',
      href: '/turismo/paquetes',
      icon: Package2,
      color: '#0891B2',
      bg: '#ECFEFF',
      stats: [totalAvailable > 0 ? `${totalAvailable} lugares disponibles` : 'Consultar disponibilidad'],
      alert: false,
    },
  ]

  if (loading) return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Turismo</h1>
        <p className="text-sm text-slate-500 mt-0.5">Reservaciones de asientos, abordaje digital y paquetes turísticos</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Reservaciones activas', value: String(confirmedReservations), color: '#0369A1', bg: '#E0F2FE', icon: Ticket },
          { label: 'Viajes abiertos',       value: String(openTrips),            color: '#0891B2', bg: '#ECFEFF', icon: Star },
          { label: 'Abordajes hoy',         value: String(boardingCount),        color: '#7C3AED', bg: '#EDE9FE', icon: QrCode },
          { label: 'Lugares disponibles',   value: String(totalAvailable),       color: '#16A34A', bg: '#F0FDF4', icon: Users },
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
