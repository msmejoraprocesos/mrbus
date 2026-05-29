import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Users, MapPin, Clock, Truck, UserCircle, AlertCircle } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS, formatDate, formatTime, cn } from '@/lib/utils'
import TripActions from '@/components/admin/TripActions'
import BoardingMonitor from '@/components/admin/BoardingMonitor'
import AddPassengerForm from '@/components/admin/AddPassengerForm'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Viaje` }
}

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: trip } = await supabase.from('trips').select('*, vehicle:vehicles(*), driver:drivers(*)').eq('id', params.id).single()
  if (!trip) notFound()

  const { data: passengers } = await supabase
    .from('trip_passengers')
    .select('*, passenger:passengers(first_name,last_name,phone,employee_number)')
    .eq('trip_id', params.id)
    .order('last_name')

  const pax = passengers ?? []
  const boarded = pax.filter((p: { boarding_status: string }) => p.boarding_status === 'boarded').length
  const pending = pax.filter((p: { boarding_status: string }) => p.boarding_status === 'pending').length
  const pct = pax.length > 0 ? Math.round(boarded / pax.length * 100) : 0
  const canBoard = ['boarding','in_transit'].includes(trip.status)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start gap-4">
        <Link href="/trips" className="btn-secondary p-2 mt-1"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{trip.trip_number}</h1>
            <span className={cn('badge text-sm', TRIP_STATUS_COLORS[trip.status], trip.status === 'boarding' && 'boarding-active')}>
              {TRIP_STATUS_LABELS[trip.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">{TRIP_TYPE_LABELS[trip.type]}{trip.client_name && ` · ${trip.client_name}`}</p>
        </div>
        <TripActions tripId={trip.id} currentStatus={trip.status} passengerCount={pax.length} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon:<MapPin className="w-4 h-4 text-brand-500" />, label:'Ruta', value:`${trip.origin_label} → ${trip.destination_label}` },
          { icon:<Clock className="w-4 h-4 text-brand-500" />, label:'Salida', value:`${formatDate(trip.departure_date)} ${formatTime(trip.departure_time)}` },
          { icon:<Truck className="w-4 h-4 text-brand-500" />, label:'Unidad', value:trip.vehicle?.plate ?? 'Sin asignar', warn:!trip.vehicle },
          { icon:<UserCircle className="w-4 h-4 text-brand-500" />, label:'Operador', value:trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Sin asignar', warn:!trip.driver },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center gap-1.5 mb-1">{item.icon}<p className="text-xs text-gray-500 font-medium uppercase">{item.label}</p></div>
            <p className={cn('text-sm font-medium', item.warn ? 'text-amber-600' : 'text-gray-900')}>
              {item.warn && <AlertCircle className="inline w-3.5 h-3.5 mr-1" />}{item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Pasajeros</h2>
            <span className="text-sm text-gray-500">{boarded} abordaron · {pending} pendientes · cap. {trip.capacity}</span>
          </div>
          {pax.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{pct}%</span>
            </div>
          )}
        </div>
        {['draft','scheduled','boarding'].includes(trip.status) && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <AddPassengerForm tripId={trip.id} capacity={trip.capacity} currentCount={pax.length} />
          </div>
        )}
        <BoardingMonitor tripId={trip.id} initialPassengers={pax} canBoard={canBoard} />
      </div>
    </div>
  )
}
