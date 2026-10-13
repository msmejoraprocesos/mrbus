import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, FileText, FileSignature, Briefcase, CalendarCheck, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Comercial — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const todayStr = new Date().toISOString().slice(0, 10)

  const [leadsRes, quotesRes, contractsRes, activitiesRes] = await Promise.all([
    supabase.from('leads').select('id, status').neq('status', 'lost').neq('status', 'won'),
    supabase.from('quotations').select('id, status, total_price'),
    supabase.from('contracts').select('id, status'),
    supabase.from('lead_actividades').select('id, completada, fecha').eq('completada', false).lte('fecha', todayStr),
  ])

  const leads = leadsRes.data ?? []
  const quotes = quotesRes.data ?? []
  const contracts = contractsRes.data ?? []
  const overdueActivities = activitiesRes.data ?? []

  const activeLeads = leads.length
  const pendingQuotes = quotes.filter(q => q.status === 'pending').length
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length
  const activeContracts = contracts.filter(c => c.status === 'active').length
  const pendingActivities = overdueActivities.length

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
  const pipelineValue = quotes.filter(q => q.status === 'approved').reduce((s, q) => s + (q.total_price ?? 0), 0)

  const modules = [
    {
      name: 'CRM',
      desc: 'Pipeline Kanban de leads. Del primer contacto hasta la firma.',
      href: '/comercial/crm',
      icon: Users,
      color: '#1D4ED8',
      bg: '#DBEAFE',
      stats: [`${activeLeads} prospectos activos`],
      alert: false,
    },
    {
      name: 'Cotizaciones',
      desc: 'Motor de cotización con costos reales y cálculo automático.',
      href: '/comercial/cotizacion',
      icon: FileText,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: [`${pendingQuotes} pendientes`, `${approvedQuotes} aprobadas`, fmt(pipelineValue) + ' en pipeline'],
      alert: false,
    },
    {
      name: 'Contratos',
      desc: 'Generación y seguimiento de contratos de servicio.',
      href: '/comercial/contratos',
      icon: FileSignature,
      color: '#0891B2',
      bg: '#ECFEFF',
      stats: [`${activeContracts} activos`],
      alert: false,
    },
    {
      name: 'Seguimiento',
      desc: 'Agenda comercial. Llamadas, citas y WhatsApps vinculados a leads.',
      href: '/comercial/seguimiento',
      icon: CalendarCheck,
      color: '#D97706',
      bg: '#FFFBEB',
      stats: [pendingActivities > 0 ? `${pendingActivities} actividades pendientes` : 'Sin actividades vencidas'],
      alert: pendingActivities > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Comercial</h1>
        <p className="text-sm text-slate-500 mt-0.5">Pipeline de ventas, cotizaciones y contratos de servicio</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Prospectos activos',  value: String(activeLeads),       color: '#1D4ED8', bg: '#DBEAFE', icon: Users },
          { label: 'Cotizaciones aprobadas', value: String(approvedQuotes), color: '#7C3AED', bg: '#EDE9FE', icon: FileText },
          { label: 'Contratos activos',   value: String(activeContracts),   color: '#0891B2', bg: '#ECFEFF', icon: FileSignature },
          { label: 'Actividades vencidas', value: String(pendingActivities), color: pendingActivities > 0 ? '#DC2626' : '#16A34A', bg: pendingActivities > 0 ? '#FFF1F2' : '#F0FDF4', icon: AlertTriangle },
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
