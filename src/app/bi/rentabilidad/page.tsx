'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtPct } from '@/lib/utils/index'
import { TrendingUp, RefreshCw, DollarSign, TrendingDown, BarChart3, Fuel } from 'lucide-react'

const SERVICE_L: Record<string, string> = {
  tourism_b2b: '🌴 Turismo B2B',
  agency_b2c: '🎫 Agencia B2C',
  personnel: '🏭 Personal',
  rental: '🚌 Renta',
  executive: '✈️ Ejecutivo',
  parcel_in_trip: '📦 Paquetería en viaje',
  parcel_dedicated: '📦 Paquetería dedicada',
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

type MonthData = { month: string; revenue: number; costs: number; profit: number }

export default function RentabilidadPage() {
  const supabase = createClient()
  const year = new Date().getFullYear()
  const [yearFilter, setYearFilter] = useState(year)

  // Aggregated data
  const [quotationData, setQuotationData] = useState<{
    totalRevenue: number; totalCost: number; avgMargin: number; count: number;
    byType: Record<string, { count: number; revenue: number; cost: number }>
  }>({ totalRevenue: 0, totalCost: 0, avgMargin: 0, count: 0, byType: {} })

  const [cxcData, setCxcData] = useState({ total: 0, cobrado: 0, pendiente: 0 })
  const [cxpData, setCxpData]   = useState({ total: 0, pagado: 0, pendiente: 0 })
  const [fuelCost, setFuelCost] = useState(0)
  const [maintenanceCost, setMaintenanceCost] = useState(0)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const from = `${yearFilter}-01-01`
    const to   = `${yearFilter}-12-31`

    const [quotRes, cxcRes, cxpRes, fuelRes, mtoRes] = await Promise.all([
      supabase.from('quotations')
        .select('service_type,client_price,margin_pct,cost_breakdown,status,created_at')
        .eq('status', 'approved')
        .gte('created_at', from).lte('created_at', to + 'T23:59:59'),
      supabase.from('accounts_receivable')
        .select('total_amount,paid_amount,status,due_date')
        .gte('due_date', from).lte('due_date', to),
      supabase.from('accounts_payable')
        .select('amount,paid_amount,status,due_date')
        .gte('due_date', from).lte('due_date', to),
      supabase.from('fuel_loads')
        .select('total_cost,load_date')
        .gte('load_date', from).lte('load_date', to),
      supabase.from('maintenance_orders')
        .select('actual_cost,completed_date,status')
        .eq('status', 'completed')
        .gte('completed_date', from).lte('completed_date', to),
    ])

    // Quotations
    const quots = quotRes.data ?? []
    const totalRevenue = quots.reduce((s, q: any) => s + (q.client_price ?? 0), 0)
    const totalCost = quots.reduce((s, q: any) => s + ((q.cost_breakdown as any)?.total_cost ?? 0), 0)
    const avgMargin = quots.length ? quots.reduce((s, q: any) => s + (q.margin_pct ?? 0), 0) / quots.length : 0
    const byType = quots.reduce((acc: Record<string, { count: number; revenue: number; cost: number }>, q: any) => {
      const t = q.service_type ?? 'other'
      if (!acc[t]) acc[t] = { count: 0, revenue: 0, cost: 0 }
      acc[t].count++
      acc[t].revenue += q.client_price ?? 0
      acc[t].cost += (q.cost_breakdown as any)?.total_cost ?? 0
      return acc
    }, {})
    setQuotationData({ totalRevenue, totalCost, avgMargin, count: quots.length, byType })

    // CXC
    const arData = cxcRes.data ?? []
    setCxcData({
      total: arData.reduce((s, r: any) => s + (r.total_amount ?? 0), 0),
      cobrado: arData.reduce((s, r: any) => s + (r.paid_amount ?? 0), 0),
      pendiente: arData.filter((r: any) => r.status !== 'paid').reduce((s, r: any) => s + ((r.total_amount ?? 0) - (r.paid_amount ?? 0)), 0),
    })

    // CXP
    const apData = cxpRes.data ?? []
    setCxpData({
      total: apData.reduce((s, r: any) => s + (r.amount ?? 0), 0),
      pagado: apData.reduce((s, r: any) => s + (r.paid_amount ?? 0), 0),
      pendiente: apData.filter((r: any) => r.status !== 'paid').reduce((s, r: any) => s + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0),
    })

    // Fuel
    setFuelCost((fuelRes.data ?? []).reduce((s, r: any) => s + (r.total_cost ?? 0), 0))

    // Maintenance
    setMaintenanceCost((mtoRes.data ?? []).reduce((s, r: any) => s + (r.actual_cost ?? 0), 0))

    // Monthly breakdown from CXC (ingresos reales cobrados)
    const monthly: Record<string, { revenue: number; costs: number }> = {}
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0')
      monthly[key] = { revenue: 0, costs: 0 }
    }
    arData.forEach((r: any) => {
      const m = r.due_date?.slice(5, 7)
      if (m && monthly[m]) monthly[m].revenue += r.paid_amount ?? 0
    })
    apData.forEach((r: any) => {
      const m = r.due_date?.slice(5, 7)
      if (m && monthly[m]) monthly[m].costs += r.paid_amount ?? 0
    })
    ;(fuelRes.data ?? []).forEach((r: any) => {
      const m = r.load_date?.slice(5, 7)
      if (m && monthly[m]) monthly[m].costs += r.total_cost ?? 0
    })

    setMonthlyData(
      Object.entries(monthly).map(([k, v]) => ({
        month: MONTHS[parseInt(k) - 1],
        revenue: v.revenue,
        costs: v.costs,
        profit: v.revenue - v.costs,
      }))
    )

    setLoading(false)
  }, [yearFilter])

  useEffect(() => { load() }, [load])

  const grossProfit = cxcData.cobrado - cxpData.pagado - fuelCost - maintenanceCost
  const grossMargin = cxcData.cobrado > 0 ? (grossProfit / cxcData.cobrado) * 100 : 0
  const maxMonthly = Math.max(...monthlyData.map(m => Math.max(m.revenue, m.costs)), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Análisis de Rentabilidad</h1>
            <p className="text-xs text-slate-400">P&L real: ingresos cobrados vs costos pagados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={yearFilter} onChange={e => setYearFilter(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos cobrados', val: fmt(cxcData.cobrado), icon: DollarSign, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Costos pagados', val: fmt(cxpData.pagado + fuelCost + maintenanceCost), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Utilidad bruta', val: fmt(grossProfit), icon: BarChart3, color: grossProfit >= 0 ? 'text-teal-700' : 'text-red-700', bg: grossProfit >= 0 ? 'bg-teal-50' : 'bg-red-50' },
          { label: 'Margen bruto', val: fmtPct(grossMargin), icon: TrendingUp, color: grossMargin >= 20 ? 'text-indigo-700' : 'text-amber-700', bg: 'bg-indigo-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border border-slate-100 shadow-sm p-4 ${k.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <k.icon size={14} className={k.color} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{loading ? '…' : k.val}</p>
          </div>
        ))}
      </div>

      {/* Cost breakdown + CXC/CXP summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ingresos */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-1.5">
            <DollarSign size={14} className="text-green-600" /> Cuentas por cobrar {yearFilter}
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Total facturado', val: cxcData.total, color: 'text-slate-700' },
              { label: 'Cobrado', val: cxcData.cobrado, color: 'text-green-700' },
              { label: 'Por cobrar', val: cxcData.pendiente, color: 'text-amber-700' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-semibold ${r.color}`}>{fmt(r.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Costos CXP */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-1.5">
            <TrendingDown size={14} className="text-red-500" /> Cuentas por pagar {yearFilter}
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Total comprometido', val: cxpData.total, color: 'text-slate-700' },
              { label: 'Pagado', val: cxpData.pagado, color: 'text-red-600' },
              { label: 'Por pagar', val: cxpData.pendiente, color: 'text-amber-700' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-semibold ${r.color}`}>{fmt(r.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Costos operativos */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-1.5">
            <Fuel size={14} className="text-purple-600" /> Costos operativos {yearFilter}
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Combustible', val: fuelCost, color: 'text-purple-700' },
              { label: 'Mantenimiento', val: maintenanceCost, color: 'text-orange-600' },
              { label: 'Total operativo', val: fuelCost + maintenanceCost, color: 'text-slate-800' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-semibold ${r.color}`}>{fmt(r.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-4">Ingresos vs Costos por mes — {yearFilter}</h3>
        <div className="grid grid-cols-12 gap-1 items-end h-40">
          {monthlyData.map(m => (
            <div key={m.month} className="flex flex-col items-center gap-0.5">
              <div className="flex flex-col items-center gap-px w-full">
                <div
                  className="w-full bg-green-400 rounded-t-sm"
                  style={{ height: `${(m.revenue / maxMonthly) * 100}px`, minHeight: m.revenue > 0 ? '2px' : '0' }}
                  title={`Ingreso: ${fmt(m.revenue)}`}
                />
                <div
                  className="w-full bg-red-300 rounded-b-sm"
                  style={{ height: `${(m.costs / maxMonthly) * 60}px`, minHeight: m.costs > 0 ? '2px' : '0' }}
                  title={`Costo: ${fmt(m.costs)}`}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">{m.month}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-400 rounded inline-block" /> Ingresos cobrados</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-300 rounded inline-block" /> Costos</span>
        </div>
      </div>

      {/* By service type */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-indigo-50">
          <h3 className="font-semibold text-indigo-900 text-sm">Rentabilidad por tipo de servicio (cotizaciones aprobadas)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-slate-50">
                {['Servicio', 'Cotizaciones', 'Ingreso estimado', 'Costo estimado', 'Utilidad', 'Margen'].map(h => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(quotationData.byType).sort(([, a], [, b]) => b.revenue - a.revenue).map(([type, d]) => {
                const margin = d.revenue > 0 ? (d.revenue - d.cost) / d.revenue * 100 : 0
                return (
                  <tr key={type} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{SERVICE_L[type] ?? type}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{d.count}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{fmt(d.revenue)}</td>
                    <td className="px-4 py-3 text-red-500">{fmt(d.cost)}</td>
                    <td className="px-4 py-3 font-bold text-teal-700">{fmt(d.revenue - d.cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${margin >= 30 ? 'bg-green-500' : margin >= 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(margin, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${margin >= 30 ? 'text-green-700' : margin >= 20 ? 'text-amber-700' : 'text-red-600'}`}>
                          {fmtPct(margin)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {Object.keys(quotationData.byType).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin cotizaciones aprobadas para {yearFilter}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
