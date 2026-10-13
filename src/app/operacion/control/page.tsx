'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { Radio, RefreshCw, CheckCircle, MapPin, Clock, Users, ChevronRight, X } from 'lucide-react'

type Trip = {
  id: string
  trip_number: string
  origin_label: string
  destination_label: string
  departure_date: string
  departure_time: string | null
  arrival_time: string | null
  status: string
  vehicle_id: string | null
  driver_id: string | null
  passenger_count: number | null
  notes: string | null
  vehicle?: { plate: string; economic_number: string }
  driver?: { first_name: string; last_name: string }
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  scheduled:  { label: 'Programado',   color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  boarding:   { label: 'Abordando',    color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  in_transit: { label: 'En tránsito',  color: 'bg-green-100 text-green-700', dot: 'bg-green-400 animate-pulse' },
  completed:  { label: 'Completado',   color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
  cancelled:  { label: 'Cancelado',    color: 'bg-red-100 text-red-600',     dot: 'bg-red-400' },
  delayed:    { label: 'Retrasado',    color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
}

const STATUS_FLOW: Record<string, string[]> = {
  scheduled:  ['boarding', 'cancelled'],
  boarding:   ['in_transit', 'cancelled'],
  in_transit: ['completed', 'delayed'],
  delayed:    ['in_transit', 'completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
}

export default function ControlPage() {
  const supabase = createClient()
  const [trips, setTrips]     = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Trip | null>(null)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes]       = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('trips')
      .select('*, vehicle:vehicles(plate,economic_number), driver:drivers(first_name,last_name)')
      .order('departure_time')

    if (statusFilter === 'active') {
      q.in('status', ['boarding', 'in_transit', 'delayed', 'scheduled'])
       .eq('departure_date', dateFilter)
    } else if (statusFilter === 'today') {
      q.eq('departure_date', dateFilter)
    } else {
      q.eq('departure_date', dateFilter).eq('status', statusFilter)
    }

    const { data } = await q
    setTrips(data ?? [])
    setLoading(false)
  }, [dateFilter, statusFilter])

  useEffect(() => { load() }, [load])

  async function cambiarStatus(trip: Trip, newStatus: string) {
    setUpdating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''
    const patch: Record<string, unknown> = { status: newStatus }
    if (notes) patch.notes = notes
    if (newStatus === 'completed') patch.actual_arrival = new Date().toISOString()
    if (newStatus === 'in_transit') patch.actual_departure = new Date().toISOString()

    const { error } = await supabase.from('trips').update(patch).eq('id', trip.id)
    if (error) { alert('Error: ' + error.message); setUpdating(false); return }

    await auditLog({ action: 'UPDATE', module: 'control', table_name: 'trips', record_folio: trip.trip_number, user_id: uid })

    setUpdating(false)
    setSelected(null)
    setNotes('')
    load()
  }

  const active = trips.filter(t => ['boarding','in_transit','delayed'].includes(t.status))
  const scheduled = trips.filter(t => t.status === 'scheduled')
  const completed = trips.filter(t => t.status === 'completed')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Radio size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Centro de Control</h1>
            <p className="text-xs text-slate-400">
              {active.length} activos · {scheduled.length} programados · {completed.length} completados
            </p>
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

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {[
          ['active', 'Activos'],
          ['today', 'Todos hoy'],
          ['scheduled', 'Programados'],
          ['completed', 'Completados'],
          ['cancelled', 'Cancelados'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${statusFilter === val ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando servicios...</div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-slate-400">
          <Radio size={40} className="mb-3 opacity-30" />
          <p>Sin servicios para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trips.map(t => {
            const s = STATUS_MAP[t.status] ?? { label: t.status, color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' }
            const nextStatuses = STATUS_FLOW[t.status] ?? []
            return (
              <div key={t.id}
                className={`bg-white rounded-xl border shadow-sm p-5 transition-all hover:shadow-md ${selected?.id === t.id ? 'border-green-400 ring-2 ring-green-200' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500">{t.trip_number}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.color}`}>{s.label}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(selected?.id === t.id ? null : t)}
                    className="text-slate-400 hover:text-slate-600 p-1">
                    {selected?.id === t.id ? <X size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                <div className="mb-3">
                  <p className="font-bold text-slate-900 text-sm">{t.origin_label}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={10} /> {t.destination_label}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1">
                    <span className="font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                      {t.vehicle?.plate ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={11} />
                    {t.passenger_count ?? 0} pax
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={11} />
                    {t.departure_time?.slice(0,5) ?? '—'}
                  </div>
                </div>

                {t.driver && (
                  <p className="text-xs text-slate-400 mb-3">
                    👤 {t.driver.first_name} {t.driver.last_name}
                  </p>
                )}

                {/* Action buttons */}
                {nextStatuses.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {nextStatuses.map(ns => {
                      const ns_info = STATUS_MAP[ns]
                      const isPrimary = ns !== 'cancelled'
                      return (
                        <button key={ns}
                          onClick={() => { setSelected(t); setNotes('') }}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            isPrimary
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'border border-red-200 text-red-600 hover:bg-red-50'
                          }`}>
                          → {ns_info?.label ?? ns}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Inline confirm panel */}
                {selected?.id === t.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                    <textarea rows={2} placeholder="Notas opcionales (retraso, incidente...)"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-300 resize-none" />
                    <div className="flex gap-1.5">
                      {(STATUS_FLOW[t.status] ?? []).map(ns => {
                        const isPrimary = ns !== 'cancelled'
                        return (
                          <button key={ns} onClick={() => cambiarStatus(t, ns)} disabled={updating}
                            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                              isPrimary
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'border border-red-200 text-red-600 hover:bg-red-50'
                            }`}>
                            {updating ? '...' : `Confirmar → ${STATUS_MAP[ns]?.label}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
