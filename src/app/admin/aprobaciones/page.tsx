'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { CheckCircle, XCircle, Clock, Search, Filter, RefreshCw, AlertTriangle, ChevronRight, List, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient()

type Solicitud = {
  id: string; module: string; record_id: string; record_type: string
  amount?: number; description: string; requested_by: string
  required_role: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by?: string; approved_at?: string; rejected_reason?: string
  record_data?: Record<string, unknown>; created_at: string
}

const MODULE_LABEL: Record<string,string> = {
  purchase_order:      'Orden de Compra',
  cxp_payment:         'Pago CXP',
  liquidacion:         'Liquidación',
  nomina:              'Nómina',
  inventory_adjustment:'Ajuste Inventario',
  maintenance_order:   'Orden Mantenimiento',
  vacation:            'Vacaciones',
}

const MODULE_COLOR: Record<string,string> = {
  purchase_order:      'bg-purple-100 text-purple-700',
  cxp_payment:         'bg-teal-100 text-teal-700',
  liquidacion:         'bg-red-100 text-red-700',
  nomina:              'bg-blue-100 text-blue-700',
  inventory_adjustment:'bg-orange-100 text-orange-700',
  maintenance_order:   'bg-amber-100 text-amber-700',
  vacation:            'bg-pink-100 text-pink-700',
}

