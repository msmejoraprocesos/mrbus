'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate } from '@/lib/utils/index'
import { Calculator, Plus, RefreshCw, MapPin, Bus, Users, Check } from 'lucide-react'

type Quote = {
  id: string; folio: string; origin: string; destination: string
  departure_date: string | null; status: string
  vehicle_class: string | null; seats_count: number | null
  total: number | null; price_per_seat: number | null
  created_at: string
}

const STATUS_LABEL: Record<string,string> = {
  draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada'
}
const STATUS_COLOR: Record<string,string> = {
  draft:    'bg-slate-100 text-slate-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function CotizadorListaPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [quotes,   setQuotes]   = useState<Quote[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('id,folio,origin,destination,departure_date,status,vehicle_class,seats_count,total,price_per_seat,created_at')
      .order('created_at', { ascending: false })
    setQuotes((data ?? []) as Quote[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)
  const totalRevenue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calculator size={20} className="text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cotizaciones</h1>
            <p className="text-xs text-slate-400">{quotes.length} cotizaciones generadas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => router.push('/turismo/cotizador')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1565C0] text-white rounded-lg text-sm font-semibold hover:bg-[#0F4C91] transition-colors">
            <Plus size={15} /> Nueva cotización
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: 'Total',     v: quotes.length,                                  bg: 'bg-slate-50',  tc: 'text-slate-700', f: 'all'      },
          { l: 'Enviadas',  v: quotes.filter(q => q.status === 'sent').length, bg: 'bg-blue-50',   tc: 'text-blue-700',  f: 'sent'     },
          { l: 'Aceptadas', v: quotes.filter(q => q.status === 'accepted').length, bg: 'bg-green-50', tc: 'text-green-700', f: 'accepted' },
          { l: 'Facturado', v: fmt(totalRevenue),                              bg: 'bg-teal-50',   tc: 'text-teal-700',  f: 'all'      },
        ].map(s => (
          <button key={s.l} onClick={() => setFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg}
              ${filter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
            <p className="text-xs text-slate-500 font-medium">{s.l}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tc}`}>{s.v}</p>
          </button>
        ))}
      </div>

      {/* list */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando cotizaciones...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-slate-400">
          <Calculator size={40} className="mb-3 opacity-30" />
          <p className="font-medium">
            {quotes.length === 0 ? 'Aún no hay cotizaciones' : 'Sin cotizaciones para el filtro'}
          </p>
          {quotes.length === 0 && (
            <button onClick={() => router.push('/turismo/cotizador')}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#1565C0] text-white rounded-lg text-sm font-semibold">
              <Plus size={14} /> Crear primera cotización
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(q => (
            <div key={q.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{q.folio}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {q.departure_date ? fmtDate(q.departure_date) : 'Fecha por definir'}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[q.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABEL[q.status] ?? q.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-700 font-medium truncate">
                  {q.origin || '—'} → {q.destination || '—'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] text-slate-400">Clase</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{q.vehicle_class ?? '—'}</p>
                </div>
                <div className="text-center bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] text-slate-400">Asientos</p>
                  <p className="text-sm font-bold text-[#1565C0]">{q.seats_count ?? '—'}</p>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-2">
                  <p className="text-[10px] text-slate-400">x pax</p>
                  <p className="text-xs font-bold text-green-700">{q.price_per_seat ? fmt(q.price_per_seat) : '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">Total</span>
                <span className="font-extrabold text-[#1565C0]">{q.total ? fmt(q.total) : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
