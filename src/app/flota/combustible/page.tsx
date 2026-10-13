'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { Fuel, Plus, X, RefreshCw, TrendingDown, DollarSign, Gauge, List } from 'lucide-react'

type FuelLoad = {
  id: string
  load_date: string
  liters: number
  price_per_liter: number
  total_cost: number
  station: string | null
  odometer_km: number | null
  fuel_type: string
  vehicle_id: string
  driver_id: string | null
  notes: string | null
  vehicle?: { plate: string; economic_number: string }
  driver?: { first_name: string; last_name: string }
}

type Vehicle = { id: string; plate: string; economic_number: string }
type Driver  = { id: string; first_name: string; last_name: string }
type FuelPrice = { id: string; fuel_type: string; price_per_liter: number; effective_date: string; is_active: boolean }

const FUEL_TYPES = ['Diesel', 'Gasolina', 'Gas LP', 'Eléctrico']

function getMesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function CombustiblePage() {
  const supabase = createClient()
  const [loads, setLoads]     = useState<FuelLoad[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers]   = useState<Driver[]>([])
  const [prices, setPrices]     = useState<FuelPrice[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'lista' | 'nueva'>('lista')
  const [mesActual]             = useState(getMesActual())
  const [saving, setSaving]     = useState(false)

  const [form, setForm] = useState({
    load_date: new Date().toISOString().slice(0, 10),
    vehicle_id: '',
    driver_id: '',
    fuel_type: 'Diesel',
    liters: '',
    price_per_liter: '',
    station: '',
    odometer_km: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [loadsRes, vehiclesRes, driversRes, pricesRes] = await Promise.all([
      supabase.from('fuel_loads')
        .select('*, vehicle:vehicles(plate,economic_number), driver:drivers(first_name,last_name)')
        .order('load_date', { ascending: false })
        .limit(200),
      supabase.from('vehicles').select('id,plate,economic_number').eq('status', 'active').order('economic_number'),
      supabase.from('drivers').select('id,first_name,last_name').eq('status', 'active').order('first_name'),
      supabase.from('fuel_prices').select('*').eq('is_active', true).order('effective_date', { ascending: false }),
    ])
    setLoads(loadsRes.data ?? [])
    setVehicles(vehiclesRes.data ?? [])
    setDrivers(driversRes.data ?? [])
    setPrices(pricesRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-fill price when fuel type changes
  useEffect(() => {
    const p = prices.find(p => p.fuel_type.toLowerCase() === form.fuel_type.toLowerCase())
    if (p) setForm(f => ({ ...f, price_per_liter: String(p.price_per_liter) }))
  }, [form.fuel_type, prices])

  const totalCost = form.liters && form.price_per_liter
    ? parseFloat(form.liters) * parseFloat(form.price_per_liter)
    : 0

  async function guardar() {
    if (!form.vehicle_id || !form.liters || !form.price_per_liter) return
    setSaving(true)
    const liters = parseFloat(form.liters)
    const price  = parseFloat(form.price_per_liter)
    const total  = liters * price
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? ''

    const row = {
      load_date: form.load_date,
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || null,
      fuel_type: form.fuel_type,
      liters,
      price_per_liter: price,
      total_cost: total,
      station: form.station || null,
      odometer_km: form.odometer_km ? parseInt(form.odometer_km) : null,
      notes: form.notes || null,
    }

    const { error } = await supabase.from('fuel_loads').insert(row)
    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    await auditLog({ action: 'INSERT', module: 'combustible', table_name: 'fuel_loads', record_folio: `${fmtN(liters,1)}L ${form.fuel_type}`, user_id: uid })

    setForm({ load_date: new Date().toISOString().slice(0,10), vehicle_id: '', driver_id: '', fuel_type: 'Diesel', liters: '', price_per_liter: '', station: '', odometer_km: '', notes: '' })
    setSaving(false)
    setTab('lista')
    load()
  }

  // KPIs
  const loadsThisMonth = loads.filter(l => l.load_date?.startsWith(mesActual))
  const totalLitrosMes = loadsThisMonth.reduce((s, l) => s + (l.liters ?? 0), 0)
  const totalCostoMes  = loadsThisMonth.reduce((s, l) => s + (l.total_cost ?? 0), 0)
  const promPrecio     = totalLitrosMes > 0 ? totalCostoMes / totalLitrosMes : 0
  const activeVehicles = Array.from(new Set(loadsThisMonth.map(l => l.vehicle_id))).length

  const kpis = [
    { label: 'Litros este mes', val: fmtN(totalLitrosMes, 0) + ' L', icon: Fuel, color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'Gasto combustible', val: fmt(totalCostoMes), icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Precio promedio', val: promPrecio > 0 ? fmt(promPrecio) + '/L' : '—', icon: TrendingDown, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Unidades abastecidas', val: String(activeVehicles), icon: Gauge, color: 'text-teal-700', bg: 'bg-teal-50' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Fuel size={20} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Control de Combustible</h1>
            <p className="text-xs text-slate-400">{loads.length} cargas registradas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setTab('nueva')}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Nueva carga
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
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
        {([['lista','Lista'], ['nueva','Nueva carga']] as const).map(([t, label]) => (
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
                    {['Fecha','Unidad','Operador','Tipo','Litros','Precio/L','Total','Odómetro','Estación'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loads.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      Sin cargas registradas — <button onClick={() => setTab('nueva')} className="text-purple-600 underline">registrar primera carga</button>
                    </td></tr>
                  ) : loads.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDate(l.load_date)}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                          {l.vehicle?.plate ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {l.driver ? `${l.driver.first_name} ${l.driver.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{l.fuel_type}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{fmtN(l.liters, 1)} L</td>
                      <td className="px-4 py-2.5 text-slate-500">{fmt(l.price_per_liter)}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{fmt(l.total_cost)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {l.odometer_km ? l.odometer_km.toLocaleString() + ' km' : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{l.station ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Nueva carga */}
      {tab === 'nueva' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Fuel size={16} className="text-purple-600" /> Registrar carga de combustible
            </h3>
            <button onClick={() => setTab('lista')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha *</label>
                <input type="date" value={form.load_date}
                  onChange={e => setForm(f => ({...f, load_date: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo combustible *</label>
                <select value={form.fuel_type}
                  onChange={e => setForm(f => ({...f, fuel_type: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Unidad *</label>
              <select value={form.vehicle_id}
                onChange={e => setForm(f => ({...f, vehicle_id: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">Seleccionar unidad...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.economic_number} — {v.plate}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Operador</label>
              <select value={form.driver_id}
                onChange={e => setForm(f => ({...f, driver_id: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">Sin operador asignado</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Litros cargados *</label>
                <input type="number" step="0.1" min="0" placeholder="150.5"
                  value={form.liters}
                  onChange={e => setForm(f => ({...f, liters: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Precio por litro *</label>
                <input type="number" step="0.01" min="0" placeholder="22.50"
                  value={form.price_per_liter}
                  onChange={e => setForm(f => ({...f, price_per_liter: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            {/* Total preview */}
            {totalCost > 0 && (
              <div className="bg-purple-50 rounded-lg px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-slate-600">Total carga</span>
                <span className="text-lg font-bold text-purple-700">{fmt(totalCost)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Estación</label>
                <input type="text" placeholder="PEMEX Carretera Norte"
                  value={form.station}
                  onChange={e => setForm(f => ({...f, station: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Odómetro (km)</label>
                <input type="number" min="0" placeholder="125000"
                  value={form.odometer_km}
                  onChange={e => setForm(f => ({...f, odometer_km: e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notas</label>
              <textarea rows={2} placeholder="Observaciones..."
                value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setTab('lista')}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.vehicle_id || !form.liters || !form.price_per_liter}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Fuel size={14} />}
                Registrar carga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
