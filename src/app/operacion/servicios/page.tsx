import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, MapPin } from 'lucide-react'
import { Metadata } from 'next'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS, formatDate, formatTime, cn } from '@/lib/utils/index'
export const metadata: Metadata = { title: 'Servicios' }
export const dynamic = 'force-dynamic'
export default async function Page({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient()
  let q = supabase.from('trips').select('*, vehicle:vehicles(plate), driver:drivers(first_name,last_name)')
    .order('departure_date', { ascending: false })
  if (searchParams.status) q = q.eq('status', searchParams.status)
  const { data } = await q.limit(200)
  const trips = data ?? []
  const statuses = ['scheduled','boarding','in_transit','completed','cancelled']
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🚌</div>
          <div><h1 className="text-2xl font-bold text-green-900">Servicios</h1><p className="text-gray-400 text-sm">{trips.length} viajes registrados</p></div>
        </div>
        <Link href="/trips/new" className="btn-primary"><Plus className="w-4 h-4" />Nuevo servicio</Link>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Link href="/operacion/servicios" className={cn('text-xs px-3 py-1.5 rounded-full font-semibold border transition-all', !searchParams.status ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200')}>Todos ({trips.length})</Link>
        {statuses.map(s => (
          <Link key={s} href={`/operacion/servicios?status=${s}`}
            className={cn('text-xs px-3 py-1.5 rounded-full font-semibold border transition-all', searchParams.status === s ? TRIP_STATUS_COLORS[s] + ' border-transparent' : 'bg-white text-gray-500 border-gray-200')}>
            {TRIP_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MapPin className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay servicios</p>
            <Link href="/trips/new" className="btn-primary mt-4">Crear servicio</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b border-gray-100 bg-green-50">
                {['Folio','Ruta','Fecha','Hora','Tipo','Unidad','Operador','Estado',''].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {trips.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 group">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{t.trip_number}</td>
                    <td className="px-4 py-3 max-w-[200px]"><p className="truncate text-gray-900 font-medium">{t.origin_label} → {t.destination_label}</p></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.departure_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(t.departure_time)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{TRIP_TYPE_LABELS[t.type] ?? t.type}</td>
                    <td className="px-4 py-3">{t.vehicle ? <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{t.vehicle.plate}</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', TRIP_STATUS_COLORS[t.status])}>{TRIP_STATUS_LABELS[t.status]}</span></td>
                    <td className="px-4 py-3"><Link href={`/trips/${t.id}`} className="text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100">Ver →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
