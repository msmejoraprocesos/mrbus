// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, CheckCircle, Clock, UserX, Loader2 } from 'lucide-react'
import {
  BOARDING_STATUS_LABELS, BOARDING_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  fullName, formatDateTime, cn
} from '@/lib/utils'
import type { TripPassengerWithDetails, BoardingStatus } from '@/lib/types'

interface Props {
  tripId: string
  initialPassengers: TripPassengerWithDetails[]
  canBoard: boolean
}

export default function BoardingMonitor({ tripId, initialPassengers, canBoard }: Props) {
  const supabase = createClient()
  const [passengers, setPassengers]     = useState(initialPassengers)
  const [search, setSearch]             = useState('')
  const [filter, setFilter]             = useState<BoardingStatus | 'all'>('all')
  const [boardingId, setBoardingId]     = useState<string | null>(null)

  // Suscripción en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel(`boarding-monitor-${tripId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trip_passengers',
        filter: `trip_id=eq.${tripId}`,
      }, payload => {
        setPassengers(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new as TripPassengerWithDetails } : p)
        )
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_passengers',
        filter: `trip_id=eq.${tripId}`,
      }, async payload => {
        // Nuevo pasajero agregado — cargar con relaciones
        const { data } = await supabase
          .from('trip_passengers')
          .select('*, passenger:passengers(first_name, last_name, phone, employee_number)')
          .eq('id', payload.new.id)
          .single()
        if (data) setPassengers(prev => [...prev, data as TripPassengerWithDetails])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId, supabase])

  const handleCheckIn = useCallback(async (tp: TripPassengerWithDetails) => {
    if (tp.boarding_status !== 'pending') return
    setBoardingId(tp.id)

    // Obtener GPS
    let lat: number | undefined, lng: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 3000 })
      )
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch {}

    const res = await fetch('/api/boarding/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, trip_passenger_id: tp.id, lat, lng }),
    })
    const result = await res.json()
    setBoardingId(null)

    if (result.success) {
      const name = fullName(tp.first_name ?? tp.passenger?.first_name ?? null,
                            tp.last_name  ?? tp.passenger?.last_name  ?? null)
      toast.success(`✓ ${name} abordó`)
    } else {
      toast.error(result.error ?? 'Error al registrar abordaje')
    }
  }, [tripId])

  // Filtrado
  const filtered = passengers.filter(p => {
    const name = fullName(p.first_name ?? p.passenger?.first_name ?? null,
                          p.last_name  ?? p.passenger?.last_name  ?? null).toLowerCase()
    const phone = (p.phone ?? p.passenger?.phone ?? '').toLowerCase()
    const matchSearch = !search.trim() || name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.boarding_status === filter
    return matchSearch && matchFilter
  })

  const statusCounts = {
    all:       passengers.length,
    pending:   passengers.filter(p => p.boarding_status === 'pending').length,
    boarded:   passengers.filter(p => p.boarding_status === 'boarded').length,
    absent:    passengers.filter(p => p.boarding_status === 'absent').length,
    cancelled: passengers.filter(p => p.boarding_status === 'cancelled').length,
  }

  if (passengers.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-400">
        <Clock className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">No hay pasajeros registrados en este viaje</p>
      </div>
    )
  }

  return (
    <div>
      {/* Buscador y filtros */}
      <div className="px-6 py-3 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['all','pending','boarded'] as const).map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : 'Abordaron'}
              <span className="ml-1 opacity-70">({statusCounts[s]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-50">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No hay pasajeros que coincidan con la búsqueda
          </div>
        )}
        {filtered.map(p => {
          const name = fullName(p.first_name ?? p.passenger?.first_name ?? null,
                                p.last_name  ?? p.passenger?.last_name  ?? null)
          const phone = p.phone ?? p.passenger?.phone ?? null
          const isLoading = boardingId === p.id

          return (
            <div key={p.id}
              className={cn('flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors',
                p.boarding_status === 'boarded' && 'bg-green-50/30'
              )}
            >
              {/* Avatar */}
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
                p.boarding_status === 'boarded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              )}>
                {name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                {phone && <p className="text-xs text-gray-500">{phone}</p>}
                {p.boarded_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Abordó a las {formatDateTime(p.boarded_at)}
                  </p>
                )}
              </div>

              {/* Pago */}
              <span className={cn('badge hidden sm:inline-flex', PAYMENT_STATUS_COLORS[p.payment_status])}>
                {PAYMENT_STATUS_LABELS[p.payment_status]}
              </span>

              {/* Estado */}
              <span className={cn('badge', BOARDING_STATUS_COLORS[p.boarding_status])}>
                {BOARDING_STATUS_LABELS[p.boarding_status]}
              </span>

              {/* Acción */}
              {canBoard && p.boarding_status === 'pending' && (
                <button
                  onClick={() => handleCheckIn(p)}
                  disabled={!!boardingId}
                  className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap flex-shrink-0"
                >
                  {isLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><CheckCircle className="w-3.5 h-3.5" /> Abordar</>
                  }
                </button>
              )}
              {p.boarding_status === 'boarded' && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              {p.boarding_status === 'absent' && (
                <UserX className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
