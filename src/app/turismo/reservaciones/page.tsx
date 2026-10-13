'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { Ticket, RefreshCw } from 'lucide-react'

type AgencyTrip = {
  id: string
  title: string
  status: string
  price_per_seat: number | null
  min_seats_to_confirm: number | null
  seats_blocked: number | null
  trip?: { trip_number: string; departure_date: string; capacity?: number } | null
  reservations?: { id: string; status: string; total_price: number | null; total_paid: number | null }[]
}

const TRIP_S: Record<string, string> = {
  setup: 'Configurando', on_sale: 'En venta', full: 'Lleno',
  confirmed: 'Confirmado', at_risk: 'En riesgo', cancelled: 'Cancelado', completed: 'Completado',
}
const TRIP_C: Record<string, string> = {
  setup: 'bg-slate-100 text-slate-600',
  on_sale: 'bg-blue-100 text-blue-700',
  full: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
  at_risk: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
  completed: 'bg-emerald-100 text-emerald-700',
}

export default function ReservacionesPage() {
  const supabase = createClient()
  const [trips, setTrips] = useState<AgencyTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('agency_trips')
      .select('*, trip:trips(trip_number,departure_date), reservations:seat_reservations(id,status,total_price,total_paid)')
      .order('created_at', { ascending: false })
    setTrips((data ?? []) as unknown as AgencyTrip[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const onSale     = trips.filter(t => t.status === 'on_sale').length
  const confirmed  = trips.filter(t => t.status === 'confirmed').length
  const atRisk     = trips.filter(t => t.status === 'at_risk').length
  const totalRevenue = trips.reduce((s, t) => {
    const res = t.reservations ?? []
    return s + res.reduce((rs, r) => rs + (r.total_paid ?? 0), 0)
  }, 0)

  const filtered = statusFilter === 'all' ? trips : trips.filter(t => t.status === statusFilter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <Ticket size={20} className="text-sky-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Reservaciones — Agencia B2C</h1>
            <p className="text-xs text-slate-400">{trips.length} viajes de agencia</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En venta', val: onSale, bg: 'bg-blue-50', tc: 'text-blue-700', f: 'on_sale' },
          { label: 'Confirmados', val: confirmed, bg: 'bg-green-50', tc: 'text-green-700', f: 'confirmed' },
          { label: 'En riesgo', val: atRisk, bg: 'bg-red-50', tc: 'text-red-700', f: 'at_risk' },
          { label: 'Cobrado total', val: fmt(totalRevenue), bg: 'bg-teal-50', tc: 'text-teal-700', f: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${statusFilter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tc}`}>{s.val}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🎫</span>
          <p>{trips.length === 0 ? 'No hay viajes de agencia creados' : 'Sin viajes para el filtro seleccionado'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const trip = Array.isArray(t.trip) ? (t.trip as any)[0] : t.trip
            const reservations = t.reservations ?? []
            const sold = reservations.filter(r => ['reserved', 'paid'].includes(r.status)).length
            const revenue = reservations.reduce((s, r) => s + (r.total_paid ?? 0), 0)
            const seatsAvail = (trip?.capacity ?? 40) - (t.seats_blocked ?? 2)
            const pct = seatsAvail > 0 ? Math.round(sold / seatsAvail * 100) : 0
            const minPct = seatsAvail > 0 ? Math.round((t.min_seats_to_confirm ?? 0) / seatsAvail * 100) : 0
            return (
              <div key={t.id} className="block bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {trip?.departure_date ? fmtDate(trip.departure_date) : 'Fecha por definir'}
                    </p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold ml-2 shrink-0', TRIP_C[t.status] ?? 'bg-slate-100 text-slate-500')}>
                    {TRIP_S[t.status] ?? t.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div className="text-center bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Precio/asiento</p>
                    <p className="font-bold text-blue-700 text-sm">{fmt(t.price_per_seat ?? 0)}</p>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Vendidos</p>
                    <p className="font-bold text-green-700 text-sm">{sold}/{seatsAvail}</p>
                  </div>
                  <div className="text-center bg-teal-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Cobrado</p>
                    <p className="font-bold text-teal-700 text-sm">{fmt(revenue)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Ocupación</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct >= 100 ? 'bg-purple-500' : pct >= minPct ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Mínimo para salir: {t.min_seats_to_confirm ?? '—'} asientos</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
