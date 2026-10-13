'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FileText, RefreshCw, List, Kanban, Info } from 'lucide-react'
import { fmt, fmtDate, cn } from '@/lib/utils/index'

type Contract = {
  id: string
  contract_number: string
  total_amount: number | null
  advance_amount: number | null
  status: string
  valid_from: string | null
  valid_until: string | null
  lead?: { first_name: string; last_name: string; company?: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-green-100 text-green-700', active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-500', cancelled: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviado', signed: 'Firmado',
  active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
}

const KANBAN_COLS: { key: string; label: string; header: string; bg: string }[] = [
  { key: 'draft',     label: 'Borrador',   header: 'bg-slate-100', bg: 'bg-slate-50/50' },
  { key: 'sent',      label: 'Enviado',    header: 'bg-blue-100',  bg: 'bg-blue-50/30' },
  { key: 'signed',    label: 'Firmado',    header: 'bg-green-100', bg: 'bg-green-50/30' },
  { key: 'active',    label: 'Activo',     header: 'bg-emerald-100', bg: 'bg-emerald-50/30' },
  { key: 'completed', label: 'Completado', header: 'bg-gray-100',  bg: 'bg-gray-50/30' },
  { key: 'cancelled', label: 'Cancelado',  header: 'bg-red-100',   bg: 'bg-red-50/30' },
]

export default function ContractsPage() {
  const supabase = createClient()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState<'lista'|'kanban'>('lista')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('contracts')
      .select('*, lead:leads(first_name,last_name,company)')
      .order('created_at', { ascending: false }).limit(100)
    setContracts((data ?? []) as unknown as Contract[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active   = contracts.filter(c => c.status === 'active').length
  const signed   = contracts.filter(c => c.status === 'signed').length
  const totalVal = contracts.filter(c => ['active', 'signed'].includes(c.status))
    .reduce((s, c) => s + (c.total_amount ?? 0), 0)

  const filtered = statusFilter === 'all' ? contracts : contracts.filter(c => c.status === statusFilter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FileText size={20} className="text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Contratos</h1>
            <p className="text-xs text-slate-400">{contracts.length} contratos registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/comercial/cotizacion/list" className="text-sm text-indigo-600 hover:underline">Ver cotizaciones →</Link>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Activos', val: active, bg: 'bg-emerald-50', tc: 'text-emerald-700', f: 'active' },
          { label: 'Firmados', val: signed, bg: 'bg-green-50', tc: 'text-green-700', f: 'signed' },
          { label: 'Valor activos', val: fmt(totalVal), bg: 'bg-indigo-50', tc: 'text-indigo-700', f: 'all' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.f)}
            className={`text-left rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${s.bg} ${statusFilter === s.f ? 'ring-2 ring-slate-400' : 'border-slate-100'}`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tc}`}>{s.val}</p>
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit text-sm">
        <button onClick={() => setView('lista')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
            view === 'lista' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          <List size={14} /> Lista
        </button>
        <button onClick={() => setView('kanban')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
            view === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
          <Kanban size={14} /> Kanban
        </button>
      </div>

      {/* Guide banner (kanban only) */}
      {view === 'kanban' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Info size={15} className="shrink-0 text-amber-600" />
          Los contratos <span className="font-semibold">Firmados</span> deben activarse una vez que comience el servicio.
        </div>
      )}

      {/* LISTA */}
      {view === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <FileText size={40} className="mb-3 opacity-30" />
              <p>{contracts.length === 0 ? 'No hay contratos aún' : 'Sin contratos para el filtro'}</p>
              {contracts.length === 0 && (
                <p className="text-xs mt-1">Los contratos se generan desde una cotización aprobada</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b bg-indigo-50">
                    {['Número', 'Cliente', 'Monto total', 'Anticipo', 'Estado', 'Vigencia', ''].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(c => {
                    const lead = Array.isArray(c.lead) ? (c.lead as any)[0] : c.lead
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 group">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{c.contract_number}</td>
                        <td className="px-4 py-3">
                          {lead
                            ? <div><p className="font-medium text-slate-900">{lead.first_name} {lead.last_name}</p>{lead.company && <p className="text-xs text-slate-400">{lead.company}</p>}</div>
                            : <span className="text-slate-400 text-xs">Sin cliente</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{fmt(c.total_amount ?? 0)}</td>
                        <td className="px-4 py-3 text-slate-600">{fmt(c.advance_amount ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-500')}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {c.valid_from && c.valid_until
                            ? `${fmtDate(c.valid_from)} → ${fmtDate(c.valid_until)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/comercial/contratos/${c.id}`} className="text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100">Ver →</Link>
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

      {/* KANBAN */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="flex gap-3 min-w-max">
              {KANBAN_COLS.map(col => {
                const cards = contracts.filter(c => c.status === col.key)
                return (
                  <div key={col.key} className={cn('w-64 rounded-xl border border-slate-200 overflow-hidden flex flex-col', col.bg)}>
                    <div className={cn('px-3 py-2.5 flex items-center justify-between', col.header)}>
                      <span className="text-xs font-semibold text-slate-700">{col.label}</span>
                      <span className="text-xs font-bold text-slate-600 bg-white/70 rounded-full px-2 py-0.5">{cards.length}</span>
                    </div>
                    <div className="p-2 space-y-2 flex-1">
                      {cards.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">Sin contratos</p>
                      )}
                      {cards.map(c => {
                        const lead = Array.isArray(c.lead) ? (c.lead as any)[0] : c.lead
                        return (
                          <Link key={c.id} href={`/comercial/contratos/${c.id}`}
                            className="block bg-white rounded-lg border border-slate-100 p-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all space-y-1.5">
                            <span className="font-mono text-xs text-indigo-700 font-semibold">{c.contract_number}</span>
                            {lead && (
                              <div>
                                <p className="text-xs font-semibold text-slate-800 truncate">{lead.first_name} {lead.last_name}</p>
                                {lead.company && <p className="text-[10px] text-slate-400 truncate">{lead.company}</p>}
                              </div>
                            )}
                            <p className="text-sm font-bold text-slate-900">{fmt(c.total_amount ?? 0)}</p>
                            {(c.valid_from || c.valid_until) && (
                              <p className="text-[10px] text-slate-400">
                                {c.valid_from ? fmtDate(c.valid_from) : '?'} → {c.valid_until ? fmtDate(c.valid_until) : '?'}
                              </p>
                            )}
                            <span className={cn('inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold', STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-500')}>
                              {STATUS_LABELS[c.status] ?? c.status}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
