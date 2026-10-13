'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtPct } from '@/lib/utils/index'
import Link from 'next/link'
import { Monitor, RefreshCw, TrendingUp, Bus, DollarSign, Package } from 'lucide-react'

export default function DashboardsPage() {
  const supabase = createClient()
  const today = new Date()
  const [month, setMonth] = useState(today.toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  const [data, setData] = useState({
    trips: { total: 0, completed: 0, cancelled: 0, inTransit: 0 },
    pipeline: { total: 0, confirmed: 0, lost: 0, stages: {} as Record<string, number> },
    quotations: { count: 0, revenue: 0 },
    ar: { pending: 0, overdue: 0, cobrado: 0 },
    vehicles: { active: 0, maintenance: 0, total: 0 },
    drivers: { active: 0, inactive: 0, total: 0 },
    fuel: 0,
    packages: { total: 0, inTransit: 0, delivered: 0 },
  })

  const load = useCallback(async () => {
    setLoading(true)
    const from = `${month}-01`
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + 1); d.setDate(0)
    const to = d.toISOString().slice(0, 10)

    const [tripsR, leadsR, quotR, vehR, drvR, arR, fuelR, pkgR] = await Promise.all([
      supabase.from('trips').select('id,status').gte('departure_date', from).lte('departure_date', to),
      supabase.from('leads').select('id,pipeline_stage'),
      supabase.from('quotations').select('id,status,client_price').gte('created_at', from),
      supabase.from('vehicles').select('id,status'),
      supabase.from('drivers').select('id,status'),
      supabase.from('accounts_receivable').select('id,status,total_amount,paid_amount').gte('due_date', from).lte('due_date', to),
      supabase.from('fuel_loads').select('total_cost').gte('load_date', from).lte('load_date', to),
      supabase.from('shipping_orders').select('id,status').gte('created_at', from),
    ])

    const trips = tripsR.data ?? []
    const leads = leadsR.data ?? []
    const quots = quotR.data ?? []
    const vehs  = vehR.data ?? []
    const drvs  = drvR.data ?? []
    const ar    = arR.data ?? []
    const fuels = fuelR.data ?? []
    const pkgs  = pkgR.data ?? []

    const stages: Record<string, number> = {}
    leads.forEach((l: any) => { stages[l.pipeline_stage] = (stages[l.pipeline_stage] ?? 0) + 1 })

    setData({
      trips: {
        total: trips.length,
        completed: trips.filter((t: any) => t.status === 'completed').length,
        cancelled: trips.filter((t: any) => t.status === 'cancelled').length,
        inTransit: trips.filter((t: any) => t.status === 'in_transit').length,
      },
      pipeline: {
        total: leads.filter((l: any) => l.pipeline_stage !== 'lost').length,
        confirmed: (stages['confirmed'] ?? 0) + (stages['in_operation'] ?? 0),
        lost: stages['lost'] ?? 0,
        stages,
      },
      quotations: {
        count: quots.length,
        revenue: quots.reduce((s, q: any) => s + (q.client_price ?? 0), 0),
      },
      ar: {
        pending: ar.filter((r: any) => ['pending','partial'].includes(r.status)).reduce((s, r: any) => s + ((r.total_amount ?? 0) - (r.paid_amount ?? 0)), 0),
        overdue: ar.filter((r: any) => r.status === 'overdue').length,
        cobrado: ar.reduce((s, r: any) => s + (r.paid_amount ?? 0), 0),
      },
      vehicles: {
        active: vehs.filter((v: any) => v.status === 'active').length,
        maintenance: vehs.filter((v: any) => v.status === 'maintenance').length,
        total: vehs.length,
      },
      drivers: {
        active: drvs.filter((d: any) => d.status === 'active').length,
        inactive: drvs.filter((d: any) => d.status === 'inactive').length,
        total: drvs.length,
      },
      fuel: fuels.reduce((s, r: any) => s + (r.total_cost ?? 0), 0),
      packages: {
        total: pkgs.length,
        inTransit: pkgs.filter((p: any) => p.status === 'in_transit').length,
        delivered: pkgs.filter((p: any) => p.status === 'delivered').length,
      },
    })
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const PIPELINE_STAGES = [
    { key: 'lead', label: 'Lead', color: 'bg-slate-400' },
    { key: 'contacted', label: 'Contactado', color: 'bg-blue-400' },
    { key: 'quoted', label: 'Cotizado', color: 'bg-amber-400' },
    { key: 'negotiating', label: 'Negociando', color: 'bg-purple-400' },
    { key: 'confirmed', label: 'Confirmado', color: 'bg-green-500' },
    { key: 'in_operation', label: 'En operación', color: 'bg-emerald-500' },
  ]
  const maxStage = Math.max(...PIPELINE_STAGES.map(s => data.pipeline.stages[s.key] ?? 0), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Monitor size={20} className="text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Dashboard Ejecutivo</h1>
            <p className="text-xs text-slate-400">Vista C-Level — {new Date(month + '-02').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Viajes del mes', val: data.trips.total, sub: `${data.trips.completed} completados · ${data.trips.inTransit} en ruta`, icon: Bus, color: 'text-blue-700', bg: 'bg-blue-50', href: '/operacion/servicios' },
          { label: 'Pipeline activo', val: data.pipeline.total, sub: `${data.pipeline.confirmed} confirmados`, icon: TrendingUp, color: 'text-green-700', bg: 'bg-green-50', href: '/comercial/crm' },
          { label: 'Por cobrar', val: fmt(data.ar.pending), sub: `${data.ar.overdue} vencidos`, icon: DollarSign, color: 'text-amber-700', bg: 'bg-amber-50', href: '/finanzas/cxc' },
          { label: 'Paquetes', val: data.packages.total, sub: `${data.packages.inTransit} en tránsito`, icon: Package, color: 'text-purple-700', bg: 'bg-purple-50', href: '/paqueteria/entregas' },
        ].map(k => (
          <Link key={k.label} href={k.href}
            className={`block rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all ${k.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
              <k.icon size={14} className={k.color} />
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{loading ? '…' : k.val}</p>
            <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pipeline */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 text-sm">Pipeline de ventas</h2>
            <Link href="/comercial/crm" className="text-xs text-indigo-600 hover:underline">Ver CRM →</Link>
          </div>
          <div className="space-y-2.5">
            {PIPELINE_STAGES.map(s => {
              const count = data.pipeline.stages[s.key] ?? 0
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <p className="text-sm text-slate-600 w-28">{s.label}</p>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${s.color}`}
                      style={{ width: `${(count / maxStage) * 100}%` }} />
                  </div>
                  <p className="text-xs font-bold text-slate-700 w-6 text-right">{count}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fleet & financial snapshot */}
        <div className="space-y-3">
          {/* Fleet */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm">Estado de la flotilla</h2>
              <Link href="/flota/unidades" className="text-xs text-indigo-600 hover:underline">Ver flotilla →</Link>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Unidades activas', val: data.vehicles.active, color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'En mantenimiento', val: data.vehicles.maintenance, color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Operadores activos', val: data.drivers.active, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Inactivos', val: data.drivers.inactive, color: 'text-slate-400', bg: 'bg-slate-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg p-2 ${s.bg}`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financial snapshot */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm">Financiero del mes</h2>
              <Link href="/bi/rentabilidad" className="text-xs text-indigo-600 hover:underline">Ver P&L →</Link>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Cobrado', val: fmt(data.ar.cobrado), color: 'text-green-700' },
                { label: 'Por cobrar', val: fmt(data.ar.pending), color: 'text-amber-700' },
                { label: 'Costo combustible', val: fmt(data.fuel), color: 'text-red-600' },
                { label: 'Cotizaciones', val: `${data.quotations.count} · ${fmt(data.quotations.revenue)}`, color: 'text-indigo-700' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className={`font-semibold ${r.color}`}>{loading ? '…' : r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
