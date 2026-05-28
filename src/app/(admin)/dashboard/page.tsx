import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import { MapPin, Users, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, formatDate, formatTime, cn } from '@/lib/utils'
import type { TripWithRelations } from '@/lib/types'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Viajes de hoy
  const { data: tripsToday } = await supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles(plate, economic_number, type),
      driver:drivers(first_name, last_name)
    `)
    .eq('departure_date', today)
    .neq('status', 'cancelled')
    .order('departure_time', { ascending: true })

  const trips = (tripsToday ?? []) as TripWithRelations[]

  // Contar pasajeros por viaje
  const tripIds = trips.map(t => t.id)
  const { data: passengerCounts } = tripIds.length > 0
    ? await supabase
        .from('trip_passengers')
        .select('trip_id, boarding_status')
        .in('trip_id', tripIds)
    : { data: [] }

  const countsByTrip = (passengerCounts ?? []).reduce((acc, p) => {
    if (!acc[p.trip_id]) acc[p.trip_id] = { total: 0, boarded: 0 }
    acc[p.trip_id].total++
    if (p.boarding_status === 'boarded') acc[p.trip_id].boarded++
    return acc
  }, {} as Record<string, { total: number; boarded: number }>)

  // KPIs
  const kpis = {
    total:     trips.length,
    active:    trips.filter(t => ['boarding','in_transit'].includes(t.status)).length,
    passengers: Object.values(countsByTrip).reduce((s, c) => s + c.total, 0),
    boarded:   Object.values(countsByTrip).reduce((s, c) => s + c.boarded, 0),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{formatDate(today)} · Vista operativa del día</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<MapPin className="w-5 h-5 text-blue-500" />}
          label="Viajes hoy" value={kpis.total} bg="bg-blue-50" />
        <KpiCard icon={<Clock className="w-5 h-5 text-amber-500" />}
          label="Activos ahora" value={kpis.active} bg="bg-amber-50" />
        <KpiCard icon={<Users className="w-5 h-5 text-purple-500" />}
          label="Pasajeros" value={kpis.passengers} bg="bg-purple-50" />
        <KpiCard icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="Abordaron" value={kpis.boarded} bg="bg-green-50" />
      </div>

      {/* Tabla de viajes del día */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Viajes del día</h2>
          <Link href="/trips/new" className="btn-primary text-xs py-1.5 px-3">
            + Nuevo viaje
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <MapPin className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No hay viajes programados para hoy</p>
            <Link href="/trips/new" className="btn-primary mt-4">
              Crear primer viaje
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3">Viaje</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Salida</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Abordaje</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trips.map(trip => {
                  const counts = countsByTrip[trip.id] ?? { total: 0, boarded: 0 }
                  const pct = counts.total > 0 ? Math.round(counts.boarded / counts.total * 100) : 0
                  return (
                    <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-gray-900">{trip.trip_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 max-w-[180px] truncate">
                          {trip.origin_label} → {trip.destination_label}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatTime(trip.departure_time)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {trip.vehicle
                          ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {trip.vehicle.plate}
                            </span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {trip.driver
                          ? `${trip.driver.first_name} ${trip.driver.last_name}`
                          : <span className="text-gray-400">Sin asignar</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="h-1.5 rounded-full bg-ops-green transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {counts.boarded}/{counts.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', TRIP_STATUS_COLORS[trip.status],
                          trip.status === 'boarding' && 'boarding-active')}>
                          {TRIP_STATUS_LABELS[trip.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/trips/${trip.id}`}
                          className="text-brand-500 hover:text-brand-700 text-xs font-medium"
                        >
                          Ver →
                        </Link>
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

function KpiCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: number; bg: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn('p-2.5 rounded-xl', bg)}>{icon}</div>
      </div>
    </div>
  )
}
