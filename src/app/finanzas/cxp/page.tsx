'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'
import { Plus, Search, Filter, CheckCircle, Clock, XCircle, AlertTriangle, CreditCard, Calendar, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient()

type CXP = {
  id: string; folio: string; proveedor: string; rfc_proveedor?: string
  concepto: string; categoria: string; monto: number; monto_pagado: number
  fecha_emision: string; fecha_vencimiento: string; fecha_pago?: string
  metodo_pago?: string; referencia?: string; cuenta_bancaria?: string
  status: 'pendiente' | 'parcial' | 'pagado' | 'cancelado' | 'vencido'
  prioridad: 'alta' | 'media' | 'baja'
  notas?: string; created_at: string
}

type Pago = {
  id: string; cxp_id: string; fecha: string; monto: number
  metodo: string; referencia: string; cuenta_origen: string; notas?: string
  created_at: string
}

type BankAccount = { id: string; nombre: string; banco: string; saldo: number }

const CATEGORIAS = ['Combustible','Mantenimiento','Nómina','Seguros','Casetas','Renta','Servicios','Refacciones','Llantas','Compras','Otro']
const METODOS_PAGO = ['Transferencia','Cheque','Efectivo','Tarjeta débito','SPEI','Domiciliación']
const STATUS_LABEL: Record<string,string> = { pendiente:'Pendiente', parcial:'Parcial', pagado:'Pagado', cancelado:'Cancelado', vencido:'Vencido' }
const STATUS_COLOR: Record<string,string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  parcial:   'bg-blue-100 text-blue-700',
  pagado:    'bg-green-100 text-green-700',
  cancelado: 'bg-slate-100 text-slate-500',
  vencido:   'bg-red-100 text-red-700',
}
const PRIORIDAD_COLOR: Record<string,string> = { alta:'text-red-500', media:'text-amber-500', baja:'text-slate-400' }

function empty(): Partial<CXP> {
  return {
    proveedor: '', rfc_proveedor: '', concepto: '', categoria: 'Otro',
    monto: 0, monto_pagado: 0, fecha_emision: new Date().toISOString().slice(0,10),
    fecha_vencimiento: '', status: 'pendiente', prioridad: 'media', notas: ''
  }
}

