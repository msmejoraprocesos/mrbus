import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
export const metadata: Metadata = { title: 'Combustible' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const [{ data: loads }, { data: prices }] = await Promise.all([
    supabase.from('fuel_loads').select('*, vehicle:vehicles(plate), driver:drivers(first_name,last_name)').order('load_date', { ascending: false }).limit(100),
    supabase.from('fuel_prices').select('*').eq('is_active', true).order('effective_date', { ascending: false }).limit(5),
  ])
  const fuelLoads = loads ?? []
  const totalLiters = fuelLoads.reduce((s:number,l:any) => s + (l.liters ?? 0), 0)
  const totalCost = fuelLoads.reduce((s:number,l:any) => s + (l.total_cost ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">⛽</div>
        <h1 className="text-2xl font-bold text-purple-900">Control de Combustible</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total litros (mes)', val: fmtN(totalLiters, 0) + ' L', color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Gasto total', val: fmt(totalCost), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Precio diesel actual', val: prices?.[0] ? fmt(prices[0].price_per_liter) + '/L' : '—', color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Cargas registradas', val: String(fuelLoads.length), color: 'text-gray-700', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={"rounded-xl border border-gray-100 shadow-sm p-4 " + s.bg}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.color}>{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-purple-50">
          <h2 className="font-semibold text-purple-900">Historial de cargas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-purple-50">
              {['Fecha','Unidad','Operador','Litros','Precio/L','Total','Estación','Odómetro'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {fuelLoads.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin cargas registradas</td></tr>
              ) : fuelLoads.map((l:any) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(l.load_date)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-700">{l.vehicle?.plate ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.driver ? l.driver.first_name + ' ' + l.driver.last_name : '—'}</td>
                  <td className="px-4 py-3 font-semibold">{fmtN(l.liters, 1)} L</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(l.price_per_liter)}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmt(l.total_cost)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{l.station ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{l.odometer_km ? l.odometer_km.toLocaleString() + ' km' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
