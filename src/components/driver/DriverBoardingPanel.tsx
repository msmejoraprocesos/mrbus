'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Check, Clock, WifiOff, Loader2 } from 'lucide-react'
import { fullName, cn, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/utils'
import type { TripPassengerWithDetails } from '@/lib/types'

interface Props {
  tripId: string
  initialPassengers: TripPassengerWithDetails[]
  canBoard: boolean
}

// Cola offline
interface OfflineAction {
  id: string
  tripId: string
  tripPassengerId: string
  timestamp: number
}
const QUEUE_KEY = 'tos:offline:queue'

export default function DriverBoardingPanel({ tripId, initialPassengers, canBoard }: Props) {
  const supabase = createClient()
  const [passengers, setPassengers]   = useState(initialPassengers)
  const [search, setSearch]           = useState('')
  const [boardingId, setBoardingId]   = useState<string | null>(null)
  const [isOnline, setIsOnline]       = useState(true)
  const offlineQueue                  = useRef<OfflineAction[]>([])
  const searchRef                     = useRef<HTMLInputElement>(null)

  // Estado online/offline
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on = () => { setIsOnline(true); processQueue() }
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    // Recuperar cola persistida
    try {
      const saved = localStorage.getItem(QUEUE_KEY)
      if (saved) offlineQueue.current = JSON.parse(saved)
    } catch {}

    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`driver-boarding-${tripId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'trip_passengers',
        filter: `trip_id=eq.${tripId}`,
      }, payload => {
        setPassengers(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new as TripPassengerWithDetails } : p)
        )
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId, supabase])

  async function processQueue() {
    const queue = [...offlineQueue.current]
    for (const action of queue) {
      try {
        const res = await fetch('/api/boarding/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: action.tripId, trip_passenger_id: action.tripPassengerId }),
        })
        const result = await res.json()
        if (result.success || result.error?.includes('ya abordó')) {
          offlineQueue.current = offlineQueue.current.filter(a => a.id !== action.id)
        }
      } catch {}
    }
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue.current)) } catch {}
  }

  const handleCheckIn = useCallback(async (tp: TripPassengerWithDetails) => {
    if (tp.boarding_status !== 'pending' || boardingId) return

    // Optimistic update
    setPassengers(prev =>
      prev.map(p => p.id === tp.id
        ? { ...p, boarding_status: 'boarded', boarded_at: new Date().toISOString() }
        : p
      )
    )

    // GPS
    let lat: number | undefined, lng: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 3000 })
      )
      lat = pos.coords.latitude; lng = pos.coords.longitude
    } catch {}

    if (!isOnline) {
      const action: OfflineAction = {
        id: crypto.randomUUID(),
        tripId, tripPassengerId: tp.id,
        timestamp: Date.now(),
      }
      offlineQueue.current = [...offlineQueue.current, action]
      try { localStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue.current)) } catch {}
      toast.success(`✓ ${fullName(tp.first_name, tp.last_name)} — guardado sin conexión`)
      return
    }

    setBoardingId(tp.id)
    const res = await fetch('/api/boarding/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, trip_passenger_id: tp.id, lat, lng }),
    })
    const result = await res.json()
    setBoardingId(null)

    if (!result.success) {
      // Revertir
      setPassengers(prev =>
        prev.map(p => p.id === tp.id ? { ...p, boarding_status: 'pending', boarded_at: null } : p)
      )
      toast.error(result.error ?? 'Error al registrar')
    } else {
      // Vibración háptica
      navigator.vibrate?.(100)
      toast.success(`✓ ${fullName(tp.first_name ?? tp.passenger?.first_name ?? null, tp.last_name ?? tp.passenger?.last_name ?? null)} abordó`)
    }
  }, [tripId, isOnline, boardingId])

  // Filtrado
  const filtered = passengers.filter(p => {
    if (!search.trim()) return true
    const name = fullName(p.first_name ?? p.passenger?.first_name ?? null,
                          p.last_name  ?? p.passenger?.last_name  ?? null).toLowerCase()
    const phone = (p.phone ?? p.passenger?.phone ?? '').toLowerCase()
    return name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase())
  })

  // Ordenar: pendientes primero
  const sorted = [...filtered].sort((a, b) => {
    if (a.boarding_status === 'pending' && b.boarding_status !== 'pending') return -1
    if (a.boarding_status !== 'pending' && b.boarding_status === 'pending') return 1
    return 0
  })

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Banner offline */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Sin conexión — los abordajes se guardan localmente y se sincronizan al reconectar</span>
        </div>
      )}

      {/* Buscador grande */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={searchRef}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5
                     text-base placeholder-gray-400 focus:outline-none focus:ring-2
                     focus:ring-brand-500/30 focus:border-brand-500 shadow-sm"
          placeholder="Buscar pasajero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 px-1">
        {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
        {' · '}pendientes: {passengers.filter(p => p.boarding_status === 'pending').length}
      </p>

      {/* Lista de pasajeros */}
      <div className="space-y-2">
        {sorted.map(p => {
          const name = fullName(p.first_name ?? p.passenger?.first_name ?? null,
                                p.last_name  ?? p.passenger?.last_name  ?? null)
          const phone = p.phone ?? p.passenger?.phone ?? null
          const isPending = p.boarding_status === 'pending'
          const isBoarded = p.boarding_status === 'boarded'
          const isLoading = boardingId === p.id

          return (
            <div key={p.id} className={cn(
              'bg-white rounded-2xl shadow-sm border transition-all',
              isBoarded ? 'border-green-200 bg-green-50/50' : 'border-gray-100',
            )}>
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                  isBoarded ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                )}>
                  {name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn('font-semibold truncate text-base',
                    isBoarded ? 'text-green-800' : 'text-gray-900')}>
                    {name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {phone && <span className="text-xs text-gray-500">{phone}</span>}
                    <span className={cn('badge text-[10px]', PAYMENT_STATUS_COLORS[p.payment_status])}>
                      {PAYMENT_STATUS_LABELS[p.payment_status]}
                    </span>
                  </div>
                </div>

                {/* Acción */}
                {canBoard && isPending && (
                  <button
                    onClick={() => handleCheckIn(p)}
                    disabled={!!boardingId}
                    className="flex-shrink-0 w-14 h-14 rounded-2xl bg-ops-green active:scale-90
                               flex items-center justify-center text-white shadow-md transition-all
                               disabled:opacity-50"
                    aria-label={`Registrar abordaje de ${name}`}
                  >
                    {isLoading
                      ? <Loader2 className="w-6 h-6 animate-spin" />
                      : <Check className="w-7 h-7 stroke-[2.5]" />
                    }
                  </button>
                )}

                {isBoarded && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-green-100
                                  flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600 stroke-[2.5]" />
                  </div>
                )}

                {p.boarding_status === 'absent' && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-red-50
                                  flex items-center justify-center">
                    <Clock className="w-5 h-5 text-red-400" />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && search && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No se encontró ningún pasajero con "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
