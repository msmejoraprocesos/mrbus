// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Play, Navigation, CheckCircle, Loader2 } from 'lucide-react'
import type { TripStatus } from '@/lib/types'

interface Props {
  tripId: string
  status: TripStatus
  boardedCount: number
  totalCount: number
}

export default function DriverTripControls({ tripId, status, boardedCount, totalCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(action: string, label: string) {
    setLoading(true)
    const res = await fetch(`/api/trips/${tripId}/${action}`, { method: 'POST' })
    const result = await res.json()
    setLoading(false)
    if (!result.success) { toast.error(result.error ?? 'Error'); return }
    toast.success(label)
    router.refresh()
  }

  if (status === 'boarding') {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => {
            if (boardedCount === 0) {
              toast.error('Registra al menos 1 pasajero antes de iniciar el viaje')
              return
            }
            if (totalCount > boardedCount) {
              const missing = totalCount - boardedCount
              if (!confirm(`Faltan ${missing} pasajero(s) por abordar. ¿Iniciar el viaje de todas formas?`)) return
            }
            changeStatus('start-trip', '¡Viaje iniciado! Buen viaje 🚌')
          }}
          disabled={loading}
          className="w-full py-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98]
                     text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3
                     shadow-lg transition-all disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="w-6 h-6 animate-spin" />
            : <Navigation className="w-6 h-6" />
          }
          Iniciar viaje
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          {boardedCount} de {totalCount} pasajeros abordados
        </p>
      </div>
    )
  }

  if (status === 'in_transit') {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => {
            if (!confirm('¿Confirmar llegada al destino y finalizar el viaje?')) return
            changeStatus('complete', 'Viaje completado ✓ ¡Excelente trabajo!')
          }}
          disabled={loading}
          className="w-full py-4 bg-ops-green hover:bg-green-800 active:scale-[0.98]
                     text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3
                     shadow-lg transition-all disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="w-6 h-6 animate-spin" />
            : <CheckCircle className="w-6 h-6" />
          }
          Finalizar viaje
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">Presiona al llegar al destino</p>
      </div>
    )
  }

  if (status === 'scheduled') {
    return (
      <div className="px-4 py-3">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <Play className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">Viaje programado</p>
          <p className="text-xs text-blue-500 mt-1">El abordaje lo abre el despachador</p>
        </div>
      </div>
    )
  }

  return null
}
