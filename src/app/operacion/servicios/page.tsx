'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MapPin, RefreshCw, Plus, List, LayoutGrid, X } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS, fmtDate, formatTime, cn } from '@/lib/utils/index'

type Trip = {
  id: string
  trip_number: string
  origin_label: string
  destination_label: string
  departure_date: string
  departure_time: string | null
  type: string
  status: string
  vehicle?: { plate: string } | null
  driver?: { first_name: string; last_name: string } | null
  passenger_count?: number | null
}

const STATUSES = ['scheduled', 'boarding', 'in_transit', 'completed', 'cancelled']

const KANBAN_COLUMN_COLORS: Record<string, { header: string; dot: string; count: string }> = {
  scheduled:  { header: 'bg-slate-50',  dot: 'bg-slate-400',  count: 'bg-slate-100 text-slate-600' },
  boarding:   { header: 'bg-blue-50',   dot: 'bg-blue-500',   count: 'bg-blue-100 text-blue-700' },
  in_transit: { header: 'bg-amber-50',  dot: 'bg-amber-500',  count: 'bg-amber-100 text-amber-700' },
  completed:  { header: 'bg-green-50',  dot: 'bg-green-500',  count: 'bg-green-100 text-green-700' },
  cancelled:  { header: 'bg-red-50',    dot: 'bg-red-400',    count: 'bg-red-100 text-red-600' },
}

