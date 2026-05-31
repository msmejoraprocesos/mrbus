import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { fmt, fmtDate, MAINT_STATUS, MAINT_STATUS_COLORS, MAINT_TYPE, cn } from '@/lib/utils/index'
export const metadata: Metadata = { title: 'Mantenimiento' }
export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('maintenance_orders')
    .select('*, vehicle:vehicles(plate,economic_number)')
    .order('scheduled_date', { ascending: false })
  const orders = data ?? []
  const pending = orders.filter((o:any) => o.status === 'scheduled').length
  const inProgress = orders.filter((o:any) => o.status === 'in_progress').length
  const totalCost = orders.filter((o:any) => o.status === 'completed').reduce((s:number,o:any) => s + (o.actual_cost ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">🔧</div>
          <div><h1 className="text-2xl font-bold text-purple-900">Mantenimiento</h1>
          <p className="text-gray-400 text-sm">{pending} programados · {inProgress} en proceso</p></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Programados', val: pending, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'En proceso', val: inProgress, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Costo completados', val: fmt(totalCost), color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={"rounded-xl border border-gray-100 shadow-sm p-4 " + s.bg}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={"text-2xl font-bold mt-1 " + s.color}>{s.val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-purple-50">
              {['Orden','Unidad','Tipo','Descripción','Fecha','Costo est.','Costo real','Estado','Bloquea',''].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Sin órdenes de mantenimiento</td></tr>
              ) : orders.map((o:any) => (
                <tr key={o.id} className="hover:bg-gray-50/50 group">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{o.order_number}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">{o.vehicle?.plate ?? '—'}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{MAINT_TYPE[o.maint_type] ?? o.maint_type}</td>
                  <td className="px-4 py-3 max-w-[200px]"><p className="truncate text-gray-700">{o.description}</p></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.scheduled_date)}</td>
                  <td className="px-4 py-3 text-gray-500">{o.estimated_cost ? fmt(o.estimated_cost) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{o.actual_cost ? fmt(o.actual_cost) : '—'}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', MAINT_STATUS_COLORS[o.status])}>{MAINT_STATUS[o.status]}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', o.blocks_vehicle ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}>{o.blocks_vehicle ? '🔴 Sí' : '🟢 No'}</span></td>
                  <td className="px-4 py-3"><Link href={"/flota/mantenimiento/" + o.id} className="text-purple-500 text-xs opacity-0 group-hover:opacity-100">Ver →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
