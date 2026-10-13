'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Map, RefreshCw } from 'lucide-react'
import { fmt, fmtDate } from '@/lib/utils/index'

type SavedRoute = {
  id: string
  origin_name: string
  destination_name: string
  name: string | null
  distance_km: number | null
  tolls_by_vehicle: Record<string, number> | null
  usage_count: number
  updated_at: string
}

export default function RutasPage() {
  const supabase = createClient()
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('saved_routes')
      .select('*').order('usage_count', { ascending: false })
    setRoutes((data ?? []) as unknown as SavedRoute[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = routes.filter(r =>
    !search || r.origin_name.toLowerCase().includes(search.toLowerCase()) ||
    r.destination_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Map size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Catálogo de Rutas</h1>
            <p className="text-xs text-slate-400">{routes.length} rutas guardadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar origen o destino…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 w-52"
          />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Map size={40} className="mb-3 opacity-30" />
            <p>{routes.length === 0 ? 'Las rutas se guardan automáticamente al cotizar' : 'Sin resultados'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-green-50">
                  {['Ruta', 'Distancia', 'Casetas (bus 2e)', 'Usos', 'Actualizado'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(r => {
                  const tolls = r.tolls_by_vehicle ?? {}
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.origin_name} → {r.destination_name}</p>
                        {r.name && <p className="text-xs text-slate-400">{r.name}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {r.distance_km ? `${r.distance_km} km` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {tolls.bus_2e ? fmt(tolls.bus_2e) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">{r.usage_count}x</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.updated_at)}</td>
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
