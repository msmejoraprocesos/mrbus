'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, FileText, RefreshCw } from 'lucide-react'
import { fmt, fmtDate, cn } from '@/lib/utils/index'

type Quotation = {
  id: string
  version: number
  service_type: string
  status: string
  client_price: number | null
  created_at: string
  lead?: { first_name: string; last_name: string; company?: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada',
}
const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B', agency_b2c: 'Agencia B2C', personnel: 'Personal',
  rental: 'Renta', executive: 'Ejecutivo', parcel_in_trip: 'Paquetería',
}

export default function QuotationsListPage() {
  const supabase = createClient()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('quotations')
      .select('*, lead:leads(first_name,last_name,company)')
      .order('created_at', { ascending: false }).limit(200)
    setQuotations((data ?? []) as unknown as Quotation[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approved  = quotations.filter(q => q.status === 'approved').length
  const sent      = quotations.filter(q => q.status === 'sent').length
  const revenue   = quotations.filter(q => q.status === 'approved').reduce((s, q) => s + (q.client_price ?? 0), 0)

  const filtered = quotations
    .filter(q => statusFilter === 'all' || q.status === statusFilter)
    .filter(q => {
      if (!search) return true
      const lead = Array.isArray(q.lead) ? (q.lead as any)[0] : q.lead
      return (lead?.first_name + ' ' + lead?.last_name + ' ' + (lead?.company ?? '')).toLowerCase().includes(search.toLowerCase())
    })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FileText size={20} className="text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cotizaciones</h1>
            <p className="text-xs text-slate-400">{quotations.length} cotizaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar cliente…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-44"
          />
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/comercial/cotizacion" className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            <Plus size={14} /> Nueva
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aprobadas', val: approved, bg: 'bg-green-50', tc: 'text-green-700', f: 'approved' },
          { label: 'Enviadas', val: sent, bg: 'bg-blue-50', tc: 'text-blue-700', f: 'sent' },
          { label: 'Ingresos aprobados', val: fmt(revenue), bg: 'bg-indigo-50', tc: 'text-indigo-700', f: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${statusFilter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tc}`}>{s.val}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <FileText size={40} className="mb-3 opacity-30" />
            <p>{quotations.length === 0 ? 'No hay cotizaciones aún' : 'Sin resultados para el filtro'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-indigo-50">
                  {['Cliente', 'Servicio', 'V#', 'Precio', 'Estado', 'Fecha', ''].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(q => {
                  const lead = Array.isArray(q.lead) ? (q.lead as any)[0] : q.lead
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 group">
                      <td className="px-4 py-3">
                        {lead
                          ? <div><p className="font-medium text-slate-900">{lead.first_name} {lead.last_name}</p>{lead.company && <p className="text-xs text-slate-400">{lead.company}</p>}</div>
                          : <span className="text-slate-400 text-xs">Sin lead</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{SERVICE_LABELS[q.service_type] ?? q.service_type}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded font-bold">V{q.version}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{fmt(q.client_price ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', STATUS_COLORS[q.status] ?? 'bg-slate-100 text-slate-500')}>
                          {STATUS_LABELS[q.status] ?? q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(q.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/comercial/cotizacion/${q.id}`} className="text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100">Ver →</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
