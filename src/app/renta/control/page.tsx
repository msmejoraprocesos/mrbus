'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtN } from '@/lib/utils/index'
import { Timer, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

type RentalService = {
  id: string
  rental_type: string
  status: string
  contracted_hours: number | null
  contracted_km: number | null
  actual_hours: number | null
  actual_km: number | null
  extras_price: number | null
  trip?: { trip_number: string; origin_label: string; destination_label: string } | null
  contract?: { contract_number: string } | null
}

export default function RentaControlPage() {
  const supabase = createClient()
  const [rentals, setRentals] = useState<RentalService[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('rental_services')
      .select('*, trip:trips(trip_number,origin_label,destination_label), contract:contracts(contract_number)')
      .in('status', ['completed', 'billed'])
      .order('actual_end', { ascending: false })
    setRentals((data ?? []) as unknown as RentalService[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const withExtras = rentals.filter(r => (r.extras_price ?? 0) > 0)
  const totalExtras = rentals.reduce((s, r) => s + (r.extras_price ?? 0), 0)

  const filtered = filter === 'extras' ? withExtras : filter === 'ok' ? rentals.filter(r => (r.extras_price ?? 0) === 0) : rentals

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Timer size={20} className="text-orange-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Control de Horas / Km</h1>
            <p className="text-xs text-slate-400">Diferencia real vs contratado en servicios completados</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Con excedentes', val: withExtras.length, bg: 'bg-amber-50', tc: 'text-amber-700', f: 'extras', icon: AlertTriangle },
          { label: 'Ingresos extras', val: fmt(totalExtras), bg: 'bg-green-50', tc: 'text-green-700', f: 'all', icon: CheckCircle },
          { label: 'Servicios OK', val: rentals.length - withExtras.length, bg: 'bg-slate-50', tc: 'text-slate-700', f: 'ok', icon: CheckCircle },
        ].map(s => (
          <button key={s.label} onClick={() => setFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${filter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tc}`}>{s.val}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-orange-50">
                  {['Contrato', 'Ruta', 'Tipo', 'Contratado', 'Real', 'Diferencia', 'Extras fact.', 'Alerta'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Sin servicios completados</td></tr>
                ) : filtered.map(r => {
                  const trip     = Array.isArray(r.trip) ? (r.trip as any)[0] : r.trip
                  const contract = Array.isArray(r.contract) ? (r.contract as any)[0] : r.contract
                  const isHourly = r.rental_type === 'hourly'
                  const contracted = isHourly ? r.contracted_hours : r.contracted_km
                  const actual     = isHourly ? r.actual_hours : r.actual_km
                  const diff = (actual ?? 0) - (contracted ?? 0)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{contract?.contract_number ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">
                        {trip ? `${trip.origin_label} → ${trip.destination_label}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          {isHourly ? 'Horas' : 'Km'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {fmtN(contracted ?? 0, 1)}{isHourly ? 'h' : 'km'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {fmtN(actual ?? 0, 1)}{isHourly ? 'h' : 'km'}
                      </td>
                      <td className={`px-4 py-3 font-bold ${diff > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {diff > 0 ? '+' : ''}{fmtN(diff, 1)}{isHourly ? 'h' : 'km'}
                      </td>
                      <td className={`px-4 py-3 font-bold ${(r.extras_price ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {(r.extras_price ?? 0) > 0 ? fmt(r.extras_price) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {diff > 0
                          ? <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">⚠️ Excedió</span>
                          : <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✅ OK</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
