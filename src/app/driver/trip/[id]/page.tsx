import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Truck, Clock } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, formatDate, formatTime, cn } from '@/lib/utils'
import DriverBoardingPanel from '@/components/driver/DriverBoardingPanel'
import DriverTripControls from '@/components/driver/DriverTripControls'
export const dynamic = 'force-dynamic'

export default async function DriverTripPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: trip } = await supabase.from('trips').select('*, vehicle:vehicles(plate,capacity), driver:drivers(*)').eq('id', params.id).single()
  if (!trip) return notFound()

  const { data: pax } = await supabase.from('trip_passengers')
    .select('*, passenger:passengers(first_name,last_name,phone,employee_number)')
    .eq('trip_id', params.id).order('boarding_status').order('last_name')

  const passengers = pax ?? []
  const boarded = passengers.filter((p: {boarding_status:string}) => p.boarding_status === 'boarded').length
  const pending = passengers.filter((p: {boarding_status:string}) => p.boarding_status === 'pending').length
  const pct = passengers.length > 0 ? Math.round(boarded / passengers.length * 100) : 0
  const canBoard = ['boarding','in_transit'].includes(trip.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0a1628] text-white px-4 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/driver/home" className="p-2 bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('badge text-xs', TRIP_STATUS_COLORS[trip.status])}>{TRIP_STATUS_LABELS[trip.status]}</span>
              <span className="text-blue-300 text-xs font-mono">{trip.trip_number}</span>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold leading-tight truncate">{trip.origin_label}</p>
        <p className="text-blue-200 text-sm">→ {trip.destination_label}</p>
        <div className="flex items-center gap-4 mt-3 text-blue-200 text-sm">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatTime(trip.departure_time)}</span>
          <span className="flex items-center gap-1"><Truck className="w-4 h-4" />{trip.vehicle?.plate ?? '—'}</span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex justify-between items-center mb-2">
          <div><span className="text-2xl font-bold text-gray-900">{boarded}</span><span className="text-gray-500 text-sm"> / {passengers.length} abordaron</span></div>
          <div className="text-right"><span className="text-lg font-semibold text-amber-600">{pending}</span><span className="text-gray-500 text-sm"> pendientes</span></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full bg-green-500 transition-all duration-500" style={{ width:`${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">Capacidad: {trip.capacity} · {pct}% ocupación</p>
      </div>

      <DriverTripControls tripId={trip.id} status={trip.status} boardedCount={boarded} totalCount={passengers.length} />
      {passengers.length > 0
        ? <DriverBoardingPanel tripId={trip.id} initialPassengers={passengers} canBoard={canBoard} />
        : <div className="flex flex-col items-center py-12 text-gray-400 px-4"><p className="text-sm text-center">Sin pasajeros registrados</p></div>
      }
    </div>
  )
}
