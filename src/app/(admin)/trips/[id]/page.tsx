import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Users, MapPin, Clock, Truck, UserCircle, AlertCircle } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS, formatDate, formatTime, cn } from '@/lib/utils'
import TripActions from '@/components/admin/TripActions'
import BoardingMonitor from '@/components/admin/BoardingMonitor'
import AddPassengerForm from '@/components/admin/AddPassengerForm'
import type { TripWithRelations, TripPassengerWithDetails } from '@/lib/types'

export const revalidate = 0

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Viaje ${params.id.slice(0, 8).toUpperCase()}` }
}

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select(`*, vehicle:vehicles(*), driver:drivers(*)`)
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const { data: passengers } = await supabase
    .from('trip_passengers')
    .select(`*, passenger:passengers(first_name, last_name, phone, employee_number)`)
    .eq('trip_id', params.id)
    .order('last_name', { ascending: true })

  const paxList = (passengers ?? []) as TripPassengerWithDetails[]
  const t = trip as TripWithRelations

  const boarded   = paxList.filter(p => p.boarding_status === 'boarded').length
  const pending   = paxList.filter(p => p.boarding_status === 'pending').length
  const pct       = paxList.length > 0 ? Math.round(boarded / paxList.length * 100) : 0
  const canBoard  = ['boarding','in_transit'].includes(t.status)
  const canEdit   = ['draft','scheduled'].includes(t.status)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/trips" className="btn-secondary p-2 mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{t.trip_number}</h1>
            <span className={cn('badge text-sm', TRIP_STATUS_COLORS[t.status],
              t.status === 'boarding' && 'boarding-active')}>
              {TRIP_STATUS_LABELS[t.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {TRIP_TYPE_LABELS[t.type]}
            {t.client_name && ` · ${t.client_name}`}
          </p>
        </div>
        {canEdit && (
          <TripActions tripId={t.id} currentStatus={t.status} passengerCount={paxList.length} />
        )}
        {!canEdit && (
          <TripActions tripId={t.id} currentStatus={t.status} passengerCount={paxList.length} />
        )}
      </div>

      {/* Datos del viaje */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={<MapPin className="w-4 h-4 text-brand-500" />}
          label="Ruta" value={`${t.origin_label} → ${t.destination_label}`} />
        <InfoCard icon={<Clock className="w-4 h-4 text-brand-500" />}
          label="Salida" value={`${formatDate(t.departure_date)} ${formatTime(t.departure_time)}`} />
        <InfoCard icon={<Truck className="w-4 h-4 text-brand-500" />}
          label="Unidad"
          value={t.vehicle ? `${t.vehicle.plate}` : 'Sin asignar'}
          warn={!t.vehicle} />
        <InfoCard icon={<UserCircle className="w-4 h-4 text-brand-500" />}
          label="Operador"
          value={t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Sin asignar'}
          warn={!t.driver} />
      </div>

      {/* Panel de abordaje */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Pasajeros</h2>
            <span className="text-sm text-gray-500">
              {boarded} abordaron · {pending} pendientes · cap. {t.capacity}
            </span>
          </div>

          {/* Barra de progreso */}
          {paxList.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-ops-green transition-all"
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{pct}%</span>
            </div>
          )}
        </div>

        {/* Formulario para agregar pasajero */}
        {['draft','scheduled','boarding'].includes(t.status) && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <AddPassengerForm tripId={t.id} capacity={t.capacity} currentCount={paxList.length} />
          </div>
        )}

        {/* Lista en tiempo real */}
        <BoardingMonitor
          tripId={t.id}
          initialPassengers={paxList}
          canBoard={canBoard}
        />
      </div>

      {/* Notas */}
      {t.notes && (
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas</p>
          <p className="text-sm text-gray-700">{t.notes}</p>
        </div>
      )}
    </div>
  )
}

function InfoCard({ icon, label, value, warn }: {
  icon: React.ReactNode; label: string; value: string; warn?: boolean
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn('text-sm font-medium', warn ? 'text-amber-600' : 'text-gray-900')}>
        {warn && <AlertCircle className="inline w-3.5 h-3.5 mr-1" />}
        {value}
      </p>
    </div>
  )
}
