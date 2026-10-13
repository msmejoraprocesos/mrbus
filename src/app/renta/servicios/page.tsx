'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, cn } from '@/lib/utils/index'
import { ClipboardList, RefreshCw } from 'lucide-react'

type Rental = {
  id: string
  rental_type: string
  status: string
  contracted_hours: number | null
  contracted_km: number | null
  actual_start: string | null
  actual_end: string | null
  base_price: number | null
  extras_price: number | null
  total_price: number | null
  trip?: { trip_number: string; origin_label: string; destination_label: string } | null
  contract?: { contract_number: string; lead?: { first_name: string; last_name: string; company?: string } | null } | null
}

const STATUS: Record<string, string> = {
  scheduled: 'Programado', active: 'Activo', completed: 'Completado', billed: 'Facturado',
}
const STATUS_C: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  billed: 'bg-slate-100 text-slate-500',
}

export default function RentaServiciosPage() {
  const supabase = createClient()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('rental_services')
      .select('*, trip:trips(trip_number,origin_label,destination_label), contract:contracts(contract_number,lead:leads(first_name,last_name,company))')
      .order('created_at', { ascending: false })
    setRentals((data ?? []) as unknown as Rental[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter === 'all' ? rentals : rentals.filter(r => r.status === statusFilter)
  const active = rentals.filter(r => r.status === 'active').length
  const totalRevenue = rentals.filter(r => ['completed', 'billed'].includes(r.status)).reduce((s, r) => s + (r.total_price ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ClipboardList size={20} className="text-orange-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Servicios Eventuales de Renta</h1>
            <p className="text-xs text-slate-400">{rentals.length} servicios · {active} activos</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activos ahora', val: active, bg: 'bg-green-50', tc: 'text-green-700', f: 'active' },
          { label: 'Programados', val: rentals.filter(r => r.status === 'scheduled').length, bg: 'bg-blue-50', tc: 'text-blue-700', f: 'scheduled' },
          { label: 'Completados', val: rentals.filter(r => r.status === 'completed').length, bg: 'bg-slate-50', tc: 'text-slate-700', f: 'completed' },
          { label: 'Ingresos completados', val: fmt(totalRevenue), bg: 'bg-teal-50', tc: 'text-teal-700', f: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${statusFilter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
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
                  {['Cliente', 'Viaje', 'Tipo', 'Contratado', 'Inicio real', 'Fin real', 'Base', 'Extras', 'Total', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {rentals.length === 0 ? 'Sin servicios de renta registrados' : 'Sin resultados para el filtro seleccionado'}
                  </td></tr>
                ) : filtered.map(r => {
                  const trip     = Array.isArray(r.trip) ? (r.trip as any)[0] : r.trip
                  const contract = Array.isArray(r.contract) ? (r.contract as any)[0] : r.contract
                  const lead     = contract?.lead ? (Array.isArray(contract.lead) ? (contract.lead as any)[0] : contract.lead) : null
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{lead ? `${lead.first_name} ${lead.last_name}` : '—'}</p>
                        {lead?.company && <p className="text-xs text-slate-400">{lead.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">
                        {trip ? `${trip.origin_label} → ${trip.destination_label}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                          {r.rental_type === 'hourly' ? 'Por horas' : 'Por días'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.rental_type === 'hourly' ? `${r.contracted_hours ?? '—'}h` : `${r.contracted_km ?? '—'}km`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.actual_start ? new Date(r.actual_start).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.actual_end ? new Date(r.actual_end).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{fmt(r.base_price)}</td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">
                        {(r.extras_price ?? 0) > 0 ? `+${fmt(r.extras_price)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{fmt(r.total_price)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', STATUS_C[r.status] ?? 'bg-slate-100 text-slate-500')}>
                          {STATUS[r.status] ?? r.status}
                        </span>
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
