import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
export const metadata: Metadata = { title: 'Llantas' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('tire_inventory')
    .select('*, vehicle:vehicles(plate,economic_number)')
    .order('current_km', { ascending: false })
  const tires = data ?? []
  const worn = tires.filter((t:any) => t.status === 'worn').length
  const active = tires.filter((t:any) => t.status === 'active')
  const avgLife = active.length > 0 ? active.reduce((s:number,t:any) => s + ((t.current_km ?? 0) / (t.estimated_life_km ?? 80000) * 100), 0) / active.length : 0
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">⚙️</div>
        <div><h1 className="text-2xl font-bold text-purple-900">Control de Llantas</h1>
        <p className="text-gray-400 text-sm">{tires.length} llantas registradas · {worn} desgastadas</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En servicio', val: active.length, bg: 'bg-green-50', tc: 'text-green-700' },
          { label: 'Desgastadas', val: worn, bg: 'bg-red-50', tc: 'text-red-700' },
          { label: 'En repuesto', val: tires.filter((t:any) => t.status === 'spare').length, bg: 'bg-blue-50', tc: 'text-blue-700' },
          { label: 'Vida promedio usada', val: fmtN(avgLife, 1) + '%', bg: 'bg-amber-50', tc: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className={"rounded-xl border border-gray-100 shadow-sm p-4 " + s.bg}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.tc}>{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-purple-50">
              {['Unidad','Posición','Marca/Modelo','KM actual','Vida útil','% Uso','Instalada','Estado'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {tires.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin llantas registradas</td></tr>
              ) : tires.map((t:any) => {
                const pct = Math.round((t.current_km ?? 0) / (t.estimated_life_km ?? 80000) * 100)
                return (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">{t.vehicle?.plate ?? '—'}</span></td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700">{t.position}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{[t.brand, t.model, t.size].filter(Boolean).join(' · ')}</td>
                    <td className="px-4 py-3 font-semibold">{(t.current_km ?? 0).toLocaleString()} km</td>
                    <td className="px-4 py-3 text-gray-500">{(t.estimated_life_km ?? 80000).toLocaleString()} km</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className={"h-1.5 rounded-full " + (pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: pct + "%" }} /></div>
                        <span className="text-xs font-semibold">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(t.install_date)}</td>
                    <td className="px-4 py-3"><span className={"text-xs px-2 py-0.5 rounded-full font-semibold " + (t.status === 'active' ? 'bg-green-100 text-green-700' : t.status === 'worn' ? 'bg-red-100 text-red-700' : t.status === 'spare' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>{t.status === 'active' ? 'En servicio' : t.status === 'worn' ? 'Desgastada' : t.status === 'spare' ? 'Repuesto' : 'Reemplazada'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
