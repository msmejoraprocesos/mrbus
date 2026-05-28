import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Users, MapPin, Clock, Truck } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, formatDate, formatTime, cn } from '@/lib/utils'
import DriverBoardingPanel from '@/components/driver/DriverBoardingPanel'
import DriverTripControls from '@/components/driver/DriverTripControls'
import type { TripWithRelations, TripPassengerWithDetails } from '@/lib/types'

export const revalidate = 0

export default async function DriverTripPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: trip } = await supabase
    .from('trips')
    .select('*, vehicle:vehicles(plate, economic_number, type, capacity), driver:drivers(*)')
    .eq('id', params.id)
    .single()

  if (!trip) return notFound()

  const { data: pax } = await supabase
    .from('trip_passengers')
    .select('*, passenger:passengers(first_name, last_name, phone, employee_number)')
    .eq('trip_id', params.id)
    .order('boarding_status', { ascending: true }) // pending primero
    .order('last_name', { ascending: true })

  const t = trip as TripWithRelations
  const passengers = (pax ?? []) as TripPassengerWithDetails[]

  const boarded  = passengers.filter(p => p.boarding_status === 'boarded').length
  const pending  = passengers.filter(p => p.boarding_status === 'pending').length
  const pct      = passengers.length > 0 ? Math.round(boarded / passengers.length * 100) : 0
  const canBoard = ['boarding','in_transit'].includes(t.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del viaje */}
      <div className="bg-brand-700 text-white px-4 pt-safe-t pt-6 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/driver/home" className="p-2 bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('badge text-xs border-0',
                TRIP_STATUS_COLORS[t.status].replace('bg-', 'bg-opacity-90 bg-').replace('text-', 'text-'),
                t.status === 'boarding' && 'boarding-active')}>
                {TRIP_STATUS_LABELS[t.status]}
              </span>
              <span className="text-blue-300 text-xs font-mono">{t.trip_number}</span>
            </div>
          </div>
        </div>

        {/* Ruta */}
        <div className="space-y-1">
          <p className="text-2xl font-bold leading-tight truncate">{t.origin_label}</p>
          <p className="text-blue-200 flex items-center gap-1">
            <span className="text-xs">↓</span> {t.destination_label}
          </p>
        </div>

        {/* Info rápida */}
        <div className="flex items-center gap-4 mt-3 text-blue-200 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(t.departure_time)}
          </span>
          <span className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            {t.vehicle?.plate ?? '—'}
          </span>
        </div>
      </div>

      {/* Barra de progreso prominente */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-900">{boarded}</span>
            <span className="text-gray-500 text-sm"> / {passengers.length} abordaron</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-amber-600">{pending}</span>
            <span className="text-gray-500 text-sm"> pendientes</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-ops-green transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">
          Capacidad: {t.capacity} · {pct}% ocupación
        </p>
      </div>

      {/* Controles del viaje */}
      <DriverTripControls tripId={t.id} status={t.status} boardedCount={boarded} totalCount={passengers.length} />

      {/* Panel de abordaje */}
      {passengers.length > 0 && (
        <DriverBoardingPanel
          tripId={t.id}
          initialPassengers={passengers}
          canBoard={canBoard}
        />
      )}

      {passengers.length === 0 && (
        <div className="flex flex-col items-center py-12 text-gray-400 px-4">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-center text-sm">Aún no hay pasajeros registrados en este viaje</p>
        </div>
      )}
    </div>
  )
}
