'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, CheckCircle, Clock, UserX, Loader2 } from 'lucide-react'
import { BOARDING_STATUS_LABELS, BOARDING_STATUS_COLORS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS, fullName, formatDateTime, cn } from '@/lib/utils'

export default function BoardingMonitor({ tripId, initialPassengers, canBoard }: { tripId: string; initialPassengers: any[]; canBoard: boolean }) {
  const supabase = createClient()
  const [passengers, setPassengers] = useState(initialPassengers)
  const [search, setSearch] = useState('')
  const [boardingId, setBoardingId] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase.channel(`bm-${tripId}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'trip_passengers', filter:`trip_id=eq.${tripId}` },
        payload => setPassengers(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'trip_passengers', filter:`trip_id=eq.${tripId}` },
        async payload => {
          const { data } = await supabase.from('trip_passengers').select('*, passenger:passengers(first_name,last_name,phone,employee_number)').eq('id', payload.new.id).single()
          if (data) setPassengers(prev => [...prev, data])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId, supabase])

  const handleCheckIn = useCallback(async (tp: any) => {
    if (tp.boarding_status !== 'pending' || boardingId) return
    setBoardingId(tp.id)
    let lat: number | undefined, lng: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 3000 }))
      lat = pos.coords.latitude; lng = pos.coords.longitude
    } catch {}
    const res = await fetch('/api/boarding/checkin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ trip_id: tripId, trip_passenger_id: tp.id, lat, lng }) })
    const result = await res.json()
    setBoardingId(null)
    if (result.success) {
      const name = fullName(tp.first_name ?? tp.passenger?.first_name ?? null, tp.last_name ?? tp.passenger?.last_name ?? null)
      toast.success(`✓ ${name} abordó`)
    } else {
      toast.error(result.error ?? 'Error al registrar')
    }
  }, [tripId, boardingId])

  const filtered = passengers.filter(p => {
    const name = fullName(p.first_name ?? p.passenger?.first_name ?? null, p.last_name ?? p.passenger?.last_name ?? null).toLowerCase()
    const phone = (p.phone ?? p.passenger?.phone ?? '').toLowerCase()
    return !search.trim() || name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase())
  })

  if (passengers.length === 0) return (
    <div className="flex flex-col items-center py-12 text-gray-400">
      <Clock className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-sm">No hay pasajeros registrados</p>
    </div>
  )

  return (
    <div>
      <div className="px-6 py-3 border-b border-gray-100 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {filtered.map(p => {
          const name = fullName(p.first_name ?? p.passenger?.first_name ?? null, p.last_name ?? p.passenger?.last_name ?? null)
          const phone = p.phone ?? p.passenger?.phone ?? null
          const isLoading = boardingId === p.id
          return (
            <div key={p.id} className={cn('flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50', p.boarding_status === 'boarded' && 'bg-green-50/30')}>
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0', p.boarding_status === 'boarded' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                {name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                {phone && <p className="text-xs text-gray-500">{phone}</p>}
                {p.boarded_at && <p className="text-xs text-green-600">Abordó {formatDateTime(p.boarded_at)}</p>}
              </div>
              <span className={cn('badge hidden sm:inline-flex', PAYMENT_STATUS_COLORS[p.payment_status])}>{PAYMENT_STATUS_LABELS[p.payment_status]}</span>
              <span className={cn('badge', BOARDING_STATUS_COLORS[p.boarding_status])}>{BOARDING_STATUS_LABELS[p.boarding_status]}</span>
              {canBoard && p.boarding_status === 'pending' && (
                <button onClick={() => handleCheckIn(p)} disabled={!!boardingId} className="btn-primary py-1.5 px-3 text-xs flex-shrink-0">
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" />Abordar</>}
                </button>
              )}
              {p.boarding_status === 'boarded' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {p.boarding_status === 'absent' && <UserX className="w-5 h-5 text-red-400 flex-shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
