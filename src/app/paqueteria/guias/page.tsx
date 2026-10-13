'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, SHIP_STATUS, SHIP_STATUS_COLORS, cn } from '@/lib/utils/index'
import { Package, RefreshCw, List, LayoutGrid, X } from 'lucide-react'

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
  declared_value: number | null
  quoted_price: number | null
  status: string
  created_at: string
  trip?: { trip_number: string } | null
}

const KANBAN_STATUSES = ['pending', 'in_transit', 'delivered', 'problem']

function cargoBadge(cargo_type: string) {
  if (cargo_type === 'valuables') return { label: '💎 Valores', cls: 'bg-purple-100 text-purple-700' }
  if (cargo_type === 'guarded')  return { label: '🔒 Resguardo', cls: 'bg-amber-100 text-amber-700' }
  if (cargo_type === 'fragile')  return { label: '⚠️ Frágil', cls: 'bg-blue-100 text-blue-700' }
  return { label: '📦 Normal', cls: 'bg-slate-100 text-slate-600' }
}

export default function GuiasPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    try {
      setBannerDismissed(!!localStorage.getItem('guias_kanban_banner_dismissed'))
    } catch { /* ignore */ }
  }, [])

  function dismissBanner() {
    setBannerDismissed(true)
    try { localStorage.setItem('guias_kanban_banner_dismissed', '1') } catch { /* ignore */ }
  }

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
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('lista')}
              className={cn('px-2.5 h-8 flex items-center transition-colors', view === 'lista' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}
              title="Vista lista">
              <List size={15} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn('px-2.5 h-8 flex items-center transition-colors', view === 'kanban' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}
              title="Vista kanban">
              <LayoutGrid size={15} />
            </button>
          </div>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En tránsito', val: inTransit, sub: 'en camino', bg: 'bg-amber-50', tc: 'text-amber-700', f: 'in_transit' },
          { label: 'Entregados',  val: delivered, sub: 'completados', bg: 'bg-green-50', tc: 'text-green-700', f: 'delivered' },
          { label: 'Con problema',val: problem,   sub: 'requieren acción', bg: 'bg-red-50', tc: 'text-red-600', f: 'problem' },
          { label: 'Ingreso total', val: fmt(totalRevenue), sub: 'en tránsito + entregados', bg: 'bg-teal-50', tc: 'text-teal-700', f: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.f)}
            className={cn('text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md', s.bg, statusFilter === s.f ? 'ring-2 ring-slate-400 border-transparent' : 'border-slate-100')}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1', s.tc)}>{s.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* Kanban guide banner */}
      {view === 'kanban' && !bannerDismissed && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">
          <span>⚠️ Las guías en &quot;Problema&quot; requieren acción inmediata. Haz clic en una tarjeta para ver el detalle.</span>
          <button onClick={dismissBanner} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400">Cargando...</div>
      ) : view === 'kanban' ? (

        /* ── KANBAN VIEW ── */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_STATUSES.map(status => {
            const colOrders = orders.filter(o => o.status === status)
            const isProblem = status === 'problem'
            const statusColorCls = SHIP_STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
            const colBg = isProblem ? 'bg-red-50/50' : 'bg-slate-50'
            const borderCls = isProblem ? 'border-red-100' : 'border-slate-100'
            return (
              <div key={status} className="min-w-[220px] flex flex-col flex-shrink-0">
                {/* Column header */}
                <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0', colBg, borderCls)}>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusColorCls)}>
                    {SHIP_STATUS[status] ?? status}
                  </span>
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', statusColorCls)}>{colOrders.length}</span>
                </div>
                {/* Column body */}
                <div className={cn('flex flex-col gap-2 p-2 border rounded-b-xl overflow-y-auto', colBg, borderCls)}
                  style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  {colOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-16 text-slate-300 text-xs">Sin guías</div>
                  ) : colOrders.map(o => {
                    const trip = Array.isArray(o.trip) ? (o.trip as any)[0] : o.trip
                    const cargo = cargoBadge(o.cargo_type)
                    return (
                      <div key={o.id}
                        className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer">
                        {/* Order number */}
                        <span className="font-mono text-xs text-slate-500 font-bold">{o.order_number}</span>
                        {/* Sender → recipient */}
                        <p className="text-sm font-bold text-slate-800 leading-tight">
                          {o.sender_name} → {o.recipient_name}
                        </p>
                        {/* Cargo type badge */}
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium self-start', cargo.cls)}>
                          {cargo.label}
                        </span>
                        {/* Declared value if present */}
                        {o.declared_value != null && (
                          <span className="text-xs text-slate-500 font-medium">{fmt(o.declared_value)} declarado</span>
                        )}
                        {/* Trip folio if assigned */}
                        {trip?.trip_number && (
                          <span className="font-mono text-xs text-slate-400">Viaje: {trip.trip_number}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
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
                  const cargo = cargoBadge(o.cargo_type)
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
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', cargo.cls)}>{cargo.label}</span>
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
        </div>
      )}
    </div>
  )
}
