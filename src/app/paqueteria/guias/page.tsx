'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, SHIP_STATUS, SHIP_STATUS_COLORS, cn } from '@/lib/utils/index'
import { Package, RefreshCw } from 'lucide-react'

type Order = {
  id: string
  order_number: string
  sender_name: string
  sender_phone: string | null
  recipient_name: string
  recipient_phone: string | null
  recipient_address: string | null
  weight_kg: number | null
  cargo_type: string
  quoted_price: number | null
  status: string
  created_at: string
  trip?: { trip_number: string } | null
}

export default function GuiasPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shipping_orders')
      .select('*, trip:trips(trip_number)')
      .order('created_at', { ascending: false })
    setOrders((data ?? []) as unknown as Order[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const inTransit = orders.filter(o => o.status === 'in_transit').length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const problem   = orders.filter(o => o.status === 'problem').length
  const totalRevenue = orders.filter(o => ['delivered', 'in_transit'].includes(o.status))
    .reduce((s, o) => s + (o.quoted_price ?? 0), 0)

  const filtered = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => !search || o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.sender_name.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Package size={20} className="text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Guías de Paquetería</h1>
            <p className="text-xs text-slate-400">{orders.length} envíos registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar guía, remitente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 w-52"
          />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En tránsito', val: inTransit, bg: 'bg-amber-50', tc: 'text-amber-700', f: 'in_transit' },
          { label: 'Entregados', val: delivered, bg: 'bg-green-50', tc: 'text-green-700', f: 'delivered' },
          { label: 'Con problema', val: problem, bg: 'bg-red-50', tc: 'text-red-600', f: 'problem' },
          { label: 'Ingreso total', val: fmt(totalRevenue), bg: 'bg-teal-50', tc: 'text-teal-700', f: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${statusFilter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
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
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-slate-50">
                  {['No. Guía', 'Remitente', 'Destinatario', 'Dirección', 'Peso', 'Tipo', 'Precio', 'Viaje', 'Estado', 'Fecha'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {orders.length === 0 ? 'Sin guías registradas' : 'Sin resultados para el filtro'}
                  </td></tr>
                ) : filtered.map(o => {
                  const trip = Array.isArray(o.trip) ? (o.trip as any)[0] : o.trip
                  const cargoLabel = o.cargo_type === 'valuables' ? '💎 Valores'
                    : o.cargo_type === 'guarded' ? '🔒 Resguardo'
                    : o.cargo_type === 'fragile' ? '⚠️ Frágil'
                    : '📦 Normal'
                  const cargoBg = o.cargo_type === 'valuables' ? 'bg-purple-100 text-purple-700'
                    : o.cargo_type === 'guarded' ? 'bg-amber-100 text-amber-700'
                    : o.cargo_type === 'fragile' ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{o.sender_name}</p>
                        {o.sender_phone && <p className="text-xs text-slate-400">{o.sender_phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{o.recipient_name}</p>
                        {o.recipient_phone && <p className="text-xs text-slate-400">{o.recipient_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{o.recipient_address ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold">{o.weight_kg ?? '—'} kg</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cargoBg}`}>{cargoLabel}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{fmt(o.quoted_price ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{trip?.trip_number ?? 'Dedicado'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', SHIP_STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-500')}>
                          {SHIP_STATUS[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(o.created_at)}</td>
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
