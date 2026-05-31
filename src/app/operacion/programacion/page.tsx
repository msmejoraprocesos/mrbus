import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { formatDate, formatTime, TRIP_STATUS_COLORS, TRIP_STATUS_LABELS, cn } from '@/lib/utils/index'
export const metadata: Metadata = { title: 'Programación' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d.toISOString().split('T')[0]
  })
  const { data } = await supabase.from('trips').select('*, vehicle:vehicles(plate), driver:drivers(first_name,last_name)')
    .gte('departure_date', days[0]).lte('departure_date', days[6]).neq('status','cancelled').order('departure_date').order('departure_time')
  const trips = data ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📅</div>
        <h1 className="text-2xl font-bold text-green-900">Programación — próximos 7 días</h1>
      </div>
      <div className="space-y-4">
        {days.map(day => {
          const dayTrips = trips.filter((t: any) => t.departure_date === day)
          const d = new Date(day + 'T12:00:00')
          const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <div key={day} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-b border-green-100">
                <p className="font-semibold text-green-900 capitalize">{label}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{dayTrips.length} servicios</span>
              </div>
              {dayTrips.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-300 text-center">Sin servicios programados</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {dayTrips.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 group">
                      <div className="w-16 text-center"><p className="font-bold text-gray-900">{formatTime(t.departure_time)}</p></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{t.origin_label} → {t.destination_label}</p>
                        <p className="text-xs text-gray-400">{t.vehicle?.plate ?? 'Sin unidad'} · {t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Sin operador'}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', TRIP_STATUS_COLORS[t.status])}>{TRIP_STATUS_LABELS[t.status]}</span>
                      <Link href={`/trips/${t.id}`} className="text-blue-500 text-xs opacity-0 group-hover:opacity-100">Ver →</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
