// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, Users, ChevronRight, Bus } from 'lucide-react'
import {
  TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS,
  formatDate, formatTime, cn
} from '@/lib/utils'
import type { TripWithRelations } from '@/lib/types'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mis Viajes' }
export const revalidate = 0

export default async function DriverHomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener perfil y driver_id
  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, role:roles(name)')
    .eq('id', user.id)
    .single()

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Viajes asignados: hoy y próximos 7 días
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  let query = supabase
    .from('trips')
    .select(`*, vehicle:vehicles(plate, economic_number), driver:drivers(first_name, last_name)`)
    .gte('departure_date', today)
    .lte('departure_date', nextWeek)
    .not('status', 'in', '("cancelled","completed")')
    .order('departure_date')
    .order('departure_time')

  if (driver?.id) {
    query = query.eq('driver_id', driver.id)
  }

  const { data } = await query
  const trips = (data ?? []) as TripWithRelations[]

  // Contar pasajeros
  const tripIds = trips.map(t => t.id)
  const { data: paxCounts } = tripIds.length > 0
    ? await supabase
        .from('trip_passengers')
        .select('trip_id, boarding_status')
        .in('trip_id', tripIds)
        .not('boarding_status', 'eq', 'cancelled')
    : { data: [] }

  const countMap = (paxCounts ?? []).reduce((acc, p) => {
    if (!acc[p.trip_id]) acc[p.trip_id] = { total: 0, boarded: 0 }
    acc[p.trip_id].total++
    if (p.boarding_status === 'boarded') acc[p.trip_id].boarded++
    return acc
  }, {} as Record<string, { total: number; boarded: number }>)

  const firstName = profile?.first_name ?? 'Operador'
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'

  // Viaje activo
  const activeTrip = trips.find(t => ['boarding','in_transit'].includes(t.status))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-700 text-white px-5 pt-safe-t pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-xs">MB</span>
          </div>
          <div>
            <p className="text-blue-200 text-sm">{greeting},</p>
            <p className="font-bold text-lg leading-tight">{firstName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-6">

        {/* Viaje activo destacado */}
        {activeTrip && (
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 px-1">
              🔴 En curso ahora
            </p>
            <Link href={`/driver/trip/${activeTrip.id}`}>
              <TripCard trip={activeTrip} counts={countMap[activeTrip.id]} highlight />
            </Link>
          </div>
        )}

        {/* Próximos viajes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Próximos viajes
          </p>

          {trips.filter(t => !['boarding','in_transit'].includes(t.status)).length === 0 && !activeTrip && (
            <div className="card p-8 text-center text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tienes viajes asignados esta semana</p>
            </div>
          )}

          <div className="space-y-3">
            {trips
              .filter(t => !['boarding','in_transit'].includes(t.status))
              .map(trip => (
                <Link key={trip.id} href={`/driver/trip/${trip.id}`}>
                  <TripCard trip={trip} counts={countMap[trip.id]} />
                </Link>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function TripCard({ trip, counts, highlight }: {
  trip: TripWithRelations
  counts?: { total: number; boarded: number }
  highlight?: boolean
}) {
  const pct = counts && counts.total > 0 ? Math.round(counts.boarded / counts.total * 100) : 0

  return (
    <div className={cn(
      'card p-4 active:scale-[0.98] transition-transform cursor-pointer',
      highlight && 'border-2 border-amber-400 shadow-md'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('badge text-xs', TRIP_STATUS_COLORS[trip.status])}>
              {TRIP_STATUS_LABELS[trip.status]}
            </span>
            <span className="text-xs text-gray-400 font-mono">{trip.trip_number}</span>
          </div>

          <p className="font-bold text-gray-900 text-base leading-tight truncate">
            {trip.origin_label}
          </p>
          <p className="text-gray-500 text-sm">→ {trip.destination_label}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(trip.departure_time)} · {formatDate(trip.departure_date)}
            </span>
            {counts && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {counts.total} pasajeros
              </span>
            )}
          </div>

          {/* Barra de abordaje */}
          {counts && counts.total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-ops-green" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-500">{counts.boarded}/{counts.total}</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </div>
  )
}
