'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtPct } from '@/lib/utils/index'
import { BarChart3, RefreshCw, Bus, Users, CheckCircle, XCircle, DollarSign, Fuel } from 'lucide-react'

const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B', agency_b2c: 'Agencia B2C', personnel: 'Personal',
  rental: 'Renta', executive: 'Ejecutivo', parcel_in_trip: 'Paquetería viaje',
  parcel_dedicated: 'Paquetería dedicada', tourism: 'Turismo', charter: 'Charter',
}

export default function KpiPage() {
  const supabase = createClient()
  const today = new Date()
  const [month, setMonth] = useState(today.toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  const [tripStats, setTripStats] = useState({
    total: 0, completed: 0, cancelled: 0, inTransit: 0,
    byType: {} as Record<string, number>,
  })
  const [paxStats, setPaxStats] = useState({ total: 0, boarded: 0 })
  const [fleet, setFleet] = useState({ activeVehicles: 0, totalVehicles: 0, activeDrivers: 0, totalDrivers: 0 })
  const [financial, setFinancial] = useState({
    cxcFacurado: 0, cxcCobrado: 0, cxpTotal: 0, cxpPagado: 0, fuelCost: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const from = `${month}-01`
    // last day of month
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    const to = d.toISOString().slice(0, 10)

    const [tripsRes, paxRes, vehRes, drvRes, cxcRes, cxpRes, fuelRes] = await Promise.all([
      supabase.from('trips').select('id,status,service_type,departure_date')
        .gte('departure_date', from).lte('departure_date', to),
      supabase.from('trip_passengers').select('id,boarding_status'),
      supabase.from('vehicles').select('id,status'),
      supabase.from('drivers').select('id,status'),
      supabase.from('accounts_receivable').select('total_amount,paid_amount')
        .gte('due_date', from).lte('due_date', to),
      supabase.from('accounts_payable').select('amount,paid_amount')
        .gte('due_date', from).lte('due_date', to),
      supabase.from('fuel_loads').select('total_cost,load_date')
        .gte('load_date', from).lte('load_date', to),
    ])

    const trips = tripsRes.data ?? []
    const byType: Record<string, number> = {}
    trips.forEach((t: any) => {
      const k = t.service_type ?? 'other'
      byType[k] = (byType[k] ?? 0) + 1
    })
    setTripStats({
      total: trips.length,
      completed: trips.filter((t: any) => t.status === 'completed').length,
      cancelled: trips.filter((t: any) => t.status === 'cancelled').length,
      inTransit: trips.filter((t: any) => t.status === 'in_transit').length,
      byType,
    })

    const pax = paxRes.data ?? []
    setPaxStats({ total: pax.length, boarded: pax.filter((p: any) => p.boarding_status === 'boarded').length })

    const vehs = vehRes.data ?? []
    const drvs = drvRes.data ?? []
    setFleet({
      activeVehicles: vehs.filter((v: any) => v.status === 'active').length,
      totalVehicles: vehs.length,
      activeDrivers: drvs.filter((d: any) => d.status === 'active').length,
      totalDrivers: drvs.length,
    })

    const ar = cxcRes.data ?? []
    const ap = cxpRes.data ?? []
    setFinancial({
      cxcFacurado: ar.reduce((s, r: any) => s + (r.total_amount ?? 0), 0),
      cxcCobrado: ar.reduce((s, r: any) => s + (r.paid_amount ?? 0), 0),
      cxpTotal: ap.reduce((s, r: any) => s + (r.amount ?? 0), 0),
      cxpPagado: ap.reduce((s, r: any) => s + (r.paid_amount ?? 0), 0),
      fuelCost: (fuelRes.data ?? []).reduce((s, r: any) => s + (r.total_cost ?? 0), 0),
    })

    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const completionRate = tripStats.total > 0
    ? (tripStats.completed / Math.max(tripStats.total - tripStats.cancelled, 1)) * 100 : 0
  const boardingRate = paxStats.total > 0 ? (paxStats.boarded / paxStats.total) * 100 : 0
  const collectionRate = financial.cxcFacurado > 0 ? (financial.cxcCobrado / financial.cxcFacurado) * 100 : 0
  const maxTypeCount = Math.max(...Object.values(tripStats.byType), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">KPI Operativos</h1>
            <p className="text-xs text-slate-400">Indicadores clave del período</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month}
            onChange={e => setMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Viajes programados', val: tripStats.total, sub: `${tripStats.inTransit} en tránsito`, icon: Bus, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Tasa de cumplimiento', val: fmtPct(completionRate), sub: `${tripStats.completed} completados`, icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Cancelaciones', val: tripStats.cancelled, sub: fmtPct(tripStats.total > 0 ? tripStats.cancelled / tripStats.total * 100 : 0), icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Tasa de abordaje', val: fmtPct(boardingRate), sub: `${paxStats.boarded} / ${paxStats.total} pax`, icon: Users, color: 'text-teal-700', bg: 'bg-teal-50' },
          { label: 'Unidades activas', val: fleet.activeVehicles, sub: `de ${fleet.totalVehicles} registradas`, icon: Bus, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Operadores activos', val: fleet.activeDrivers, sub: `de ${fleet.totalDrivers} registrados`, icon: Users, color: 'text-rose-700', bg: 'bg-rose-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <k.icon size={13} className={k.color} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{loading ? '…' : k.val}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">{k.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <DollarSign size={12} className="text-green-600" /> Cobranza
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Facturado</span>
              <span className="font-semibold text-slate-700">{fmt(financial.cxcFacurado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cobrado</span>
              <span className="font-semibold text-green-700">{fmt(financial.cxcCobrado)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
            </div>
            <p className="text-xs text-slate-400">{fmtPct(collectionRate)} de cobranza efectiva</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <DollarSign size={12} className="text-red-500" /> Pagos a proveedores
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Comprometido</span>
              <span className="font-semibold text-slate-700">{fmt(financial.cxpTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Pagado</span>
              <span className="font-semibold text-red-600">{fmt(financial.cxpPagado)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-red-400"
                style={{ width: `${Math.min(financial.cxpTotal > 0 ? financial.cxpPagado / financial.cxpTotal * 100 : 0, 100)}%` }} />
            </div>
            <p className="text-xs text-slate-400">
              {fmt(financial.cxpTotal - financial.cxpPagado)} pendiente de pago
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Fuel size={12} className="text-purple-600" /> Costo combustible
          </h3>
          <p className="text-3xl font-bold text-purple-700">{loading ? '…' : fmt(financial.fuelCost)}</p>
          <p className="text-xs text-slate-400 mt-1">Total cargado en el período</p>
        </div>
      </div>

      {/* By service type */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-4">Viajes por tipo de servicio</h3>
        <div className="space-y-2.5">
          {Object.entries(tripStats.byType).sort(([, a], [, b]) => b - a).map(([type, count]) => {
            const pct = Math.round((count / tripStats.total) * 100)
            return (
              <div key={type} className="flex items-center gap-3">
                <p className="text-sm text-slate-600 w-44 truncate">{SERVICE_LABELS[type] ?? type}</p>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                </div>
                <p className="text-xs font-bold text-slate-700 w-20 text-right">{count} ({pct}%)</p>
              </div>
            )
          })}
          {tripStats.total === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Sin viajes en el período</p>
          )}
        </div>
      </div>
    </div>
  )
}
