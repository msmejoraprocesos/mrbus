'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'
import { Wrench, Plus, X, RefreshCw, AlertTriangle, Clock, CheckCircle, DollarSign } from 'lucide-react'

type Order = {
  id: string
  order_number: string
  vehicle_id: string
  maint_type: string
  description: string
  scheduled_date: string
  completed_date: string | null
  estimated_cost: number | null
  actual_cost: number | null
  status: string
  blocks_vehicle: boolean
  technician: string | null
  notes: string | null
  vehicle?: { plate: string; economic_number: string }
}

type Vehicle = { id: string; plate: string; economic_number: string }

const MAINT_TYPES = [
  { val: 'preventivo', label: 'Preventivo' },
  { val: 'correctivo', label: 'Correctivo' },
  { val: 'predictivo', label: 'Predictivo' },
  { val: 'revision', label: 'Revisión' },
  { val: 'llantas', label: 'Llantas' },
  { val: 'accidente', label: 'Accidente' },
]

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled:   { label: 'Programado', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En proceso', color: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completado', color: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelado',  color: 'bg-slate-100 text-slate-500' },
  pending:     { label: 'Pendiente',  color: 'bg-orange-100 text-orange-700' },
}

export default function MantenimientoPage() {
  const supabase = createClient()
  const [orders, setOrders]     = useState<Order[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'lista' | 'nueva' | 'detalle'>('lista')
  const [selected, setSelected] = useState<Order | null>(null)
  const [saving, setSaving]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const [form, setForm] = useState({
    vehicle_id: '',
    maint_type: 'preventivo',
    description: '',
    scheduled_date: new Date().toISOString().slice(0, 10),
    estimated_cost: '',
    blocks_vehicle: false,
    technician: '',
    notes: '',
  })

  const [updateForm, setUpdateForm] = useState({
    status: '',
    actual_cost: '',
    completed_date: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [ordersRes, vehiclesRes] = await Promise.all([
      supabase.from('maintenance_orders')
        .select('*, vehicle:vehicles(plate,economic_number)')
        .order('scheduled_date', { ascending: false }),
      supabase.from('vehicles').select('id,plate,economic_number').order('economic_number'),
    ])
    setOrders(ordersRes.data ?? [])
    setVehicles(vehiclesRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function guardar() {
    if (!form.vehicle_id || !form.description || !form.scheduled_date) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''
    const folio = await getNextFolio('mto')
    const row = {
      order_number: folio,
      vehicle_id: form.vehicle_id,
      maint_type: form.maint_type,
      description: form.description,
      scheduled_date: form.scheduled_date,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      blocks_vehicle: form.blocks_vehicle,
      technician: form.technician || null,
      notes: form.notes || null,
      status: 'scheduled',
    }
    const { error } = await supabase.from('maintenance_orders').insert(row)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const veh = vehicles.find(v => v.id === form.vehicle_id)
    await auditLog({ action: 'INSERT', module: 'mantenimiento', table_name: 'maintenance_orders', record_folio: folio, user_id: uid })

    setForm({ vehicle_id: '', maint_type: 'preventivo', description: '', scheduled_date: new Date().toISOString().slice(0,10), estimated_cost: '', blocks_vehicle: false, technician: '', notes: '' })
    setSaving(false)
    setTab('lista')
    load()
  }

  async function actualizarOrden() {
    if (!selected) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''
    const patch: Record<string, unknown> = { status: updateForm.status }
    if (updateForm.actual_cost) patch.actual_cost = parseFloat(updateForm.actual_cost)
    if (updateForm.completed_date) patch.completed_date = updateForm.completed_date
    if (updateForm.notes) patch.notes = updateForm.notes
    if (updateForm.status === 'completed' && !updateForm.completed_date) {
      patch.completed_date = new Date().toISOString().slice(0, 10)
    }
    const { error } = await supabase.from('maintenance_orders').update(patch).eq('id', selected.id)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    await auditLog({ action: 'UPDATE', module: 'mantenimiento', table_name: 'maintenance_orders', record_folio: selected.order_number, user_id: uid })
    setSaving(false)
    setTab('lista')
    setSelected(null)
    load()
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  const pending     = orders.filter(o => o.status === 'scheduled').length
  const inProgress  = orders.filter(o => o.status === 'in_progress').length
  const completed   = orders.filter(o => o.status === 'completed').length
  const totalCosto  = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.actual_cost ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Wrench size={20} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Mantenimiento</h1>
            <p className="text-xs text-slate-400">{orders.length} órdenes totales</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setTab('nueva')}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Nueva orden
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Programados', val: pending, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'En proceso', val: inProgress, icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Completados', val: completed, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Costo total real', val: fmt(totalCosto), icon: DollarSign, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <k.icon size={14} className={k.color} />
            </div>
            <p className={`text-xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {([['lista','Lista'], ['nueva','Nueva orden']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
        {tab === 'detalle' && (
          <button className="px-4 py-2 text-sm font-medium border-b-2 border-purple-600 text-purple-700">
            Actualizar orden
          </button>
        )}
      </div>

      {/* Lista */}
      {tab === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Filtros */}
          <div className="px-4 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
            {[['all','Todos'], ...Object.entries(STATUS_MAP).map(([v, s]) => [v, s.label])].map(([val, label]) => (
              <button key={val} onClick={() => setFilterStatus(val)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filterStatus === val ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-purple-50">
                    {['Orden','Unidad','Tipo','Descripción','Fecha','Est.','Real','Estado','Bloquea',''].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      Sin órdenes — <button onClick={() => setTab('nueva')} className="text-purple-600 underline">crear primera orden</button>
                    </td></tr>
                  ) : filtered.map(o => {
                    const s = STATUS_MAP[o.status] ?? { label: o.status, color: 'bg-slate-100 text-slate-500' }
                    const typeLabel = MAINT_TYPES.find(t => t.val === o.maint_type)?.label ?? o.maint_type
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50 cursor-pointer"
                        onClick={() => { setSelected(o); setUpdateForm({ status: o.status, actual_cost: o.actual_cost ? String(o.actual_cost) : '', completed_date: o.completed_date ?? '', notes: o.notes ?? '' }); setTab('detalle') }}>
                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-600">{o.order_number}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                            {o.vehicle?.plate ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{typeLabel}</td>
                        <td className="px-4 py-2.5 max-w-[180px]">
                          <p className="truncate text-slate-700">{o.description}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDate(o.scheduled_date)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{o.estimated_cost ? fmt(o.estimated_cost) : '—'}</td>
                        <td className="px-4 py-2.5 font-semibold">{o.actual_cost ? fmt(o.actual_cost) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.color}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${o.blocks_vehicle ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                            {o.blocks_vehicle ? '🔴 Sí' : '🟢 No'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-purple-400">Ver →</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Nueva orden */}
      {tab === 'nueva' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Wrench size={16} className="text-purple-600" /> Nueva orden de mantenimiento
            </h3>
            <button onClick={() => setTab('lista')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Unidad *</label>
                <select value={form.vehicle_id}
                  onChange={e => setForm(f => ({...f, vehicle_id: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  <option value="">Seleccionar...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.economic_number} — {v.plate}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo *</label>
                <select value={form.maint_type}
                  onChange={e => setForm(f => ({...f, maint_type: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {MAINT_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción del trabajo *</label>
              <textarea rows={3} placeholder="Describe el trabajo a realizar..."
                value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha programada *</label>
                <input type="date" value={form.scheduled_date}
                  onChange={e => setForm(f => ({...f, scheduled_date: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Costo estimado</label>
                <input type="number" min="0" step="100" placeholder="5000"
                  value={form.estimated_cost}
                  onChange={e => setForm(f => ({...f, estimated_cost: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Técnico / Taller</label>
              <input type="text" placeholder="Nombre del técnico o taller"
                value={form.technician}
                onChange={e => setForm(f => ({...f, technician: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>

            <div className="flex items-center gap-3 bg-red-50 rounded-lg px-4 py-3">
              <input type="checkbox" id="blocks" checked={form.blocks_vehicle}
                onChange={e => setForm(f => ({...f, blocks_vehicle: e.target.checked}))}
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-400" />
              <label htmlFor="blocks" className="text-sm text-slate-700 cursor-pointer">
                <span className="font-medium text-red-700">Bloquea unidad</span> — la unidad no puede operar durante este mantenimiento
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notas internas</label>
              <textarea rows={2} placeholder="Información adicional..."
                value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setTab('lista')}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.vehicle_id || !form.description || !form.scheduled_date}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                Crear orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalle / actualizar */}
      {tab === 'detalle' && selected && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono font-bold text-slate-700">{selected.order_number}</p>
              <p className="text-xs text-slate-400">{selected.vehicle?.plate} — {MAINT_TYPES.find(t=>t.val===selected.maint_type)?.label}</p>
            </div>
            <button onClick={() => { setTab('lista'); setSelected(null) }} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-slate-700">{selected.description}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Estado</label>
              <select value={updateForm.status}
                onChange={e => setUpdateForm(f => ({...f, status: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                {Object.entries(STATUS_MAP).map(([val, s]) => (
                  <option key={val} value={val}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Costo real</label>
                <input type="number" min="0" step="100"
                  value={updateForm.actual_cost}
                  onChange={e => setUpdateForm(f => ({...f, actual_cost: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha completado</label>
                <input type="date"
                  value={updateForm.completed_date}
                  onChange={e => setUpdateForm(f => ({...f, completed_date: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notas</label>
              <textarea rows={2}
                value={updateForm.notes}
                onChange={e => setUpdateForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setTab('lista'); setSelected(null) }}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={actualizarOrden} disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Actualizar orden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