export default function CXPPage() {
  const [tab, setTab] = useState<'lista'|'nueva'|'detalle'|'pagos'>('lista')
  const [cxps, setCXPs] = useState<CXP[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [cuentas, setCuentas] = useState<BankAccount[]>([])
  const [selected, setSelected] = useState<CXP | null>(null)
  const [form, setForm] = useState<Partial<CXP>>(empty())
  const [pagoForm, setPagoForm] = useState({ monto: 0, metodo: 'Transferencia', referencia: '', cuenta_origen: '', notas: '' })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterCat, setFilterCat] = useState('todas')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('accounts_payable').select('*').order('fecha_vencimiento', { ascending: true })
    // Map legacy fields to new schema
    const mapped = (data ?? []).map((r: any) => ({
      id: r.id,
      folio: r.folio ?? `CXP-${r.id.slice(0,6).toUpperCase()}`,
      proveedor: r.supplier_name ?? r.proveedor ?? '',
      rfc_proveedor: r.rfc_proveedor ?? '',
      concepto: r.concept ?? r.concepto ?? '',
      categoria: r.category ?? r.categoria ?? 'Otro',
      monto: r.amount ?? r.monto ?? 0,
      monto_pagado: r.paid_amount ?? r.monto_pagado ?? 0,
      fecha_emision: r.issue_date ?? r.fecha_emision ?? r.created_at?.slice(0,10) ?? '',
      fecha_vencimiento: r.due_date ?? r.fecha_vencimiento ?? '',
      fecha_pago: r.payment_date ?? r.fecha_pago,
      metodo_pago: r.payment_method ?? r.metodo_pago,
      referencia: r.reference ?? r.referencia,
      cuenta_bancaria: r.cuenta_bancaria,
      status: computeStatus(r),
      prioridad: r.prioridad ?? 'media',
      notas: r.notes ?? r.notas ?? '',
      created_at: r.created_at,
    })) as CXP[]
    setCXPs(mapped)

    const { data: pd } = await supabase.from('cxp_pagos').select('*').order('fecha', { ascending: false })
    setPagos(pd ?? [])

    const { data: ba } = await supabase.from('bank_accounts').select('id,nombre,banco,saldo').eq('activa', true)
    setCuentas(ba ?? [])
  }, [])

  function computeStatus(r: any): CXP['status'] {
    const s = r.status ?? ''
    if (s === 'paid' || s === 'pagado') return 'pagado'
    if (s === 'cancelled' || s === 'cancelado') return 'cancelado'
    const saldo = (r.amount ?? r.monto ?? 0) - (r.paid_amount ?? r.monto_pagado ?? 0)
    if (saldo <= 0) return 'pagado'
    const vence = r.due_date ?? r.fecha_vencimiento
    if (vence && new Date(vence) < new Date()) return 'vencido'
    if ((r.paid_amount ?? r.monto_pagado ?? 0) > 0) return 'parcial'
    if (s === 'partial' || s === 'parcial') return 'parcial'
    return 'pendiente'
  }

  useEffect(() => { load() }, [load])

  const filtered = cxps.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.proveedor.toLowerCase().includes(q) || c.concepto.toLowerCase().includes(q) || c.folio.toLowerCase().includes(q)
    const matchS = filterStatus === 'todos' || c.status === filterStatus
    const matchC = filterCat === 'todas' || c.categoria === filterCat
    return matchQ && matchS && matchC
  })

  // KPIs
  const hoy = new Date()
  const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const totalPendiente = cxps.filter(c => ['pendiente','parcial','vencido'].includes(c.status))
    .reduce((s,c) => s + c.monto - c.monto_pagado, 0)
  const vencidas = cxps.filter(c => c.status === 'vencido').length
  const vence7 = cxps.filter(c => {
    if (!['pendiente','parcial'].includes(c.status)) return false
    const d = new Date(c.fecha_vencimiento)
    return d >= hoy && d <= new Date(hoy.getTime() + 7*86400000)
  }).length
  const pagadoMes = cxps.filter(c => c.status === 'pagado' && c.fecha_pago && new Date(c.fecha_pago) >= mesInicio)
    .reduce((s,c) => s + c.monto, 0)

  async function guardar() {
    if (!form.proveedor || !form.concepto || !form.monto || !form.fecha_vencimiento) {
      toast.error('Completa los campos requeridos'); return
    }
    setLoading(true)
    try {
      const folio = await getNextFolio('cxp')
      const payload = {
        folio, supplier_name: form.proveedor, proveedor: form.proveedor,
        rfc_proveedor: form.rfc_proveedor, concept: form.concepto, concepto: form.concepto,
        category: form.categoria, categoria: form.categoria,
        amount: form.monto, monto: form.monto, paid_amount: 0, monto_pagado: 0,
        issue_date: form.fecha_emision, fecha_emision: form.fecha_emision,
        due_date: form.fecha_vencimiento, fecha_vencimiento: form.fecha_vencimiento,
        status: 'pendiente', prioridad: form.prioridad,
        notes: form.notas, notas: form.notas,
      }
      const { data, error } = await supabase.from('accounts_payable').insert(payload).select().single()
      if (error) throw error
      await auditLog({ action: 'INSERT', module: 'CXP', table_name: 'accounts_payable', record_id: data.id, record_folio: folio })
      toast.success(`CXP ${folio} registrada`)
      setForm(empty())
      setTab('lista')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function registrarPago() {
    if (!selected) return
    if (!pagoForm.monto || pagoForm.monto <= 0) { toast.error('Monto inválido'); return }
    const saldo = selected.monto - selected.monto_pagado
    if (pagoForm.monto > saldo + 0.01) { toast.error(`Monto supera el saldo (${fmt(saldo)})`); return }
    if (!pagoForm.cuenta_origen) { toast.error('Selecciona cuenta de origen'); return }
    setLoading(true)
    try {
      const newPagado = selected.monto_pagado + pagoForm.monto
      const newStatus = newPagado >= selected.monto - 0.01 ? 'paid' : 'partial'

      // Insert pago
      const { data: pd, error: pe } = await supabase.from('cxp_pagos').insert({
        cxp_id: selected.id, fecha: new Date().toISOString().slice(0,10),
        monto: pagoForm.monto, metodo: pagoForm.metodo,
        referencia: pagoForm.referencia, cuenta_origen: pagoForm.cuenta_origen,
        notas: pagoForm.notas,
      }).select().single()
      if (pe) throw pe

      // Update CXP
      const updatePayload: any = {
        paid_amount: newPagado, monto_pagado: newPagado, status: newStatus,
        payment_method: pagoForm.metodo, metodo_pago: pagoForm.metodo,
        reference: pagoForm.referencia, referencia: pagoForm.referencia,
      }
      if (newStatus === 'paid') {
        updatePayload.payment_date = new Date().toISOString().slice(0,10)
        updatePayload.fecha_pago = updatePayload.payment_date
      }
      await supabase.from('accounts_payable').update(updatePayload).eq('id', selected.id)

      // Deduct from bank account
      const cuenta = cuentas.find(c => c.id === pagoForm.cuenta_origen)
      if (cuenta) {
        await supabase.from('bank_accounts').update({ saldo: cuenta.saldo - pagoForm.monto }).eq('id', cuenta.id)
        await supabase.from('bank_movements').insert({
          cuenta_id: pagoForm.cuenta_origen, fecha: new Date().toISOString().slice(0,10),
          descripcion: `Pago CXP ${selected.folio} - ${selected.proveedor}`,
          tipo: 'egreso', monto: pagoForm.monto, referencia: pagoForm.referencia,
          categoria: selected.categoria, conciliado: false,
        })
      }

      await auditLog({ action: 'UPDATE', module: 'CXP', table_name: 'accounts_payable', record_id: selected.id, record_folio: selected.folio })
      toast.success('Pago registrado correctamente')
      setPagoForm({ monto: 0, metodo: 'Transferencia', referencia: '', cuenta_origen: '', notas: '' })
      setTab('lista')
      setSelected(null)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al registrar pago')
    } finally { setLoading(false) }
  }

  async function cancelar(c: CXP) {
    if (!confirm(`¿Cancelar CXP ${c.folio}?`)) return
    await supabase.from('accounts_payable').update({ status: 'cancelled' }).eq('id', c.id)
    await auditLog({ action: 'CANCEL', module: 'CXP', table_name: 'accounts_payable', record_id: c.id, record_folio: c.folio })
    toast.success('CXP cancelada')
    load()
  }

  function abrirPago(c: CXP) {
    setSelected(c)
    setPagoForm({ monto: c.monto - c.monto_pagado, metodo: 'Transferencia', referencia: '', cuenta_origen: cuentas[0]?.id ?? '', notas: '' })
    setTab('pagos')
  }

  function abrirDetalle(c: CXP) {
    setSelected(c)
    setTab('detalle')
  }

  const pagosDe = selected ? pagos.filter(p => p.cxp_id === selected.id) : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">📉</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cuentas por Pagar</h1>
            <p className="text-sm text-slate-500">{cxps.length} registros</p>
          </div>
        </div>
        <button onClick={() => { setForm(empty()); setTab('nueva') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors">
          <Plus size={15} /> Nueva CXP
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Por pagar', val: fmt(totalPendiente), icon:'💰', color:'text-red-600', bg:'bg-red-50' },
          { label:'Vencidas', val: String(vencidas), icon:'⚠️', color:'text-red-700', bg:'bg-red-50' },
          { label:'Vence en 7d', val: String(vence7), icon:'⏰', color:'text-amber-700', bg:'bg-amber-50' },
          { label:'Pagado este mes', val: fmt(pagadoMes), icon:'✅', color:'text-green-700', bg:'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={cn('rounded-xl border border-slate-100 p-4', k.bg)}>
            <div className="flex items-center gap-2 mb-1">
              <span>{k.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{k.label}</span>
            </div>
            <p className={cn('text-xl font-bold', k.color)}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit text-sm">
        {(['lista','nueva'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-md font-medium transition-colors capitalize',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'lista' ? 'Lista CXP' : 'Nueva CXP'}
          </button>
        ))}
        {selected && tab === 'detalle' && (
          <button className="px-4 py-1.5 rounded-md font-medium bg-white text-slate-800 shadow-sm">Detalle</button>
        )}
        {selected && tab === 'pagos' && (
          <button className="px-4 py-1.5 rounded-md font-medium bg-white text-teal-700 shadow-sm">Registrar Pago</button>
        )}
      </div>

      {/* LISTA */}
      {tab === 'lista' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor, concepto…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="todos">Todos estados</option>
              {Object.entries(STATUS_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="todas">Todas categorías</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    {['Folio','Proveedor','Concepto','Categoría','Monto','Saldo','Vence','Prioridad','Estado','Acciones'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">Sin registros</td></tr>
                  ) : filtered.map(c => {
                    const saldo = c.monto - c.monto_pagado
                    const esVencida = c.status === 'vencido'
                    return (
                      <tr key={c.id} className={cn('hover:bg-slate-50/50 cursor-pointer', esVencida && 'bg-red-50/30')}
                        onClick={() => abrirDetalle(c)}>
                        <td className="px-4 py-3 font-mono text-xs text-teal-700 font-semibold">{c.folio}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{c.proveedor}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-48 truncate">{c.concepto}</td>
                        <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.categoria}</span></td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{fmt(c.monto)}</td>
                        <td className="px-4 py-3 font-bold text-red-600">{saldo > 0 ? fmt(saldo) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span className={cn(esVencida && 'text-red-600 font-semibold')}>{fmtDate(c.fecha_vencimiento)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-bold', PRIORIDAD_COLOR[c.prioridad])}>
                            {c.prioridad === 'alta' ? '●' : c.prioridad === 'media' ? '◐' : '○'} {c.prioridad}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', STATUS_COLOR[c.status])}>
                            {STATUS_LABEL[c.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {['pendiente','parcial','vencido'].includes(c.status) && (
                              <button onClick={() => abrirPago(c)}
                                className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 font-medium">
                                Pagar
                              </button>
                            )}
                            {['pendiente','parcial'].includes(c.status) && (
                              <button onClick={() => cancelar(c)}
                                className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                                Cancelar
                              </button>
                            )}
                          </div>
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
          <h2 className="text-base font-semibold text-slate-800 mb-5">Nueva Cuenta por Pagar</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor *</label>
              <input value={form.proveedor ?? ''} onChange={e => setForm({...form, proveedor: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RFC</label>
              <input value={form.rfc_proveedor ?? ''} onChange={e => setForm({...form, rfc_proveedor: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="RFC del proveedor" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoría *</label>
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Concepto *</label>
              <input value={form.concepto ?? ''} onChange={e => setForm({...form, concepto: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Descripción del gasto o servicio" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto *</label>
              <input type="number" min="0" step="0.01" value={form.monto ?? ''} onChange={e => setForm({...form, monto: parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value as any})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha emisión</label>
              <input type="date" value={form.fecha_emision ?? ''} onChange={e => setForm({...form, fecha_emision: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha vencimiento *</label>
              <input type="date" value={form.fecha_vencimiento ?? ''} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea value={form.notas ?? ''} onChange={e => setForm({...form, notas: e.target.value})} rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={guardar} disabled={loading}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {loading ? 'Guardando…' : 'Registrar CXP'}
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
                <h2 className="text-base font-bold text-slate-800">{selected.proveedor}</h2>
                {selected.rfc_proveedor && <p className="text-xs text-slate-500 font-mono">{selected.rfc_proveedor}</p>}
              </div>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_COLOR[selected.status])}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Folio', selected.folio],
                ['Concepto', selected.concepto],
                ['Categoría', selected.categoria],
                ['Monto total', fmt(selected.monto)],
                ['Pagado', fmt(selected.monto_pagado)],
                ['Saldo', fmt(selected.monto - selected.monto_pagado)],
                ['Emisión', fmtDate(selected.fecha_emision)],
                ['Vencimiento', fmtDate(selected.fecha_vencimiento)],
                ['Método pago', selected.metodo_pago ?? '—'],
                ['Referencia', selected.referencia ?? '—'],
                ['Prioridad', selected.prioridad],
              ].map(([k,v]) => (
                <div key={k}>
                  <span className="text-xs text-slate-500">{k}</span>
                  <p className="font-medium text-slate-800">{v}</p>
                </div>
              ))}
              {selected.notas && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-500">Notas</span>
                  <p className="text-slate-700">{selected.notas}</p>
                </div>
              )}
            </div>

            {['pendiente','parcial','vencido'].includes(selected.status) && (
              <button onClick={() => abrirPago(selected)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
                <CreditCard size={14} /> Registrar Pago
              </button>
            )}
          </div>

          {/* Historial de pagos */}
          {pagosDe.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial de Pagos</h3>
              <div className="space-y-2">
                {pagosDe.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{fmt(p.monto)}</p>
                      <p className="text-xs text-slate-500">{fmtDate(p.fecha)} · {p.metodo} · {p.referencia || 'Sin ref'}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Aplicado</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REGISTRAR PAGO */}
      {tab === 'pagos' && selected && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setTab('lista')} className="text-sm text-slate-500 hover:text-slate-700">← Lista</button>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Pago · {selected.folio}</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm">
            <p className="font-semibold text-slate-800">{selected.proveedor}</p>
            <p className="text-slate-500">{selected.concepto}</p>
            <div className="flex gap-6 mt-2">
              <div><span className="text-xs text-slate-400">Total:</span> <span className="font-bold text-slate-800">{fmt(selected.monto)}</span></div>
              <div><span className="text-xs text-slate-400">Pagado:</span> <span className="font-bold text-slate-600">{fmt(selected.monto_pagado)}</span></div>
              <div><span className="text-xs text-slate-400">Saldo:</span> <span className="font-bold text-red-600">{fmt(selected.monto - selected.monto_pagado)}</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto a pagar *</label>
              <input type="number" min="0" step="0.01" value={pagoForm.monto || ''} onChange={e => setPagoForm({...pagoForm, monto: parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta origen *</label>
              <select value={pagoForm.cuenta_origen} onChange={e => setPagoForm({...pagoForm, cuenta_origen: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Seleccionar cuenta…</option>
                {cuentas.map(c => (
                  <option key={c.id} value={c.id}>{c.banco} – {c.nombre} ({fmt(c.saldo)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({...pagoForm, metodo: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Referencia / No. cheque</label>
              <input value={pagoForm.referencia} onChange={e => setPagoForm({...pagoForm, referencia: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Número de transferencia, cheque, etc." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea value={pagoForm.notas} onChange={e => setPagoForm({...pagoForm, notas: e.target.value})} rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={registrarPago} disabled={loading}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {loading ? 'Procesando…' : 'Aplicar Pago'}
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