export default function ServiciosPage() {
  const supabase = createClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    try {
      setBannerDismissed(!!localStorage.getItem('servicios_kanban_banner_dismissed'))
    } catch { /* ignore */ }
  }, [])

  function dismissBanner() {
    setBannerDismissed(true)
    try { localStorage.setItem('servicios_kanban_banner_dismissed', '1') } catch { /* ignore */ }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('trips')
      .select('id,trip_number,origin_label,destination_label,departure_date,departure_time,type,status,vehicle:vehicles(plate),driver:drivers(first_name,last_name),passenger_count')
      .order('departure_date', { ascending: false })
      .limit(300)
    setTrips((data ?? []) as unknown as Trip[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const counts: Record<string, number> = {}
  STATUSES.forEach(s => { counts[s] = trips.filter(t => t.status === s).length })

  const today = new Date().toISOString().split('T')[0]
  const todayTrips = trips.filter(t => t.departure_date === today)
  const activeTrips = trips.filter(t => t.status === 'in_transit' || t.status === 'boarding')

  const filtered = trips
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .filter(t => !search || t.trip_number.toLowerCase().includes(search.toLowerCase()) ||
      t.origin_label.toLowerCase().includes(search.toLowerCase()) ||
      t.destination_label.toLowerCase().includes(search.toLowerCase()))

  const kpis = [
    { label: 'Total servicios', val: trips.length, sub: 'registrados', bg: 'bg-slate-50', tc: 'text-slate-700' },
    { label: 'En tránsito', val: activeTrips.length, sub: 'activos ahora', bg: 'bg-amber-50', tc: 'text-amber-700' },
    { label: 'Hoy', val: todayTrips.length, sub: 'salidas hoy', bg: 'bg-blue-50', tc: 'text-blue-700' },
    { label: 'Completados', val: counts['completed'] ?? 0, sub: 'finalizados', bg: 'bg-green-50', tc: 'text-green-700' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MapPin size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Servicios</h1>
            <p className="text-xs text-slate-400">{trips.length} viajes registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar folio o ruta…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 w-48"
          />
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('lista')}
              className={cn('px-2.5 h-8 flex items-center transition-colors', view === 'lista' ? 'bg-green-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}
              title="Vista lista">
              <List size={15} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn('px-2.5 h-8 flex items-center transition-colors', view === 'kanban' ? 'bg-green-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}
              title="Vista kanban">
              <LayoutGrid size={15} />
            </button>
          </div>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/trips/new" className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium">
            <Plus size={14} /> Nuevo
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={cn('rounded-xl border border-slate-100 shadow-sm p-4', k.bg)}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn('text-2xl font-bold mt-1', k.tc)}>{k.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Contextual guide banner — kanban only, dismissible */}
      {view === 'kanban' && !bannerDismissed && (
        <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm text-blue-700">
          <span>ℹ️ Vista Kanban: arrastra las tarjetas entre columnas para cambiar el estado del servicio.</span>
          <button onClick={dismissBanner} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Status filter pills (lista view only) */}
      {view === 'lista' && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter('all')}
            className={cn('text-xs px-3 py-1.5 rounded-full font-semibold border transition-all',
              statusFilter === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
            Todos ({trips.length})
          </button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('text-xs px-3 py-1.5 rounded-full font-semibold border transition-all',
                statusFilter === s ? cn(TRIP_STATUS_COLORS[s], 'border-transparent') : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {TRIP_STATUS_LABELS[s]} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : view === 'kanban' ? (

        /* ── KANBAN VIEW ── */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const col = KANBAN_COLUMN_COLORS[status] ?? { header: 'bg-slate-50', dot: 'bg-slate-400', count: 'bg-slate-100 text-slate-600' }
            const colTrips = trips.filter(t => t.status === status)
            return (
              <div key={status} className="min-w-[220px] flex flex-col flex-shrink-0">
                {/* Column header */}
                <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0 border-slate-100', col.header)}>
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', col.dot)} />
                    <span className="text-xs font-semibold text-slate-700">{TRIP_STATUS_LABELS[status]}</span>
                  </div>
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', col.count)}>{colTrips.length}</span>
                </div>
                {/* Column body */}
                <div className={cn('flex flex-col gap-2 p-2 border border-slate-100 rounded-b-xl overflow-y-auto', col.header)}
                  style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  {colTrips.length === 0 ? (
                    <div className="flex items-center justify-center h-16 text-slate-300 text-xs">Sin servicios</div>
                  ) : colTrips.map(t => {
                    const v = Array.isArray(t.vehicle) ? (t.vehicle as any)[0] : t.vehicle
                    const d = Array.isArray(t.driver) ? (t.driver as any)[0] : t.driver
                    return (
                      <Link key={t.id} href={`/trips/${t.id}`}
                        className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer">
                        {/* Folio */}
                        <span className="font-mono text-xs text-slate-500 font-bold">{t.trip_number}</span>
                        {/* Route */}
                        <p className="text-sm font-bold text-slate-800 leading-tight">
                          {t.origin_label} → {t.destination_label}
                        </p>
                        {/* Date + time */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>{fmtDate(t.departure_date)}</span>
                          {t.departure_time && <><span>·</span><span>{formatTime(t.departure_time)}</span></>}
                        </div>
                        {/* Vehicle + driver */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {v && (
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{v.plate}</span>
                          )}
                          {d && (
                            <span className="text-xs text-slate-500">{d.first_name} {d.last_name}</span>
                          )}
                        </div>
                        {/* Passenger count */}
                        {t.passenger_count != null && (
                          <span className="text-xs text-slate-400">{t.passenger_count} pasajeros</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <MapPin size={40} className="mb-3 opacity-30" />
              <p>{trips.length === 0 ? 'No hay servicios registrados' : 'Sin resultados para el filtro'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-green-50">
                    {['Folio', 'Ruta', 'Fecha', 'Hora', 'Tipo', 'Unidad', 'Operador', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(t => {
                    const v = Array.isArray(t.vehicle) ? (t.vehicle as any)[0] : t.vehicle
                    const d = Array.isArray(t.driver) ? (t.driver as any)[0] : t.driver
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 group">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{t.trip_number}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="truncate text-slate-900 font-medium">{t.origin_label} → {t.destination_label}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(t.departure_date)}</td>
                        <td className="px-4 py-3 text-slate-600">{t.departure_time ? formatTime(t.departure_time) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{TRIP_TYPE_LABELS[t.type] ?? t.type}</td>
                        <td className="px-4 py-3">
                          {v ? <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{v.plate}</span>
                             : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {d ? `${d.first_name} ${d.last_name}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', TRIP_STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-500')}>
                            {TRIP_STATUS_LABELS[t.status] ?? t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/trips/${t.id}`} className="text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100">Ver →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
