'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'
import { Plus, Search, TrendingUp, AlertTriangle, CheckCircle, ChevronRight, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient()

type CXC = {
  id: string; folio: string; client_name: string; client_rfc?: string
  client_email?: string; client_phone?: string; document_type: string
  document_number?: string; concepto: string; amount: number; paid_amount: number
  issue_date: string; due_date: string; payment_date?: string
  trip_id?: string; trip_number?: string; contract_id?: string; contract_number?: string
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  notas?: string; created_at: string
}

type Cobro = {
  id: string; cxc_id: string; fecha: string; monto: number
  metodo: string; referencia: string; notas?: string
}

type BankAccount = { id: string; nombre: string; banco: string; saldo: number }

const DOC_TIPOS = ['Factura','Anticipo','Complemento de pago','Nota de crédito','Contrato','Otro']
const METODOS = ['Transferencia','SPEI','Cheque','Efectivo','Tarjeta','Domiciliación']
const STATUS_LABEL: Record<string,string> = { pending:'Pendiente', partial:'Parcial', paid:'Cobrado', overdue:'Vencido', cancelled:'Cancelado' }
const STATUS_COLOR: Record<string,string> = {
  pending:   'bg-amber-100 text-amber-700',
  partial:   'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

function emptyForm(): Partial<CXC> {
  return {
    client_name: '', client_rfc: '', client_email: '', client_phone: '',
    document_type: 'Factura', concepto: '', amount: 0, paid_amount: 0,
    issue_date: new Date().toISOString().slice(0,10), due_date: '',
    status: 'pending', notas: ''
  }
}

function computeStatus(r: any): CXC['status'] {
  const saldo = (r.amount ?? 0) - (r.paid_amount ?? 0)
  if (saldo <= 0.01) return 'paid'
  if (r.status === 'cancelled') return 'cancelled'
  const vence = r.due_date
  if (vence && new Date(vence) < new Date()) return 'overdue'
  if ((r.paid_amount ?? 0) > 0) return 'partial'
  if (r.status === 'partial') return 'partial'
  return 'pending'
}

export default function CXCPage() {
  const [tab, setTab] = useState<'lista'|'nueva'|'detalle'|'cobro'>('lista')
  const [cxcs, setCXCs] = useState<CXC[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [cuentas, setCuentas] = useState<BankAccount[]>([])
  const [selected, setSelected] = useState<CXC|null>(null)
  const [form, setForm] = useState<Partial<CXC>>(emptyForm())
  const [cobroForm, setCobroForm] = useState({ monto: 0, metodo: 'Transferencia', referencia: '', cuenta_destino: '', notas: '' })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const [{ data: c }, { data: co }, { data: ba }] = await Promise.all([
      supabase.from('accounts_receivable').select('*, trip:trips(trip_number), contract:contracts(contract_number)').order('due_date'),
      supabase.from('cxc_cobros').select('*').order('fecha', { ascending: false }),
      supabase.from('bank_accounts').select('id,nombre,banco,saldo').eq('activa', true),
    ])
    const mapped = (c ?? []).map((r: any) => ({
      id: r.id,
      folio: r.folio ?? r.document_number ?? `CXC-${r.id.slice(0,6).toUpperCase()}`,
      client_name: r.client_name ?? '',
      client_rfc: r.client_rfc,
      client_email: r.client_email,
      client_phone: r.client_phone,
      document_type: r.document_type ?? 'Factura',
      document_number: r.document_number,
      concepto: r.concepto ?? r.concept ?? r.description ?? '',
      amount: r.amount ?? 0,
      paid_amount: r.paid_amount ?? 0,
      issue_date: r.issue_date ?? r.created_at?.slice(0,10) ?? '',
      due_date: r.due_date ?? '',
      payment_date: r.payment_date,
      trip_number: r.trip?.trip_number,
      contract_number: r.contract?.contract_number,
      status: computeStatus(r),
      notas: r.notes ?? r.notas,
      created_at: r.created_at,
    })) as CXC[]
    setCXCs(mapped)
    setCobros((co ?? []) as Cobro[])
    setCuentas(ba ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = cxcs.filter(c => {
    const q = search.toLowerCase()
    const match = !q || c.client_name.toLowerCase().includes(q) || c.folio.toLowerCase().includes(q) || (c.concepto ?? '').toLowerCase().includes(q)
    const matchS = filterStatus === 'todos' || c.status === filterStatus
    return match && matchS
  })

  // KPIs
  const hoy = new Date()
  const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const porCobrar = cxcs.filter(c => ['pending','partial','overdue'].includes(c.status)).reduce((s,c) => s + c.amount - c.paid_amount, 0)
  const vencido = cxcs.filter(c => c.status === 'overdue').reduce((s,c) => s + c.amount - c.paid_amount, 0)
  const cobradoMes = cxcs.filter(c => c.status === 'paid' && c.payment_date && new Date(c.payment_date) >= mesInicio).reduce((s,c) => s + c.amount, 0)
  const vence7 = cxcs.filter(c => {
    if (!['pending','partial'].includes(c.status)) return false
    const d = new Date(c.due_date)
    return d >= hoy && d <= new Date(hoy.getTime() + 7*86400000)
  }).length

  async function guardar() {
    if (!form.client_name || !form.amount || !form.due_date) { toast.error('Completa los campos requeridos'); return }
    setLoading(true)
    try {
      const folio = await getNextFolio('cxc')
      const payload = {
        folio, client_name: form.client_name, client_rfc: form.client_rfc,
        client_email: form.client_email, client_phone: form.client_phone,
        document_type: form.document_type, document_number: folio,
        concepto: form.concepto, concept: form.concepto,
        amount: form.amount, paid_amount: 0,
        issue_date: form.issue_date, due_date: form.due_date,
        status: 'pending', notes: form.notas, notas: form.notas,
      }
      const { data, error } = await supabase.from('accounts_receivable').insert(payload).select().single()
      if (error) throw error
      await auditLog({ action: 'INSERT', module: 'CXC', table_name: 'accounts_receivable', record_id: data.id, record_folio: folio })
      toast.success(`CXC ${folio} registrada`)
      setForm(emptyForm())
      setTab('lista')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally { setLoading(false) }
  }

  async function registrarCobro() {
    if (!selected) return
    if (!cobroForm.monto || cobroForm.monto <= 0) { toast.error('Monto inválido'); return }
    const saldo = selected.amount - selected.paid_amount
    if (cobroForm.monto > saldo + 0.01) { toast.error(`El cobro supera el saldo (${fmt(saldo)})`); return }
    setLoading(true)
    try {
      const newPagado = selected.paid_amount + cobroForm.monto
      const newStatus = newPagado >= selected.amount - 0.01 ? 'paid' : 'partial'

      const { data: co, error: ce } = await supabase.from('cxc_cobros').insert({
        cxc_id: selected.id, fecha: new Date().toISOString().slice(0,10),
        monto: cobroForm.monto, metodo: cobroForm.metodo,
        referencia: cobroForm.referencia, notas: cobroForm.notas || null,
      }).select().single()
      if (ce) throw ce

      const updatePayload: any = { paid_amount: newPagado, status: newStatus }
      if (newStatus === 'paid') updatePayload.payment_date = new Date().toISOString().slice(0,10)
      await supabase.from('accounts_receivable').update(updatePayload).eq('id', selected.id)

      // Credit to bank account
      if (cobroForm.cuenta_destino) {
        const cuenta = cuentas.find(c => c.id === cobroForm.cuenta_destino)
        if (cuenta) {
          await supabase.from('bank_accounts').update({ saldo: cuenta.saldo + cobroForm.monto }).eq('id', cuenta.id)
          await supabase.from('bank_movements').insert({
            cuenta_id: cobroForm.cuenta_destino, fecha: new Date().toISOString().slice(0,10),
            descripcion: `Cobro CXC ${selected.folio} - ${selected.client_name}`,
            tipo: 'ingreso', monto: cobroForm.monto, referencia: cobroForm.referencia,
            categoria: 'Cobranza', conciliado: false,
          })
        }
      }

      await auditLog({ action: 'UPDATE', module: 'CXC', table_name: 'accounts_receivable', record_id: selected.id, record_folio: selected.folio })
      toast.success('Cobro registrado')
      setCobroForm({ monto: 0, metodo: 'Transferencia', referencia: '', cuenta_destino: '', notas: '' })
      setTab('lista')
      setSelected(null)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally { setLoading(false) }
  }

  const cobrosDe = selected ? cobros.filter(c => c.cxc_id === selected.id) : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">📈</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cuentas por Cobrar</h1>
            <p className="text-sm text-slate-500">{cxcs.length} registros</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyForm()); setTab('nueva') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
          <Plus size={15} /> Nueva CXC
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Por cobrar', val: fmt(porCobrar), color:'text-amber-700', bg:'bg-amber-50' },
          { label:'Vencido', val: fmt(vencido), color:'text-red-700', bg:'bg-red-50' },
          { label:'Vence en 7d', val: String(vence7), color:'text-orange-700', bg:'bg-orange-50' },
          { label:'Cobrado este mes', val: fmt(cobradoMes), color:'text-green-700', bg:'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={cn('rounded-xl border border-slate-100 p-4', k.bg)}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn('text-xl font-bold mt-1', k.color)}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit text-sm">
        {(['lista','nueva'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-md font-medium transition-colors capitalize',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'lista' ? 'Lista CXC' : 'Nueva CXC'}
          </button>
        ))}
        {selected && tab === 'detalle' && <button className="px-4 py-1.5 rounded-md font-medium bg-white text-slate-800 shadow-sm">Detalle</button>}
        {selected && tab === 'cobro' && <button className="px-4 py-1.5 rounded-md font-medium bg-white text-teal-700 shadow-sm">Registrar Cobro</button>}
      </div>

      {/* LISTA */}
      {tab === 'lista' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, folio, concepto…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="todos">Todos</option>
              {Object.entries(STATUS_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase bg-teal-50 border-b">
                    {['Folio','Cliente','Tipo','Concepto','Monto','Saldo','Vence','Estado','Acciones'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Sin registros</td></tr>
                  ) : filtered.map(c => {
                    const saldo = c.amount - c.paid_amount
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 cursor-pointer"
                        onClick={() => { setSelected(c); setTab('detalle') }}>
                        <td className="px-4 py-3 font-mono text-xs text-teal-700 font-semibold">{c.folio}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{c.client_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{c.document_type}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-40 truncate">{c.concepto}</td>
                        <td className="px-4 py-3 font-semibold">{fmt(c.amount)}</td>
                        <td className="px-4 py-3 font-bold text-amber-600">{saldo > 0 ? fmt(saldo) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span className={cn(c.status === 'overdue' && 'text-red-600 font-semibold')}>{fmtDate(c.due_date)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', STATUS_COLOR[c.status])}>
                            {STATUS_LABEL[c.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {['pending','partial','overdue'].includes(c.status) && (
                            <button onClick={() => { setSelected(c); setCobroForm({...cobroForm, monto: c.amount - c.paid_amount, cuenta_destino: cuentas[0]?.id ?? ''}); setTab('cobro') }}
                              className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 font-medium">
                              Cobrar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NUEVA */}
      {tab === 'nueva' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Nueva Cuenta por Cobrar</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
              <input value={form.client_name ?? ''} onChange={e => setForm({...form, client_name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RFC</label>
              <input value={form.client_rfc ?? ''} onChange={e => setForm({...form, client_rfc: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo documento</label>
              <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                {DOC_TIPOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={form.client_email ?? ''} onChange={e => setForm({...form, client_email: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
              <input value={form.client_phone ?? ''} onChange={e => setForm({...form, client_phone: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Concepto *</label>
              <input value={form.concepto ?? ''} onChange={e => setForm({...form, concepto: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto *</label>
              <input type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha vencimiento *</label>
              <input type="date" value={form.due_date ?? ''} onChange={e => setForm({...form, due_date: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={guardar} disabled={loading}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {loading ? 'Guardando…' : 'Registrar CXC'}
            </button>
            <button onClick={() => setTab('lista')}
              className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* DETALLE */}
      {tab === 'detalle' && selected && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setTab('lista')} className="text-sm text-slate-500 hover:text-slate-700">← Lista</button>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">{selected.folio}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">{selected.client_name}</h2>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  {selected.client_rfc && <span className="font-mono">{selected.client_rfc}</span>}
                  {selected.client_email && <span className="flex items-center gap-1"><Mail size={10} />{selected.client_email}</span>}
                  {selected.client_phone && <span className="flex items-center gap-1"><Phone size={10} />{selected.client_phone}</span>}
                </div>
              </div>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_COLOR[selected.status])}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Folio', selected.folio],
                ['Tipo', selected.document_type],
                ['Concepto', selected.concepto],
                ['Monto', fmt(selected.amount)],
                ['Cobrado', fmt(selected.paid_amount)],
                ['Saldo', fmt(selected.amount - selected.paid_amount)],
                ['Emisión', fmtDate(selected.issue_date)],
                ['Vencimiento', fmtDate(selected.due_date)],
                ...(selected.trip_number ? [['Viaje', selected.trip_number]] : []),
                ...(selected.contract_number ? [['Contrato', selected.contract_number]] : []),
              ].map(([k,v]) => (
                <div key={k}>
                  <span className="text-xs text-slate-400">{k}</span>
                  <p className="font-medium text-slate-800">{v}</p>
                </div>
              ))}
            </div>
            {['pending','partial','overdue'].includes(selected.status) && (
              <button onClick={() => { setCobroForm({...cobroForm, monto: selected.amount - selected.paid_amount, cuenta_destino: cuentas[0]?.id ?? ''}); setTab('cobro') }}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
                <TrendingUp size={14} /> Registrar Cobro
              </button>
            )}
          </div>
          {cobrosDe.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial de cobros</h3>
              {cobrosDe.map(co => (
                <div key={co.id} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{fmt(co.monto)}</p>
                    <p className="text-xs text-slate-500">{fmtDate(co.fecha)} · {co.metodo} · {co.referencia || 'Sin ref'}</p>
                  </div>
                  <CheckCircle size={16} className="text-green-500 mt-0.5" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COBRO */}
      {tab === 'cobro' && selected && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setTab('lista')} className="text-sm text-slate-500 hover:text-slate-700">← Lista</button>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Cobro · {selected.folio}</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm">
            <p className="font-semibold">{selected.client_name}</p>
            <p className="text-slate-500">{selected.concepto}</p>
            <div className="flex gap-6 mt-2">
              <div><span className="text-xs text-slate-400">Total:</span> <span className="font-bold">{fmt(selected.amount)}</span></div>
              <div><span className="text-xs text-slate-400">Cobrado:</span> <span className="font-bold text-green-700">{fmt(selected.paid_amount)}</span></div>
              <div><span className="text-xs text-slate-400">Saldo:</span> <span className="font-bold text-amber-600">{fmt(selected.amount - selected.paid_amount)}</span></div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto a cobrar *</label>
              <input type="number" min="0" step="0.01" value={cobroForm.monto || ''}
                onChange={e => setCobroForm({...cobroForm, monto: parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta destino</label>
              <select value={cobroForm.cuenta_destino} onChange={e => setCobroForm({...cobroForm, cuenta_destino: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Sin acreditar a cuenta</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} – {c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Método</label>
              <select value={cobroForm.metodo} onChange={e => setCobroForm({...cobroForm, metodo: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Referencia</label>
              <input value={cobroForm.referencia} onChange={e => setCobroForm({...cobroForm, referencia: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={registrarCobro} disabled={loading}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {loading ? 'Procesando…' : 'Aplicar Cobro'}
            </button>
            <button onClick={() => setTab('lista')}
              className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
