'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Navigation, CheckCircle, Loader2, Play } from 'lucide-react'

export default function DriverTripControls({ tripId, status, boardedCount, totalCount }: { tripId:string; status:string; boardedCount:number; totalCount:number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(action: string, label: string) {
    setLoading(true)
    const res = await fetch(`/api/trips/${tripId}/action`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action }) })
    const result = await res.json()
    setLoading(false)
    if (!result.success) { toast.error(result.error ?? 'Error'); return }
    toast.success(label)
    router.refresh()
  }

  if (status === 'boarding') return (
    <div className="px-4 py-3">
      <button onClick={() => {
        if (boardedCount === 0) { toast.error('Registra al menos 1 pasajero'); return }
        if (totalCount > boardedCount && !confirm(`Faltan ${totalCount - boardedCount} pax. ¿Iniciar de todas formas?`)) return
        changeStatus('start-trip', '¡Buen viaje! 🚌')
      }} disabled={loading}
        className="w-full py-4 bg-brand-700 hover:bg-brand-600 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50">
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}Iniciar viaje
      </button>
      <p className="text-center text-xs text-gray-400 mt-2">{boardedCount} de {totalCount} pasajeros abordados</p>
    </div>
  )

  if (status === 'in_transit') return (
    <div className="px-4 py-3">
      <button onClick={() => { if (!confirm('¿Confirmar llegada y finalizar?')) return; changeStatus('complete', '¡Viaje completado! ✓') }} disabled={loading}
        className="w-full py-4 bg-green-700 hover:bg-green-800 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50">
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}Finalizar viaje
      </button>
    </div>
  )

  if (status === 'scheduled') return (
    <div className="px-4 py-3">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
        <Play className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-blue-700">Viaje programado</p>
        <p className="text-xs text-blue-500 mt-1">El despachador abre el abordaje</p>
      </div>
    </div>
  )

  return null
}
