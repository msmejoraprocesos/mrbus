'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MapPin, RefreshCw, Plus } from 'lucide-react'
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
}

const STATUSES = ['scheduled', 'boarding', 'in_transit', 'completed', 'cancelled']

export default function ServiciosPage() {
  const supabase = createClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('trips')
      .select('id,trip_number,origin_label,destination_label,departure_date,departure_time,type,status,vehicle:vehicles(plate),driver:drivers(first_name,last_name)')
      .order('departure_date', { ascending: false })
      .limit(300)
    setTrips((data ?? []) as unknown as Trip[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const counts: Record<string, number> = {}
  STATUSES.forEach(s => { counts[s] = trips.filter(t => t.status === s).length })

  const filtered = trips
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .filter(t => !search || t.trip_number.toLowerCase().includes(search.toLowerCase()) ||
      t.origin_label.toLowerCase().includes(search.toLowerCase()) ||
      t.destination_label.toLowerCase().includes(search.toLowerCase()))

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
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/trips/new" className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium">
            <Plus size={14} /> Nuevo
          </Link>
        </div>
      </div>

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

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
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
    </div>
  )
}
