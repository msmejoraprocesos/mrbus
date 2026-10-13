'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils/index'
import { Users, RefreshCw, Download, CheckCircle, XCircle, Clock } from 'lucide-react'

type BoardingEvent = {
  id: string
  event_type: string
  timestamp: string
  latitude: number | null
  longitude: number | null
  trip?: { trip_number: string; departure_date: string } | null
  passenger?: { first_name: string; last_name: string } | null
}

const EVENT_COLORS: Record<string, string> = {
  checkin:  'bg-green-100 text-green-700',
  checkout: 'bg-blue-100 text-blue-700',
  absent:   'bg-red-100 text-red-700',
  late:     'bg-amber-100 text-amber-700',
}
const EVENT_LABELS: Record<string, string> = {
  checkin:  '✅ Abordó',
  checkout: '🚪 Descendió',
  absent:   '❌ Ausente',
  late:     '⏰ Tardanza',
}

export default function AsistenciaPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<BoardingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10))
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('boarding_events')
      .select('id,event_type,timestamp,latitude,longitude,trip:trips(trip_number,departure_date),passenger:passengers(first_name,last_name)')
      .order('timestamp', { ascending: false })
      .limit(300)
    setEvents((data ?? []) as unknown as BoardingEvent[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Filter by date
  const byDate = events.filter(e => {
    const trip = Array.isArray(e.trip) ? (e.trip as any)[0] : e.trip
    return trip?.departure_date === dateFilter
  })

  const filtered = byDate.filter(e => {
    if (typeFilter !== 'all' && e.event_type !== typeFilter) return false
    if (search) {
      const pax = Array.isArray(e.passenger) ? (e.passenger as any)[0] : e.passenger
      const name = `${pax?.first_name ?? ''} ${pax?.last_name ?? ''}`.toLowerCase()
      if (!name.includes(search.toLowerCase())) return false
    }
    return true
  })

  const checkins  = byDate.filter(e => e.event_type === 'checkin').length
  const absents   = byDate.filter(e => e.event_type === 'absent').length
  const late      = byDate.filter(e => e.event_type === 'late').length
  const total     = byDate.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Users size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Reporte de Asistencia</h1>
            <p className="text-xs text-slate-400">Control de abordaje por ruta y empleado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total registros', val: total, icon: Users, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Abordajes', val: checkins, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Ausencias', val: absents, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Tardanzas', val: late, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <k.icon size={14} className={k.color} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Buscar empleado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 w-48" />
        <div className="flex gap-1 border-b border-slate-100">
          {(['all', 'checkin', 'absent', 'late', 'checkout'] as const).map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${typeFilter === t ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t === 'all' ? 'Todos' : EVENT_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-slate-50">
                  {['Viaje', 'Empleado', 'Evento', 'Hora', 'GPS'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    {byDate.length === 0 ? 'Sin registros para esta fecha' : 'Sin coincidencias con los filtros'}
                  </td></tr>
                ) : filtered.map(e => {
                  const trip = Array.isArray(e.trip) ? (e.trip as any)[0] : e.trip
                  const pax  = Array.isArray(e.passenger) ? (e.passenger as any)[0] : e.passenger
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-600">
                        {trip?.trip_number ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                        {pax ? `${pax.first_name} ${pax.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${EVENT_COLORS[e.event_type] ?? 'bg-slate-100 text-slate-500'}`}>
                          {EVENT_LABELS[e.event_type] ?? e.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {new Date(e.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {e.latitude ? `📍 ${e.latitude.toFixed(4)}, ${e.longitude?.toFixed(4)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-50 text-xs text-slate-400">
            {filtered.length} registros para {fmtDate(dateFilter)}
          </div>
        )}
      </div>
    </div>
  )
}
