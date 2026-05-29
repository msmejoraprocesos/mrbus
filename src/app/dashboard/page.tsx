import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Users, CheckCircle, Plus } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, formatDate, formatTime, cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: trips } = await supabase
    .from('trips')
    .select('*, vehicle:vehicles(plate), driver:drivers(first_name, last_name)')
    .eq('departure_date', today)
    .neq('status', 'cancelled')
    .order('departure_time')

  const tripList = trips ?? []
  const tripIds = tripList.map((t: { id: string }) => t.id)

  const { data: paxData } = tripIds.length > 0
    ? await supabase.from('trip_passengers').select('trip_id, boarding_status').in('trip_id', tripIds)
    : { data: [] }

  const counts = (paxData ?? []).reduce((acc: Record<string, { total: number; boarded: number }>, p: { trip_id: string; boarding_status: string }) => {
    if (!acc[p.trip_id]) acc[p.trip_id] = { total: 0, boarded: 0 }
    acc[p.trip_id].total++
    if (p.boarding_status === 'boarded') acc[p.trip_id].boarded++
    return acc
  }, {})

  const kpis = {
    total: tripList.length,
    active: tripList.filter((t: { status: string }) => ['boarding','in_transit'].includes(t.status)).length,
    passengers: Object.values(counts).reduce((s, c) => s + (c as {total:number;boarded:number}).total, 0),
    boarded: Object.values(counts).reduce((s, c) => s + (c as {total:number;boarded:number}).boarded, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{formatDate(today)}</p>
        </div>
        <Link href="/trips/new" className="btn-primary"><Plus className="w-4 h-4" />Nuevo viaje</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Viajes hoy', value:kpis.total, icon:<MapPin className="w-5 h-5 text-blue-500" />, bg:'bg-blue-50' },
          { label:'Activos', value:kpis.active, icon:<Clock className="w-5 h-5 text-amber-500" />, bg:'bg-amber-50' },
          { label:'Pasajeros', value:kpis.passengers, icon:<Users className="w-5 h-5 text-purple-500" />, bg:'bg-purple-50' },
          { label:'Abordaron', value:kpis.boarded, icon:<CheckCircle className="w-5 h-5 text-green-500" />, bg:'bg-green-50' },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{k.value}</p>
              </div>
              <div className={cn('p-2.5 rounded-xl', k.bg)}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Viajes del día</h2>
        </div>
        {tripList.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MapPin className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay viajes programados para hoy</p>
            <Link href="/trips/new" className="btn-primary mt-4">Crear viaje</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-6 py-3">Folio</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Abordaje</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tripList.map((trip: { id: string; trip_number: string; origin_label: string; destination_label: string; departure_time: string; status: string; vehicle: { plate: string } | null; driver: { first_name: string; last_name: string } | null }) => {
                  const c = counts[trip.id] ?? { total: 0, boarded: 0 }
                  const pct = c.total > 0 ? Math.round(c.boarded / c.total * 100) : 0
                  return (
                    <tr key={trip.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono text-xs font-semibold">{trip.trip_number}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate">{trip.origin_label} → {trip.destination_label}</td>
                      <td className="px-4 py-3 text-gray-600">{formatTime(trip.departure_time)}</td>
                      <td className="px-4 py-3">
                        {trip.vehicle ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{trip.vehicle.plate}</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : <span className="text-gray-400">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{c.boarded}/{c.total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', TRIP_STATUS_COLORS[trip.status], trip.status === 'boarding' && 'boarding-active')}>
                          {TRIP_STATUS_LABELS[trip.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/trips/${trip.id}`} className="text-brand-500 hover:text-brand-700 text-xs font-medium">Ver →</Link>
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
