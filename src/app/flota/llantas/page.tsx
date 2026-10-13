'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
import { Settings, RefreshCw } from 'lucide-react'

type Tire = {
  id: string
  position: string | null
  brand: string | null
  model: string | null
  size: string | null
  current_km: number | null
  estimated_life_km: number | null
  install_date: string | null
  status: string
  vehicle?: { plate: string; economic_number: string } | null
}

export default function LlantasPage() {
  const supabase = createClient()
  const [tires, setTires] = useState<Tire[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tire_inventory')
      .select('*, vehicle:vehicles(plate,economic_number)')
      .order('current_km', { ascending: false })
    setTires((data ?? []) as unknown as Tire[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const worn    = tires.filter(t => t.status === 'worn').length
  const active  = tires.filter(t => t.status === 'active')
  const avgLife = active.length > 0
    ? active.reduce((s, t) => s + ((t.current_km ?? 0) / (t.estimated_life_km ?? 80000) * 100), 0) / active.length
    : 0

  const filtered = statusFilter === 'all' ? tires : tires.filter(t => t.status === statusFilter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Settings size={20} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Control de Llantas</h1>
            <p className="text-xs text-slate-400">{tires.length} llantas registradas · {worn} desgastadas</p>
          </div>
        </div>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En servicio', val: active.length, bg: 'bg-green-50', tc: 'text-green-700', filter: 'active' },
          { label: 'Desgastadas', val: worn, bg: 'bg-red-50', tc: 'text-red-700', filter: 'worn' },
          { label: 'En repuesto', val: tires.filter(t => t.status === 'spare').length, bg: 'bg-blue-50', tc: 'text-blue-700', filter: 'spare' },
          { label: 'Vida promedio', val: fmtN(avgLife, 1) + '%', bg: 'bg-amber-50', tc: 'text-amber-700', filter: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.filter)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${statusFilter === s.filter ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
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
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-purple-50">
                  {['Unidad', 'Posición', 'Marca/Modelo', 'KM actual', 'Vida útil', '% Uso', 'Instalada', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Sin llantas registradas</td></tr>
                ) : filtered.map(t => {
                  const v = Array.isArray(t.vehicle) ? (t.vehicle as any)[0] : t.vehicle
                  const pct = Math.round((t.current_km ?? 0) / (t.estimated_life_km ?? 80000) * 100)
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                          {v?.plate ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700">{t.position ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {[t.brand, t.model, t.size].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold">{(t.current_km ?? 0).toLocaleString()} km</td>
                      <td className="px-4 py-3 text-slate-400">{(t.estimated_life_km ?? 80000).toLocaleString()} km</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(t.install_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          t.status === 'active' ? 'bg-green-100 text-green-700' :
                          t.status === 'worn' ? 'bg-red-100 text-red-700' :
                          t.status === 'spare' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {t.status === 'active' ? 'En servicio' : t.status === 'worn' ? 'Desgastada' : t.status === 'spare' ? 'Repuesto' : 'Reemplazada'}
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
