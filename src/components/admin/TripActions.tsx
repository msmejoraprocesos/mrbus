'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Play, Navigation, CheckCircle, X } from 'lucide-react'
import type { TripStatus } from '@/lib/types'

interface Props {
  tripId: string
  currentStatus: TripStatus
  passengerCount: number
}

export default function TripActions({ tripId, currentStatus, passengerCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function changeStatus(action: string, label: string) {
    setLoading(action)
    const res = await fetch(`/api/trips/${tripId}/${action}`, { method: 'POST' })
    const result = await res.json()
    setLoading(null)

    if (!result.success) {
      toast.error(result.error ?? 'Error al cambiar el estado')
      return
    }
    toast.success(label)
    router.refresh()
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currentStatus === 'scheduled' && (
        <button
          onClick={() => changeStatus('start-boarding', 'Abordaje abierto ✓')}
          disabled={!!loading || passengerCount === 0}
          className="btn-primary"
          title={passengerCount === 0 ? 'Agrega pasajeros antes de abrir el abordaje' : ''}
        >
          {loading === 'start-boarding'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Play className="w-4 h-4" />}
          Abrir abordaje
        </button>
      )}

      {currentStatus === 'boarding' && (
        <button
          onClick={() => changeStatus('start-trip', 'Viaje iniciado ✓')}
          disabled={!!loading}
          className="btn-primary"
        >
          {loading === 'start-trip'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Navigation className="w-4 h-4" />}
          Iniciar viaje
        </button>
      )}

      {currentStatus === 'in_transit' && (
        <button
          onClick={() => changeStatus('complete', 'Viaje completado ✓')}
          disabled={!!loading}
          className="btn-primary"
        >
          {loading === 'complete'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <CheckCircle className="w-4 h-4" />}
          Completar viaje
        </button>
      )}

      {['draft','scheduled','boarding'].includes(currentStatus) && (
        <button
          onClick={() => {
            if (!confirm('¿Cancelar este viaje? Esta acción no se puede deshacer.')) return
            changeStatus('cancel', 'Viaje cancelado')
          }}
          disabled={!!loading}
          className="btn-secondary text-red-500 hover:bg-red-50 hover:border-red-200"
        >
          {loading === 'cancel'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <X className="w-4 h-4" />}
          Cancelar
        </button>
      )}
    </div>
  )
}
