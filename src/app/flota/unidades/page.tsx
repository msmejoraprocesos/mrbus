'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { Bus, Plus, X, RefreshCw, FileWarning, CheckCircle, Wrench } from 'lucide-react'

type Vehicle = {
  id: string
  plate: string
  economic_number: string
  brand: string | null
  model: string | null
  year: number | null
  capacity: number | null
  type: string | null
  status: string
  vin: string | null
  engine_number: string | null
  color: string | null
  acquisition_date: string | null
  acquisition_cost: number | null
  notes: string | null
}

const STATUSES: Record<string, { label: string; color: string }> = {
  active:      { label: 'Activa',        color: 'bg-green-100 text-green-700' },
  maintenance: { label: 'Mantenimiento', color: 'bg-amber-100 text-amber-700' },
  inactive:    { label: 'Inactiva',      color: 'bg-slate-100 text-slate-500' },
  retired:     { label: 'Retirada',      color: 'bg-red-100 text-red-700' },
}

const TYPES = ['Autobús', 'Minibús', 'Van', 'Camioneta', 'Camión']

export default function UnidadesPage() {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'lista' | 'nueva' | 'detalle'>('lista')
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [saving, setSaving]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const empty = { plate: '', economic_number: '', brand: '', model: '', year: '', capacity: '', type: 'Autobús', status: 'active', vin: '', engine_number: '', color: '', acquisition_date: '', acquisition_cost: '', notes: '' }
  const [form, setForm] = useState(empty)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('vehicles').select('*').order('economic_number')
    setVehicles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setForm(empty); setSelected(null); setTab('nueva') }
  function openEdit(v: Vehicle) {
    setForm({
      plate: v.plate, economic_number: v.economic_number, brand: v.brand ?? '', model: v.model ?? '',
      year: v.year ? String(v.year) : '', capacity: v.capacity ? String(v.capacity) : '',
      type: v.type ?? 'Autobús', status: v.status, vin: v.vin ?? '', engine_number: v.engine_number ?? '',
      color: v.color ?? '', acquisition_date: v.acquisition_date ?? '', acquisition_cost: v.acquisition_cost ? String(v.acquisition_cost) : '',
      notes: v.notes ?? '',
    })
    setSelected(v)
    setTab('nueva')
  }

  async function guardar() {
    if (!form.plate || !form.economic_number) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''
    const row = {
      plate: form.plate.toUpperCase().trim(),
      economic_number: form.economic_number.trim(),
      brand: form.brand || null,
      model: form.model || null,
      year: form.year ? parseInt(form.year) : null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      type: form.type || null,
      status: form.status,
      vin: form.vin || null,
      engine_number: form.engine_number || null,
      color: form.color || null,
      acquisition_date: form.acquisition_date || null,
      acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
      notes: form.notes || null,
    }

    if (selected) {
      const { error } = await supabase.from('vehicles').update(row).eq('id', selected.id)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
      await auditLog({ action: 'UPDATE', module: 'unidades', table_name: 'vehicles', record_folio: row.plate, user_id: uid })
    } else {
      const { error } = await supabase.from('vehicles').insert(row)
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
      await auditLog({ action: 'INSERT', module: 'unidades', table_name: 'vehicles', record_folio: row.plate, user_id: uid })
    }

    setSaving(false)
    setTab('lista')
    setSelected(null)
    load()
  }

  const filtered = filterStatus === 'all' ? vehicles : vehicles.filter(v => v.status === filterStatus)
  const active      = vehicles.filter(v => v.status === 'active').length
  const maintenance = vehicles.filter(v => v.status === 'maintenance').length
  const inactive    = vehicles.filter(v => v.status !== 'active' && v.status !== 'maintenance').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Bus size={20} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Unidades</h1>
            <p className="text-xs text-slate-400">{active} activas · {maintenance} en mantenimiento · {inactive} inactivas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} />
          </button>
          <button onClick={openNew}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Nueva unidad
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Activas', val: active, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50', status: 'active' },
          { label: 'Mantenimiento', val: maintenance, icon: Wrench, color: 'text-amber-700', bg: 'bg-amber-50', status: 'maintenance' },
          { label: 'Total flota', val: vehicles.length, icon: Bus, color: 'text-purple-700', bg: 'bg-purple-50', status: 'all' },
        ].map(k => (
          <button key={k.label} onClick={() => setFilterStatus(filterStatus === k.status ? 'all' : k.status)}
            className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg} text-left transition-all hover:shadow-md ${filterStatus === k.status ? 'ring-2 ring-purple-300' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <k.icon size={14} className={k.color} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {([['lista', 'Lista'], ['nueva', selected ? 'Editar unidad' : 'Nueva unidad']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
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
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-purple-50">
                    {['Eco.','Placa','Marca/Modelo','Año','Cap.','Tipo','Estado','Adquisición',''].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      Sin unidades — <button onClick={openNew} className="text-purple-600 underline">registrar primera unidad</button>
                    </td></tr>
                  ) : filtered.map(v => {
                    const s = STATUSES[v.status] ?? { label: v.status, color: 'bg-slate-100 text-slate-500' }
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{v.economic_number}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">{v.plate}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-500">{v.year ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-700 font-semibold">{v.capacity ? `${v.capacity} pas.` : '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{v.type ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.color}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">
                          {v.acquisition_date ? fmtDate(v.acquisition_date) : '—'}
                          {v.acquisition_cost ? ` · ${fmt(v.acquisition_cost)}` : ''}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => openEdit(v)} className="text-xs text-purple-500 hover:text-purple-700">Editar</button>
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

      {/* Nueva / Editar */}
      {tab === 'nueva' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Bus size={16} className="text-purple-600" />
              {selected ? `Editar ${selected.plate}` : 'Registrar nueva unidad'}
            </h3>
            <button onClick={() => setTab('lista')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Número económico *</label>
                <input type="text" placeholder="001"
                  value={form.economic_number}
                  onChange={e => setForm(f => ({...f, economic_number: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Placa *</label>
                <input type="text" placeholder="ABC-123"
                  value={form.plate}
                  onChange={e => setForm(f => ({...f, plate: e.target.value.toUpperCase()}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Marca</label>
                <input type="text" placeholder="Dina"
                  value={form.brand}
                  onChange={e => setForm(f => ({...f, brand: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Modelo</label>
                <input type="text" placeholder="DH360"
                  value={form.model}
                  onChange={e => setForm(f => ({...f, model: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Año</label>
                <input type="number" min="1990" max="2030" placeholder="2020"
                  value={form.year}
                  onChange={e => setForm(f => ({...f, year: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                <select value={form.type}
                  onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Capacidad (pasajeros)</label>
                <input type="number" min="1" max="80" placeholder="45"
                  value={form.capacity}
                  onChange={e => setForm(f => ({...f, capacity: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Estado</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({...f, status: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {Object.entries(STATUSES).map(([val, s]) => (
                    <option key={val} value={val}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">NIV / VIN</label>
                <input type="text" placeholder="3VWBX7AJ6EM..."
                  value={form.vin}
                  onChange={e => setForm(f => ({...f, vin: e.target.value.toUpperCase()}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Número de motor</label>
                <input type="text" placeholder=""
                  value={form.engine_number}
                  onChange={e => setForm(f => ({...f, engine_number: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Color</label>
                <input type="text" placeholder="Blanco"
                  value={form.color}
                  onChange={e => setForm(f => ({...f, color: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha adquisición</label>
                <input type="date"
                  value={form.acquisition_date}
                  onChange={e => setForm(f => ({...f, acquisition_date: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Costo adquisición</label>
                <input type="number" min="0" step="1000"
                  value={form.acquisition_cost}
                  onChange={e => setForm(f => ({...f, acquisition_cost: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notas</label>
              <textarea rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setTab('lista')}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.plate || !form.economic_number}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {selected ? 'Guardar cambios' : 'Registrar unidad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
