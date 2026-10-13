'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { auditLog } from '@/lib/audit'
import { Truck, Plus, X, RefreshCw, CheckCircle, AlertTriangle, Package } from 'lucide-react'

type ShippingEvent = {
  id: string
  order_id: string
  event_type: string
  performed_at: string
  notes: string | null
  photo_url: string | null
  signature_url: string | null
  order?: { order_number: string; sender_name: string; recipient_name: string }
}

type ShippingOrder = {
  id: string
  order_number: string
  sender_name: string
  recipient_name: string
  recipient_address: string | null
  status: string
}

const EVENT_COLORS: Record<string, string> = {
  collected:  'bg-blue-100 text-blue-700',
  in_transit: 'bg-amber-100 text-amber-700',
  delivered:  'bg-green-100 text-green-700',
  problem:    'bg-red-100 text-red-700',
  returned:   'bg-purple-100 text-purple-700',
  note:       'bg-slate-100 text-slate-600',
}
const EVENT_LABELS: Record<string, string> = {
  collected:  '📦 Recolectado',
  in_transit: '🚚 En tránsito',
  delivered:  '✅ Entregado',
  problem:    '⚠️ Problema',
  returned:   '↩️ Devuelto',
  note:       '📝 Nota',
}
const ORDER_STATUS_FOR_EVENT: Record<string, string> = {
  collected: 'collected', in_transit: 'in_transit', delivered: 'delivered', returned: 'returned',
}

export default function EntregasPage() {
  const supabase = createClient()
  const [events, setEvents]   = useState<ShippingEvent[]>([])
  const [orders, setOrders]   = useState<ShippingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'eventos' | 'nuevo'>('eventos')
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    order_id: '',
    event_type: 'delivered',
    notes: '',
    performed_at: new Date().toISOString().slice(0, 16),
  })

  const load = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [eventsRes, ordersRes] = await Promise.all([
      supabase.from('shipping_events')
        .select('*, order:shipping_orders(order_number,sender_name,recipient_name)')
        .order('performed_at', { ascending: false })
        .limit(150),
      supabase.from('shipping_orders')
        .select('id,order_number,sender_name,recipient_name,recipient_address,status')
        .in('status', ['collected','in_transit','registered'])
        .order('created_at', { ascending: false }),
    ])
    setEvents(eventsRes.data ?? [])
    setOrders(ordersRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function registrar() {
    if (!form.order_id || !form.event_type) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''

    const { error: evError } = await supabase.from('shipping_events').insert({
      order_id: form.order_id,
      event_type: form.event_type,
      notes: form.notes || null,
      performed_at: new Date(form.performed_at).toISOString(),
      performed_by: uid,
    })
    if (evError) { alert('Error: ' + evError.message); setSaving(false); return }

    // Update shipping order status if relevant
    const newStatus = ORDER_STATUS_FOR_EVENT[form.event_type]
    if (newStatus) {
      await supabase.from('shipping_orders').update({ status: newStatus }).eq('id', form.order_id)
    }

    const order = orders.find(o => o.id === form.order_id)
    await auditLog({ action: 'INSERT', module: 'entregas', table_name: 'shipping_events', record_folio: order?.order_number, user_id: uid })

    setForm({ order_id: '', event_type: 'delivered', notes: '', performed_at: new Date().toISOString().slice(0,16) })
    setSaving(false)
    setTab('eventos')
    load()
  }

  const today = new Date().toISOString().split('T')[0]
  const todayEv   = events.filter(e => e.performed_at?.startsWith(today))
  const deliveries = todayEv.filter(e => e.event_type === 'delivered').length
  const collected  = todayEv.filter(e => e.event_type === 'collected').length
  const problems   = todayEv.filter(e => e.event_type === 'problem').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Truck size={20} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Recolección y Entrega</h1>
            <p className="text-xs text-slate-400">Trazabilidad de paquetes en tiempo real</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setTab('nuevo')}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Registrar evento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Eventos hoy', val: todayEv.length, icon: Package, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Entregas hoy', val: deliveries, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Recolecciones hoy', val: collected, icon: Truck, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Problemas hoy', val: problems, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <k.icon size={14} className={k.color} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {([['eventos','Eventos'], ['nuevo','Registrar evento']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Eventos table */}
      {tab === 'eventos' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-slate-50">
                    {['Guía','Remitente → Destinatario','Evento','Fecha/Hora','Notas'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {events.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Sin eventos — <button onClick={() => setTab('nuevo')} className="text-slate-700 underline">registrar primero</button>
                    </td></tr>
                  ) : events.map(e => {
                    const order = Array.isArray(e.order) ? (e.order as any)[0] : e.order
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">
                          {order?.order_number ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px]">
                          {order ? `${order.sender_name} → ${order.recipient_name}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${EVENT_COLORS[e.event_type] ?? 'bg-slate-100 text-slate-500'}`}>
                            {EVENT_LABELS[e.event_type] ?? e.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {e.performed_at ? new Date(e.performed_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[160px] truncate">
                          {e.notes ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Registro de evento */}
      {tab === 'nuevo' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Truck size={16} className="text-slate-600" /> Registrar evento de entrega
            </h3>
            <button onClick={() => setTab('eventos')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Guía / Paquete *</label>
              <select value={form.order_id}
                onChange={e => setForm(f => ({...f, order_id: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">Seleccionar paquete...</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.sender_name} → {o.recipient_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de evento *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(EVENT_LABELS).map(([val, label]) => (
                  <button key={val}
                    onClick={() => setForm(f => ({...f, event_type: val}))}
                    className={`px-2 py-2 text-xs rounded-lg border font-medium transition-colors ${form.event_type === val ? EVENT_COLORS[val] + ' border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha y hora</label>
              <input type="datetime-local" value={form.performed_at}
                onChange={e => setForm(f => ({...f, performed_at: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notas</label>
              <textarea rows={3} placeholder={form.event_type === 'problem' ? 'Describe el problema...' : 'Observaciones opcionales...'}
                value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setTab('eventos')}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={registrar} disabled={saving || !form.order_id}
                className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
