import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { Plus, MapPin } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS, formatDate, formatTime, cn } from '@/lib/utils'
import type { TripWithRelations } from '@/lib/types'

export const metadata: Metadata = { title: 'Viajes' }
export const revalidate = 0

export default async function TripsPage({
  searchParams
}: {
  searchParams: { status?: string; date?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('trips')
    .select(`*, vehicle:vehicles(plate, type), driver:drivers(first_name, last_name)`)
    .order('departure_date', { ascending: false })
    .order('departure_time', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.date)   query = query.eq('departure_date', searchParams.date)

  const { data } = await query.limit(100)
  const trips = (data ?? []) as TripWithRelations[]

  const statuses = ['scheduled','boarding','in_transit','completed','cancelled']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
        <Link href="/trips/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo viaje
        </Link>
      </div>

      {/* Filtros rápidos por estado */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/trips"
          className={cn('badge px-3 py-1.5 text-xs border cursor-pointer',
            !searchParams.status ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          )}
        >
          Todos ({trips.length})
        </Link>
        {statuses.map(s => (
          <Link key={s} href={`/trips?status=${s}`}
            className={cn('badge px-3 py-1.5 text-xs border cursor-pointer',
              searchParams.status === s
                ? TRIP_STATUS_COLORS[s as keyof typeof TRIP_STATUS_COLORS] + ' border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {TRIP_STATUS_LABELS[s as keyof typeof TRIP_STATUS_LABELS]}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="card">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MapPin className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay viajes con estos filtros</p>
            <Link href="/trips/new" className="btn-primary mt-4">Crear viaje</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3">Folio</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-3 font-semibold text-gray-900 font-mono text-xs">
                      {trip.trip_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 max-w-[200px] truncate">
                        {trip.origin_label} → {trip.destination_label}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {formatDate(trip.departure_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatTime(trip.departure_time)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {TRIP_TYPE_LABELS[trip.type]}
                    </td>
                    <td className="px-4 py-3">
                      {trip.vehicle
                        ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {trip.vehicle.plate}
                          </span>
                        : <span className="text-gray-400 text-xs">Sin asignar</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {trip.driver
                        ? `${trip.driver.first_name} ${trip.driver.last_name}`
                        : <span className="text-gray-400">Sin asignar</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', TRIP_STATUS_COLORS[trip.status],
                        trip.status === 'boarding' && 'boarding-active')}>
                        {TRIP_STATUS_LABELS[trip.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/trips/${trip.id}`}
                        className="text-brand-500 hover:text-brand-700 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
