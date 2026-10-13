'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { auditLog } from '@/lib/audit'
import { formatTime, TRIP_STATUS_COLORS, TRIP_STATUS_LABELS, fmtDate } from '@/lib/utils/index'
import { CalendarDays, RefreshCw, UserCheck, Truck, ChevronDown, ChevronUp, CheckCircle, X } from 'lucide-react'

type Trip = {
  id: string
  trip_number: string
  origin_label: string
  destination_label: string
  departure_date: string
  departure_time: string | null
  status: string
  vehicle_id: string | null
  driver_id: string | null
  passenger_count: number | null
  vehicle?: { plate: string; economic_number: string } | null
  driver?: { first_name: string; last_name: string } | null
}

type Vehicle = { id: string; plate: string; economic_number: string; status: string }
type Driver  = { id: string; first_name: string; last_name: string; status: string }

export default function ProgramacionPage() {
  const supabase = createClient()
  const [trips, setTrips]     = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers]   = useState<Driver[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving]     = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))

  // form state per trip (vehicle_id, driver_id, passenger_count)
  const [forms, setForms] = useState<Record<string, { vehicle_id: string; driver_id: string; passenger_count: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const dateTo = new Date(dateFrom)
    dateTo.setDate(dateTo.getDate() + 6)
    const toStr = dateTo.toISOString().slice(0, 10)

    const [tripsRes, vehRes, drvRes] = await Promise.all([
      supabase.from('trips')
        .select('id,trip_number,origin_label,destination_label,departure_date,departure_time,status,vehicle_id,driver_id,passenger_count,vehicle:vehicles(plate,economic_number),driver:drivers(first_name,last_name)')
        .gte('departure_date', dateFrom)
        .lte('departure_date', toStr)
        .neq('status', 'cancelled')
        .order('departure_date')
        .order('departure_time'),
      supabase.from('vehicles').select('id,plate,economic_number,status').eq('status', 'active').order('economic_number'),
      supabase.from('drivers').select('id,first_name,last_name,status').eq('status', 'active').order('first_name'),
    ])

    const tripData = (tripsRes.data ?? []) as unknown as Trip[]
    setTrips(tripData)
    setVehicles(vehRes.data ?? [])
    setDrivers(drvRes.data ?? [])

    // init forms with current values
    const init: Record<string, { vehicle_id: string; driver_id: string; passenger_count: string }> = {}
    tripData.forEach(t => {
      init[t.id] = {
        vehicle_id: t.vehicle_id ?? '',
        driver_id: t.driver_id ?? '',
        passenger_count: t.passenger_count?.toString() ?? '',
      }
    })
    setForms(init)
    setLoading(false)
  }, [dateFrom])

  useEffect(() => { load() }, [load])

  function setForm(tripId: string, field: string, val: string) {
    setForms(prev => ({ ...prev, [tripId]: { ...prev[tripId], [field]: val } }))
  }

  async function guardar(trip: Trip) {
    const f = forms[trip.id]
    if (!f) return
    setSaving(trip.id)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''

    const patch: Record<string, unknown> = {
      vehicle_id: f.vehicle_id || null,
      driver_id: f.driver_id || null,
      passenger_count: f.passenger_count ? parseInt(f.passenger_count) : null,
    }

    const { error } = await supabase.from('trips').update(patch).eq('id', trip.id)
    if (error) { alert('Error: ' + error.message); setSaving(null); return }

    await auditLog({ action: 'UPDATE', module: 'programacion', table_name: 'trips', record_folio: trip.trip_number, user_id: uid })

    setSaving(null)
    setExpanded(null)
    load()
  }

  // Group trips by date
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(dateFrom + 'T12:00:00')
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }

  const unassigned = trips.filter(t => !t.vehicle_id || !t.driver_id)
  const assigned   = trips.filter(t => t.vehicle_id && t.driver_id)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CalendarDays size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Programación de Servicios</h1>
            <p className="text-xs text-slate-400">
              {unassigned.length} sin asignar · {assigned.length} listos · próximos 7 días
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total 7 días', val: trips.length, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Sin asignar', val: unassigned.length, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Completos', val: assigned.length, color: 'text-green-700', bg: 'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg}`}>
            <p className="text-xs text-slate-500 font-medium mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Day-by-day grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {days.map(day => {
            const dayTrips = trips.filter(t => t.departure_date === day)
            const d = new Date(day + 'T12:00:00')
            const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
            const dayUnassigned = dayTrips.filter(t => !t.vehicle_id || !t.driver_id).length

            return (
              <div key={day} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
                  <p className="font-semibold text-green-900 capitalize text-sm">{label}</p>
                  <div className="flex items-center gap-2">
                    {dayUnassigned > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        {dayUnassigned} pendiente{dayUnassigned > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      {dayTrips.length} servicios
                    </span>
                  </div>
                </div>

                {dayTrips.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-300 text-center">Sin servicios programados</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {dayTrips.map(t => {
                      const isExpanded = expanded === t.id
                      const f = forms[t.id] ?? { vehicle_id: '', driver_id: '', passenger_count: '' }
                      const needsAssign = !t.vehicle_id || !t.driver_id
                      const statusInfo = TRIP_STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-500'
                      const statusLabel = TRIP_STATUS_LABELS[t.status] ?? t.status

                      return (
                        <div key={t.id}>
                          <div
                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 cursor-pointer"
                            onClick={() => setExpanded(isExpanded ? null : t.id)}
                          >
                            {/* Time */}
                            <div className="w-12 text-center shrink-0">
                              <p className="font-bold text-slate-800 text-sm">{t.departure_time ? formatTime(t.departure_time) : '—'}</p>
                            </div>

                            {/* Route */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">
                                {t.origin_label} → {t.destination_label}
                              </p>
                              <p className="text-xs text-slate-400">
                                <span className="font-mono">{t.trip_number}</span>
                                {t.vehicle
                                  ? <span className="ml-2 text-purple-700">🚌 {(t.vehicle as any).plate ?? (t.vehicle as any)[0]?.plate ?? '—'}</span>
                                  : <span className="ml-2 text-amber-500">⚠️ Sin unidad</span>
                                }
                                {t.driver
                                  ? <span className="ml-2">👤 {(t.driver as any).first_name ?? (t.driver as any)[0]?.first_name ?? ''} {(t.driver as any).last_name ?? (t.driver as any)[0]?.last_name ?? ''}</span>
                                  : <span className="ml-2 text-amber-500">⚠️ Sin operador</span>
                                }
                              </p>
                            </div>

                            {/* Status + indicators */}
                            <div className="flex items-center gap-2 shrink-0">
                              {needsAssign && <div className="w-2 h-2 rounded-full bg-amber-400" title="Falta asignación" />}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusInfo}`}>{statusLabel}</span>
                              {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </div>
                          </div>

                          {/* Inline assignment panel */}
                          {isExpanded && (
                            <div className="mx-4 mb-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Asignar recursos</h4>
                                <button onClick={() => setExpanded(null)} className="text-slate-400 hover:text-slate-600">
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block flex items-center gap-1">
                                    <Truck size={11} /> Unidad
                                  </label>
                                  <select value={f.vehicle_id}
                                    onChange={e => setForm(t.id, 'vehicle_id', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white">
                                    <option value="">Sin asignar</option>
                                    {vehicles.map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.economic_number} — {v.plate}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block flex items-center gap-1">
                                    <UserCheck size={11} /> Operador
                                  </label>
                                  <select value={f.driver_id}
                                    onChange={e => setForm(t.id, 'driver_id', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white">
                                    <option value="">Sin asignar</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.first_name} {d.last_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Pasajeros</label>
                                  <input type="number" min="0" value={f.passenger_count}
                                    onChange={e => setForm(t.id, 'passenger_count', e.target.value)}
                                    placeholder="0"
                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white" />
                                </div>
                              </div>
                              <div className="flex justify-end mt-3">
                                <button
                                  onClick={() => guardar(t)}
                                  disabled={saving === t.id}
                                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                                  {saving === t.id
                                    ? <RefreshCw size={13} className="animate-spin" />
                                    : <CheckCircle size={13} />}
                                  Guardar asignación
                                </button>
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
          })}
        </div>
      )}
    </div>
  )
}