const STATUS_COLOR: Record<string,string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export default function AprobacionesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [tab, setTab] = useState<'pendientes'|'historial'>('pendientes')
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('todos')
  const [selected, setSelected] = useState<Solicitud|null>(null)
  const [rechazarReason, setRechazarReason] = useState('')
  const [showRechazar, setShowRechazar] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'lista'|'kanban'>('lista')
  const [kanbanBannerDismissed, setKanbanBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem('aprobaciones_kanban_banner_dismissed') === '1' } catch { return false }
  })

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setSolicitudes((data ?? []) as Solicitud[])
  }, [])

  useEffect(() => { load() }, [load])

  const pendientes = solicitudes.filter(s => s.status === 'pending')
  const historial = solicitudes.filter(s => s.status !== 'pending')

  const displayList = (tab === 'pendientes' ? pendientes : historial).filter(s => {
    const q = search.toLowerCase()
    const matchQ = !q || s.description.toLowerCase().includes(q) || s.requested_by.toLowerCase().includes(q)
    const matchM = filterModule === 'todos' || s.module === filterModule
    return matchQ && matchM
  })

  // KPIs
  const totalPendiente = pendientes.reduce((s,r) => s + (r.amount ?? 0), 0)
  const urgentes = pendientes.filter(s => {
    const hrs = (Date.now() - new Date(s.created_at).getTime()) / 3600000
    return hrs > 24
  }).length
  const aprobHoy = historial.filter(s => s.approved_at && s.approved_at.slice(0,10) === new Date().toISOString().slice(0,10) && s.status === 'approved').length

  async function aprobar(s: Solicitud) {
    if (s.amount && s.amount > 50000 && pinInput.length < 4) {
      toast.error('Se requiere PIN para montos mayores a $50,000'); return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('approval_requests').update({
        status: 'approved',
        approved_by: 'Sistema',
        approved_at: new Date().toISOString(),
        pin_verified: pinInput.length >= 4,
      }).eq('id', s.id)
      if (error) throw error

      await auditLog({ action: 'APPROVE', module: 'APROBACIONES', table_name: 'approval_requests', record_id: s.id, record_folio: s.record_id })
      toast.success(`Aprobado: ${s.description}`)
      setPinInput('')
      setSelected(null)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally { setLoading(false) }
  }

  async function rechazar(s: Solicitud) {
    if (!rechazarReason.trim()) { toast.error('Ingresa motivo de rechazo'); return }
    setLoading(true)
    try {
      await supabase.from('approval_requests').update({
        status: 'rejected',
        approved_by: 'Sistema',
        approved_at: new Date().toISOString(),
        rejected_reason: rechazarReason,
      }).eq('id', s.id)
      await auditLog({ action: 'REJECT', module: 'APROBACIONES', table_name: 'approval_requests', record_id: s.id, record_folio: s.record_id })
      toast.success('Solicitud rechazada')
      setRechazarReason('')
      setShowRechazar(false)
      setSelected(null)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally { setLoading(false) }
  }

  function tiempoEspera(created_at: string) {
    const hrs = Math.round((Date.now() - new Date(created_at).getTime()) / 3600000)
    if (hrs < 1) return 'Hace momentos'
    if (hrs < 24) return `${hrs}h`
    return `${Math.round(hrs / 24)}d`
  }

  function dismissKanbanBanner() {
    try { localStorage.setItem('aprobaciones_kanban_banner_dismissed', '1') } catch {}
    setKanbanBannerDismissed(true)
  }

  const kanbanColumns = [
    { key: 'pending',   label: 'Pendiente',  dot: 'bg-amber-400', bg: 'bg-amber-50/40',   border: 'border-amber-100' },
    { key: 'approved',  label: 'Aprobado',   dot: 'bg-green-500', bg: 'bg-green-50/40',   border: 'border-green-100' },
    { key: 'rejected',  label: 'Rechazado',  dot: 'bg-red-500',   bg: 'bg-red-50/30',     border: 'border-red-100' },
    { key: 'cancelled', label: 'Cancelado',  dot: 'bg-slate-400', bg: 'bg-slate-50/40',   border: 'border-slate-100' },
  ] as const

  const kanbanFiltered = solicitudes.filter(s => {
    const q = search.toLowerCase()
    return !q || s.description.toLowerCase().includes(q) || s.requested_by.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">✅</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Aprobaciones</h1>
            <p className="text-sm text-slate-500">Cola de autorizaciones pendientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
            <button onClick={() => setView('lista')} className={`px-3 py-1.5 flex items-center gap-1 ${view==='lista' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <List size={13}/> Lista
            </button>
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 flex items-center gap-1 ${view==='kanban' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <LayoutGrid size={13}/> Kanban
            </button>
          </div>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Pendientes', val: String(pendientes.length), color: pendientes.length > 0 ? 'text-amber-700' : 'text-slate-500', bg: pendientes.length > 0 ? 'bg-amber-50' : 'bg-slate-50' },
          { label:'Monto total pend.', val: fmt(totalPendiente), color:'text-red-700', bg:'bg-red-50' },
          { label:'Urgentes (+24h)', val: String(urgentes), color: urgentes > 0 ? 'text-red-700' : 'text-slate-500', bg: urgentes > 0 ? 'bg-red-50' : 'bg-slate-50' },
          { label:'Aprobados hoy', val: String(aprobHoy), color:'text-green-700', bg:'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={cn('rounded-xl border border-slate-100 p-4', k.bg)}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn('text-xl font-bold mt-1', k.color)}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Search (always visible) */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripción, solicitante…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        {view === 'lista' && (
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
            <option value="todos">Todos los módulos</option>
            {Object.entries(MODULE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
      </div>

      {view === 'lista' ? (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit text-sm">
            {(['pendientes','historial'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-4 py-1.5 rounded-md font-medium transition-colors',
                  tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {t === 'pendientes' ? `Pendientes (${pendientes.length})` : 'Historial'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-2">
            {displayList.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
                <CheckCircle size={36} className="mx-auto mb-2 text-green-300" />
                <p>{tab === 'pendientes' ? 'No hay solicitudes pendientes' : 'Sin historial'}</p>
              </div>
            ) : displayList.map(s => {
              const isUrgente = (Date.now() - new Date(s.created_at).getTime()) > 24 * 3600000 && s.status === 'pending'
              return (
                <div key={s.id}
                  className={cn('bg-white rounded-xl border shadow-sm p-4 hover:border-amber-200 transition-colors cursor-pointer',
                    isUrgente ? 'border-red-200 bg-red-50/20' : 'border-slate-100')}
                  onClick={() => setSelected(s === selected ? null : s)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', MODULE_COLOR[s.module] ?? 'bg-slate-100 text-slate-600')}>
                          {MODULE_LABEL[s.module] ?? s.module}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', STATUS_COLOR[s.status])}>
                          {s.status === 'pending' ? 'Pendiente' : s.status === 'approved' ? 'Aprobado' : s.status === 'rejected' ? 'Rechazado' : 'Cancelado'}
                        </span>
                        {isUrgente && <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertTriangle size={11} /> Urgente</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{s.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span>Solicitado por: <span className="font-medium text-slate-700">{s.requested_by}</span></span>
                        <span>Rol req: <span className="font-medium text-slate-700">{s.required_role}</span></span>
                        <span className={cn(isUrgente && 'text-red-600 font-semibold')}>{tiempoEspera(s.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {s.amount ? <p className="text-base font-bold text-slate-800">{fmt(s.amount)}</p> : null}
                      {s.status === 'approved' && <p className="text-xs text-green-600 mt-1">✓ {s.approved_by}</p>}
                      {s.status === 'rejected' && <p className="text-xs text-red-500 mt-1">✗ Rechazado</p>}
                    </div>
                    <ChevronRight size={16} className={cn('text-slate-300 mt-1 transition-transform', selected?.id === s.id && 'rotate-90')} />
                  </div>

                  {/* Expandable detail + actions */}
                  {selected?.id === s.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                      {/* Record data preview */}
                      {s.record_data && Object.keys(s.record_data).length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs">
                          <p className="font-semibold text-slate-600 mb-2">Datos del registro:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(s.record_data).slice(0, 9).map(([k, v]) => (
                              <div key={k}>
                                <span className="text-slate-400 capitalize">{k.replace(/_/g,' ')}:</span>
                                <span className="font-medium text-slate-700 ml-1">{String(v ?? '—')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {s.status === 'rejected' && s.rejected_reason && (
                        <div className="bg-red-50 rounded-lg p-3 mb-4 text-sm">
                          <span className="text-xs text-red-500 font-semibold">Motivo de rechazo:</span>
                          <p className="text-red-700 mt-0.5">{s.rejected_reason}</p>
                        </div>
                      )}

                      {s.status === 'pending' && (
                        <div className="space-y-3">
                          {s.amount && s.amount > 50000 && (
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">PIN de autorización (montos &gt; $50,000)</label>
                              <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)}
                                className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                placeholder="PIN" />
                            </div>
                          )}

                          {showRechazar && (
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de rechazo *</label>
                              <textarea value={rechazarReason} onChange={e => setRechazarReason(e.target.value)} rows={2}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                                placeholder="Explica por qué se rechaza…" />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button onClick={() => aprobar(s)} disabled={loading}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
                              <CheckCircle size={14} /> Aprobar
                            </button>
                            {!showRechazar ? (
                              <button onClick={() => setShowRechazar(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200">
                                <XCircle size={14} /> Rechazar
                              </button>
                            ) : (
                              <>
                                <button onClick={() => rechazar(s)} disabled={loading}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                                  Confirmar rechazo
                                </button>
                                <button onClick={() => { setShowRechazar(false); setRechazarReason('') }}
                                  className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200">
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {/* Kanban guide banner */}
          {!kanbanBannerDismissed && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                Las solicitudes con monto mayor a $50,000 requieren PIN de autorización del Director.
              </span>
              <button onClick={dismissKanbanBanner} className="ml-4 text-amber-500 hover:text-amber-700 text-lg leading-none font-bold shrink-0">×</button>
            </div>
          )}

          {/* Kanban board */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map(col => {
              const cards = kanbanFiltered.filter(s => s.status === col.key)
              return (
                <div key={col.key} className={cn('rounded-xl border p-3 flex flex-col gap-3', col.bg, col.border)}>
                  {/* Column header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', col.dot)} />
                      <span className="text-xs font-semibold text-slate-700">{col.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white rounded-full px-2 py-0.5 border border-slate-100">{cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-0.5">
                    {cards.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-6">Sin solicitudes</div>
                    )}
                    {cards.map(s => {
                      const isUrgente = (Date.now() - new Date(s.created_at).getTime()) > 24 * 3600000 && s.status === 'pending'
                      return (
                        <div key={s.id}
                          className={cn('bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:border-amber-200 transition-colors',
                            isUrgente ? 'border-red-200' : 'border-slate-100')}
                          onClick={() => setSelected(s === selected ? null : s)}>
                          {/* Module badge */}
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', MODULE_COLOR[s.module] ?? 'bg-slate-100 text-slate-600')}>
                            {MODULE_LABEL[s.module] ?? s.module}
                          </span>

                          {/* Description */}
                          <p className="text-xs font-semibold text-slate-800 mt-2 line-clamp-2">{s.description}</p>

                          {/* Amount */}
                          {s.amount ? <p className="text-sm font-bold text-slate-800 mt-1">{fmt(s.amount)}</p> : null}

                          {/* Meta */}
                          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                            <span className="truncate max-w-[70%]">{s.requested_by}</span>
                            <span className={cn(isUrgente && 'text-red-600 font-semibold')}>{tiempoEspera(s.created_at)}</span>
                          </div>

                          {/* Urgente badge */}
                          {isUrgente && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold mt-1.5">
                              <AlertTriangle size={10} /> Urgente
                            </span>
                          )}

                          {/* Inline actions for pending */}
                          {s.status === 'pending' && (
                            <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => aprobar(s)}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50 transition-colors">
                                <CheckCircle size={11} /> Aprobar
                              </button>
                              <button
                                onClick={() => { setSelected(s); setShowRechazar(true) }}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 transition-colors">
                                <XCircle size={11} /> Rechazar
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Rechazar modal — shared between both views */}
      {showRechazar && selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowRechazar(false); setRechazarReason('') }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Rechazar solicitud</h2>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{selected.description}</p>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de rechazo *</label>
            <textarea value={rechazarReason} onChange={e => setRechazarReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              placeholder="Explica por qué se rechaza…" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowRechazar(false); setRechazarReason('') }}
                className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200">Cancelar</button>
              <button onClick={() => rechazar(selected)} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reglas de aprobación info */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-1">Reglas de aprobación:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            ['OC hasta $10,000', 'Supervisor'],
            ['OC $10,001–$50,000', 'Manager'],
            ['OC +$50,000', 'Director + PIN'],
            ['Pagos CXP hasta $25,000', 'Finanzas'],
            ['Pagos CXP +$25,000', 'Director + PIN'],
            ['Nómina', 'Director'],
            ['Liquidaciones', 'Manager'],
            ['Ajuste inventario', 'Supervisor'],
          ].map(([desc, rol]) => (
            <div key={desc} className="flex items-center justify-between bg-white rounded px-2 py-1 border border-slate-100">
              <span>{desc}</span>
              <span className="font-semibold text-slate-700 ml-2">{rol}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
