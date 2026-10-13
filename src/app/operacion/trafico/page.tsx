'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Truck, User, RefreshCw, Target } from 'lucide-react'

type Trip = {
  id: string
  origin_label: string
  destination_label: string
  departure_time: string | null
  status: string
  vehicle_id: string | null
  driver_id: string | null
  vehicle?: { plate: string; economic_number: string } | null
  driver?: { first_name: string; last_name: string } | null
}

type Vehicle = { id: string; plate: string; economic_number: string; type: string; status: string }
type Driver  = { id: string; first_name: string; last_name: string; status: string }

export default function TraficoPage() {
  const supabase = createClient()
  const [trips, setTrips]     = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers]   = useState<Driver[]>([])
  const [loading, setLoading]   = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    setLoading(true)
    const [tripsR, vehR, drvR] = await Promise.all([
      supabase.from('trips')
        .select('id,origin_label,destination_label,departure_time,status,vehicle_id,driver_id,vehicle:vehicles(plate,economic_number),driver:drivers(first_name,last_name)')
        .eq('departure_date', dateFilter)
        .neq('status', 'cancelled')
        .order('departure_time'),
      supabase.from('vehicles').select('id,plate,economic_number,type,status').eq('status', 'active'),
      supabase.from('drivers').select('id,first_name,last_name,status').eq('status', 'active'),
    ])
    setTrips((tripsR.data ?? []) as unknown as Trip[])
    setVehicles(vehR.data ?? [])
    setDrivers(drvR.data ?? [])
    setLoading(false)
  }, [dateFilter])

  useEffect(() => { load() }, [load])

  const assignedVehicleIds = new Set(trips.map(t => t.vehicle_id).filter(Boolean))
  const assignedDriverIds  = new Set(trips.map(t => t.driver_id).filter(Boolean))
  const freeVehicles = vehicles.filter(v => !assignedVehicleIds.has(v.id))
  const freeDrivers  = drivers.filter(d => !assignedDriverIds.has(d.id))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Target size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Tráfico</h1>
            <p className="text-xs text-slate-400">{trips.length} servicios · {assignedVehicleIds.size} unidades en ruta</p>
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
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'En tránsito', val: trips.filter(t => t.status === 'in_transit').length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Abordando', val: trips.filter(t => t.status === 'boarding').length, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Unidades libres', val: freeVehicles.length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Operadores libres', val: freeDrivers.length, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-3 ${k.bg}`}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Unidades */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Truck size={15} className="text-green-600" /> Unidades
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{assignedVehicleIds.size} en servicio</span>
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{freeVehicles.length} disponibles</span>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {trips.map(t => {
                const v = Array.isArray(t.vehicle) ? (t.vehicle as any)[0] : t.vehicle
                if (!v) return null
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                    <div>
                      <p className="font-semibold text-sm text-green-900">{v.plate}</p>
                      <p className="text-xs text-green-600 truncate max-w-[180px]">{t.origin_label} → {t.destination_label}</p>
                    </div>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium shrink-0">En servicio</span>
                  </div>
                )
              })}
              {freeVehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-semibold text-sm text-slate-700">{v.plate}</p>
                    <p className="text-xs text-slate-400">{v.type ?? v.economic_number}</p>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium shrink-0">Disponible</span>
                </div>
              ))}
              {trips.length === 0 && freeVehicles.length === 0 && (
                <p className="text-center text-slate-400 py-6 text-sm">Sin datos</p>
              )}
            </div>
          </div>

          {/* Operadores */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <User size={15} className="text-green-600" /> Operadores
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{assignedDriverIds.size} asignados</span>
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{freeDrivers.length} disponibles</span>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {trips.map(t => {
                const dr = Array.isArray(t.driver) ? (t.driver as any)[0] : t.driver
                if (!dr) return null
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                    <div>
                      <p className="font-semibold text-sm text-green-900">{dr.first_name} {dr.last_name}</p>
                      <p className="text-xs text-green-600 truncate max-w-[180px]">{t.origin_label} → {t.destination_label}</p>
                    </div>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium shrink-0">En servicio</span>
                  </div>
                )
              })}
              {freeDrivers.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-semibold text-sm text-slate-700">{d.first_name} {d.last_name}</p>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium shrink-0">Disponible</span>
                </div>
              ))}
              {trips.length === 0 && freeDrivers.length === 0 && (
                <p className="text-center text-slate-400 py-6 text-sm">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
