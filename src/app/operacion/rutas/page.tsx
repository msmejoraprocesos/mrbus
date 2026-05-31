import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Metadata } from 'next'
import { Plus } from 'lucide-react'
export const metadata: Metadata = { title: 'Rutas' }
export const dynamic = 'force-dynamic'
const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('saved_routes').select('*').order('usage_count', { ascending: false })
  const routes = data ?? []
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🗺️</div>
          <div><h1 className="text-2xl font-bold text-green-900">Catálogo de Rutas</h1><p className="text-gray-400 text-sm">{routes.length} rutas guardadas</p></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <p>🗺️</p><p className="mt-2 text-sm">Las rutas se guardan automáticamente al cotizar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-green-50">
              {['Ruta','Distancia (km)','Casetas','Usos','Actualizado'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {routes.map((r: any) => {
                const tolls = r.tolls_by_vehicle as any ?? {}
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{r.origin_name} → {r.destination_name}</p>{r.name && <p className="text-xs text-gray-400">{r.name}</p>}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{r.distance_km ? `${r.distance_km} km` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tolls.bus_2e ? fmt(tolls.bus_2e) : '—'}</td>
                    <td className="px-4 py-3"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">{r.usage_count}x</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(r.updated_at).toLocaleDateString('es-MX')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
