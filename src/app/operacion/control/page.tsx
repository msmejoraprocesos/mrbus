import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS, formatTime, cn } from '@/lib/utils/index'
export const metadata: Metadata = { title: 'Centro de Control' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('trips')
    .select('*, vehicle:vehicles(plate), driver:drivers(first_name,last_name), pax:trip_passengers(boarding_status)')
    .in('status', ['boarding','in_transit']).order('departure_time')
  const active = data ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📡</div>
        <div><h1 className="text-2xl font-bold text-green-900">Centro de Control</h1><p className="text-gray-400 text-sm">{active.length} servicios activos ahora</p></div>
      </div>
      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center py-20 text-gray-400">
          <span className="text-5xl mb-3">📡</span>
          <p>No hay servicios activos en este momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((t: any) => {
            const pax = t.pax ?? []
            const boarded = pax.filter((p: any) => p.boarding_status === 'boarded').length
            const pct = pax.length > 0 ? Math.round(boarded / pax.length * 100) : 0
            return (
              <Link key={t.id} href={`/trips/${t.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-gray-500">{t.trip_number}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold boarding-active', TRIP_STATUS_COLORS[t.status])}>{TRIP_STATUS_LABELS[t.status]}</span>
                </div>
                <p className="font-bold text-gray-900 mb-1">{t.origin_label}</p>
                <p className="text-sm text-gray-400 mb-3">→ {t.destination_label}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>🚌 {t.vehicle?.plate ?? '—'}</span>
                  <span>👤 {t.driver ? `${t.driver.first_name} ${t.driver.last_name[0]}.` : '—'}</span>
                  <span>⏰ {formatTime(t.departure_time)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Abordaje</span><span className="font-semibold">{boarded}/{pax.length} · {pct}%</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: pct + "%" }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
