'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { FileText, Plus, X, RefreshCw, CheckCircle, AlertTriangle, Download } from 'lucide-react'

type ShippingOrder = {
  id: string
  order_number: string
  sender_name: string
  sender_rfc: string | null
  recipient_name: string
  recipient_rfc: string | null
  sender_address: string | null
  recipient_address: string | null
  weight_kg: number | null
  cargo_type: string | null
  declared_value: number | null
  status: string
  carta_porte_uuid: string | null
  carta_porte_folio: string | null
  carta_porte_date: string | null
  trip_id: string | null
  trip?: { trip_number: string }
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  collected:  'bg-amber-100 text-amber-700',
  in_transit: 'bg-green-100 text-green-700',
  delivered:  'bg-slate-100 text-slate-500',
  returned:   'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  registered: 'Registrado', collected: 'Recolectado', in_transit: 'En tránsito', delivered: 'Entregado', returned: 'Devuelto',
}

const CARGO_TYPES = ['General', 'Perecedero', 'Frágil', 'Peligroso', 'Documentos', 'Electrónico', 'Químico', 'Otro']

// Generate a plausible UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16).toUpperCase()
  })
}

export default function CartaPortePage() {
  const supabase = createClient()
  const [orders, setOrders]       = useState<ShippingOrder[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'lista' | 'nuevo' | 'pendientes'>('lista')
  const [saving, setSaving]       = useState(false)
  const [filterHasCP, setFilterHasCP] = useState<'all' | 'with' | 'without'>('all')

  const [form, setForm] = useState({
    order_id: '',
    uuid: '',
    folio: '',
    date: new Date().toISOString().slice(0, 10),
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shipping_orders')
      .select('*, trip:trips(trip_number)')
      .order('created_at', { ascending: false })
      .limit(300)
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function autoFill() {
    setForm(f => ({ ...f, uuid: generateUUID(), folio: 'CP-' + Date.now().toString().slice(-6) }))
  }

  async function guardar() {
    if (!form.order_id || !form.uuid) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''

    const { error } = await supabase.from('shipping_orders').update({
      carta_porte_uuid: form.uuid,
      carta_porte_folio: form.folio || null,
      carta_porte_date: form.date || null,
    }).eq('id', form.order_id)

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const order = orders.find(o => o.id === form.order_id)
    await auditLog({ action: 'UPDATE', module: 'cartaporte', table_name: 'shipping_orders', record_folio: order?.order_number, user_id: uid })

    setForm({ order_id: '', uuid: '', folio: '', date: new Date().toISOString().slice(0,10) })
    setSaving(false)
    setTab('lista')
    load()
  }

  const withCP    = orders.filter(o => o.carta_porte_uuid)
  const withoutCP = orders.filter(o => !o.carta_porte_uuid && ['collected','in_transit'].includes(o.status))

  const displayed = filterHasCP === 'with' ? withCP : filterHasCP === 'without' ? withoutCP : orders

  // Available orders for new carta porte (in transit/collected without one)
  const pendingOrders = orders.filter(o => !o.carta_porte_uuid)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <FileText size={20} className="text-orange-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Complemento Carta Porte</h1>
            <p className="text-xs text-slate-400">Obligatorio para transporte de mercancías — NOM SAT</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => { setTab('nuevo'); setForm(f => ({ ...f, order_id: '', uuid: '', folio: '' })) }}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Registrar UUID
          </button>
        </div>
      </div>

      {/* Legal banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-orange-800">Requisito fiscal obligatorio desde 2022</p>
          <p className="text-xs text-orange-700 mt-0.5">Todo traslado de mercancías por carretera requiere el complemento Carta Porte en el CFDI. Sin él, el transportista y el receptor pueden recibir multas del SAT.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Con Carta Porte', val: withCP.length, color: 'text-green-700', bg: 'bg-green-50', filter: 'with' as const },
          { label: 'Pendientes', val: withoutCP.length, color: 'text-amber-700', bg: 'bg-amber-50', filter: 'without' as const },
          { label: 'Total órdenes', val: orders.length, color: 'text-slate-700', bg: 'bg-slate-50', filter: 'all' as const },
        ].map(k => (
          <button key={k.label} onClick={() => setFilterHasCP(filterHasCP === k.filter ? 'all' : k.filter)}
            className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg} text-left transition-all hover:shadow-md ${filterHasCP === k.filter ? 'ring-2 ring-orange-300' : ''}`}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.val}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {([['lista','Todas las órdenes'], ['nuevo','Registrar UUID'], ['pendientes','Pendientes']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-700'} relative`}>
            {label}
            {t === 'pendientes' && withoutCP.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {withoutCP.length > 9 ? '9+' : withoutCP.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {tab === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-orange-50">
                    {['Guía','Remitente','Destinatario','Peso','Tipo','UUID Carta Porte','Viaje','Estado'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      Sin órdenes registradas
                    </td></tr>
                  ) : displayed.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{o.order_number}</td>
                      <td className="px-4 py-2.5 text-slate-900 text-xs">{o.sender_name}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{o.recipient_name}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{o.weight_kg ? `${o.weight_kg} kg` : '—'}</td>
                      <td className="px-4 py-2.5">
                        {o.cargo_type && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{o.cargo_type}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {o.carta_porte_uuid ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                            <span className="font-mono text-xs text-slate-400 truncate max-w-[120px]">{o.carta_porte_uuid}</span>
                          </div>
                        ) : (
                          <button onClick={() => { setTab('nuevo'); setForm(f => ({ ...f, order_id: o.id, uuid: '', folio: '' })) }}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                            + Registrar UUID
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {(o.trip as any)?.trip_number ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pendientes */}
      {tab === 'pendientes' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {withoutCP.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p>Todas las órdenes activas tienen Carta Porte registrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {withoutCP.map(o => (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-amber-50/30">
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700">{o.order_number}</p>
                    <p className="text-xs text-slate-600">{o.sender_name} → {o.recipient_name}</p>
                    <p className="text-xs text-slate-400">
                      {o.weight_kg ? `${o.weight_kg} kg` : ''}
                      {o.cargo_type ? ` · ${o.cargo_type}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                    <button onClick={() => { setTab('nuevo'); autoFill(); setForm(f => ({ ...f, order_id: o.id })) }}
                      className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2.5 py-1 rounded-lg font-medium transition-colors">
                      Registrar UUID
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Registrar UUID */}
      {tab === 'nuevo' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText size={16} className="text-orange-600" /> Registrar Complemento Carta Porte
            </h3>
            <button onClick={() => setTab('lista')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Orden de paquetería *</label>
              <select value={form.order_id}
                onChange={e => setForm(f => ({...f, order_id: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="">Seleccionar guía...</option>
                {pendingOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.sender_name} → {o.recipient_name}
                  </option>
                ))}
              </select>
              {orders.filter(o => o.id === form.order_id && o.carta_porte_uuid).length > 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Esta orden ya tiene UUID registrado — se sobreescribirá</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">UUID del CFDI Carta Porte *</label>
                <button onClick={autoFill}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                  Generar UUID de prueba
                </button>
              </div>
              <input type="text" placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                value={form.uuid}
                onChange={e => setForm(f => ({...f, uuid: e.target.value.toUpperCase()}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300" />
              <p className="text-xs text-slate-400 mt-1">UUID proporcionado por el PAC al timbrar el CFDI</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Folio fiscal</label>
                <input type="text" placeholder="CP-001"
                  value={form.folio}
                  onChange={e => setForm(f => ({...f, folio: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de timbrado</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg px-4 py-3 text-xs text-orange-700">
              <p className="font-semibold mb-1">Recordatorio SAT:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>El UUID debe obtenerse del timbre fiscal digital del PAC</li>
                <li>El CFDI con complemento Carta Porte debe acompañar físicamente la mercancía</li>
                <li>Aplica para traslados en territorio nacional con valor &gt; $1,000 MXN</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setTab('lista')}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.order_id || !form.uuid}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Guardar UUID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
