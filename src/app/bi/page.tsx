'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, TrendingUp, LayoutDashboard, Bell, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [todayTrips, setTodayTrips] = useState(0)
  const [activePipeline, setActivePipeline] = useState(0)
  const [approvedQuotes, setApprovedQuotes] = useState(0)
  const [criticalAlerts, setCriticalAlerts] = useState(0)
  const [pipelineRevenue, setPipelineRevenue] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const todayStr = new Date().toISOString().slice(0, 10)

    const [tripsRes, leadsRes, quotesRes, alertsRes, arRes] = await Promise.all([
      supabase.from('trips').select('id, status').gte('departure_date', todayStr),
      supabase.from('leads').select('id, status').neq('status', 'lost'),
      supabase.from('quotations').select('id, status, total_price').eq('status', 'approved'),
      supabase.from('compliance_alerts').select('id').lte('expires_at', new Date(Date.now() + 30 * 86400000).toISOString()),
      supabase.from('accounts_receivable').select('id, status').eq('status', 'overdue'),
    ])

    const trips = (tripsRes.data ?? []) as unknown as { id: string; status: string }[]
    const leads = (leadsRes.data ?? []) as unknown as { id: string; status: string }[]
    const quotes = (quotesRes.data ?? []) as unknown as { id: string; status: string; total_price: number | null }[]
    const alerts = (alertsRes.data ?? []) as unknown as { id: string }[]
    const overdueAR = (arRes.data ?? []) as unknown as { id: string; status: string }[]

    setTodayTrips(trips.length)
    setActivePipeline(leads.length)
    setApprovedQuotes(quotes.length)
    setCriticalAlerts(alerts.length + overdueAR.length)
    setPipelineRevenue(quotes.reduce((s, q) => s + (q.total_price ?? 0), 0))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  const modules = [
    {
      name: 'KPIs',
      desc: 'Indicadores clave en tiempo real: ocupación, ingresos, cumplimiento.',
      href: '/bi/kpi',
      icon: BarChart3,
      color: '#4338CA',
      bg: '#E0E7FF',
      stats: [`${todayTrips} viajes desde hoy`],
      alert: false,
    },
    {
      name: 'Rentabilidad',
      desc: 'Análisis de margen por ruta, cliente y tipo de servicio.',
      href: '/bi/rentabilidad',
      icon: TrendingUp,
      color: '#16A34A',
      bg: '#F0FDF4',
      stats: [`${approvedQuotes} cotizaciones aprobadas`, fmt(pipelineRevenue) + ' en pipeline'],
      alert: false,
    },
    {
      name: 'Dashboards',
      desc: 'Tableros ejecutivos. Resumen gerencial con indicadores clave.',
      href: '/bi/dashboards',
      icon: LayoutDashboard,
      color: '#0891B2',
      bg: '#ECFEFF',
      stats: [`${activePipeline} prospectos activos`],
      alert: false,
    },
    {
      name: 'Alertas',
      desc: 'Documentos por vencer, servicios sin asignar y pagos vencidos.',
      href: '/bi/alertas',
      icon: Bell,
      color: '#DC2626',
      bg: '#FFF1F2',
      stats: [`${criticalAlerts} alertas activas`],
      alert: criticalAlerts > 0,
    },
  ]

  if (loading) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inteligencia de Negocio</h1>
          <p className="text-sm text-slate-500 mt-0.5">KPIs operativos, rentabilidad por ruta y alertas automáticas</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Viajes desde hoy',      value: String(todayTrips),       color: '#4338CA', bg: '#E0E7FF', icon: BarChart3 },
          { label: 'Prospectos activos',     value: String(activePipeline),   color: '#0891B2', bg: '#ECFEFF', icon: LayoutDashboard },
          { label: 'Cotizaciones aprobadas', value: String(approvedQuotes),   color: '#16A34A', bg: '#F0FDF4', icon: TrendingUp },
          { label: 'Alertas críticas',       value: String(criticalAlerts),   color: criticalAlerts > 0 ? '#DC2626' : '#16A34A', bg: criticalAlerts > 0 ? '#FFF1F2' : '#F0FDF4', icon: Bell },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(m => (
          <Link key={m.name} href={m.href}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
              <m.icon size={18} style={{ color: m.color }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">{m.name}</h3>
                {m.alert && <AlertTriangle size={12} className="text-amber-500" />}
              </div>
              <p className="text-xs text-slate-500 mb-2">{m.desc}</p>
              <div className="flex flex-wrap gap-2">
                {m.stats.map(s => (
                  <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
