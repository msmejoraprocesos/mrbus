'use client'

/**
 * Facturación Electrónica CFDI 4.0 — MrBus
 * Emisión, timbrado (mock), cancelación y descarga de facturas
 * Servicios de transporte y renta de unidades
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'
import { trazarExportacion } from '@/lib/trazabilidad'

// ── SAT catálogos (transporte) ─────────────────────────────────────────────
const USOS_CFDI = [
  { id: 'G03', label: 'G03 – Gastos en general' },
  { id: 'S01', label: 'S01 – Sin efectos fiscales' },
  { id: 'CP01', label: 'CP01 – Pagos' },
  { id: 'D10', label: 'D10 – Pagos por servicio de transporte' },
  { id: 'G01', label: 'G01 – Adquisición de mercancias' },
]

const FORMAS_PAGO = [
  { id: '01', label: '01 – Efectivo' },
  { id: '02', label: '02 – Cheque nominativo' },
  { id: '03', label: '03 – Transferencia electrónica' },
  { id: '04', label: '04 – Tarjeta de crédito' },
  { id: '28', label: '28 – Tarjeta de débito' },
  { id: '99', label: '99 – Por definir' },
]

const METODOS_PAGO = [
  { id: 'PUE', label: 'PUE – Pago en una sola exhibición' },
  { id: 'PPD', label: 'PPD – Pago en parcialidades o diferido' },
]

const REGIMENES_FISCALES = [
  { id: '601', label: '601 – Régimen General de Ley P. Morales' },
  { id: '626', label: '626 – Régimen Simplificado de Confianza' },
  { id: '612', label: '612 – Personas Físicas con Actividades Empresariales' },
]

const CLAVES_SAT_TRANSPORTE = [
  { clave: '78101801', desc: 'Servicios de transporte de pasajeros por autobús' },
  { clave: '78101802', desc: 'Servicios de transporte en autobús de pasajeros' },
  { clave: '78131601', desc: 'Arrendamiento de vehículos de transporte' },
  { clave: '78181603', label: 'Servicios de renta de autobuses' },
  { clave: '80141600', desc: 'Servicios de gestión de transporte' },
]

const UNIDADES_SAT = [
  { id: 'E48', label: 'E48 – Unidad de servicio' },
  { id: 'ACT', label: 'ACT – Actividad' },
  { id: 'H87', label: 'H87 – Pieza' },
  { id: 'KT',  label: 'KT – Kit' },
]

type ConceptoFactura = {
  id: string
  clave_sat: string
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  descuento: number
  subtotal: number
  iva: number
  total: number
}

type Factura = {
  id: string
  folio: string
  serie: string
  fecha_emision: string
  cfdi_status: string
  uuid: string | null
  // Emisor
  emisor_rfc: string
  emisor_nombre: string
  emisor_regimen: string
  // Receptor
  receptor_rfc: string
  receptor_nombre: string
  receptor_cp: string
  receptor_regimen: string
  uso_cfdi: string
  // Pago
  forma_pago: string
  metodo_pago: string
  moneda: string
  // Totales
  subtotal: number
  descuento: number
  iva: number
  total: number
  conceptos: ConceptoFactura[]
  // Relación
  trip_id: string | null
  notas: string
  created_at: string
}

function emptyConcepto(): ConceptoFactura {
  return {
    id: crypto.randomUUID(),
    clave_sat: '78101801', descripcion: 'Servicio de transporte de pasajeros',
    cantidad: 1, unidad: 'E48', precio_unitario: 0,
    descuento: 0, subtotal: 0, iva: 0, total: 0,
  }
}

function emptyFactura(): Partial<Factura> & { conceptos: ConceptoFactura[] } {
  return {
    serie: 'A', fecha_emision: new Date().toISOString().slice(0, 10),
    emisor_rfc: '', emisor_nombre: '', emisor_regimen: '601',
    receptor_rfc: '', receptor_nombre: '', receptor_cp: '',
    receptor_regimen: '601', uso_cfdi: 'G03',
    forma_pago: '03', metodo_pago: 'PUE', moneda: 'MXN',
    conceptos: [emptyConcepto()],
    notas: '', cfdi_status: 'draft',
  }
}

function calcConcepto(c: ConceptoFactura): ConceptoFactura {
  const subtotal = c.cantidad * c.precio_unitario - c.descuento
  const iva = subtotal * 0.16
  return { ...c, subtotal, iva, total: subtotal + iva }
}

function MiniKPI({ label, value, sub, color = 'slate' }: { label: string; value: string; sub?: string; color?: string }) {
  const cs: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', slate: 'bg-slate-50 text-slate-700', orange: 'bg-orange-50 text-orange-700' }
  return (
    <div className={cn('rounded-xl p-4', cs[color])}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function FacturasPage() {
  const sb = createClient()
  const [tab, setTab] = useState<'lista' | 'nueva' | 'detalle'>('lista')
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyFactura())
  const [selected, setSelected] = useState<Factura | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7))

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('invoices').select('*').order('created_at', { ascending: false })
    setFacturas((data || []) as Factura[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const timbradas = facturas.filter(f => f.cfdi_status === 'stamped')
  const totalTimbrado = timbradas.reduce((s, f) => s + f.total, 0)
  const borradores = facturas.filter(f => f.cfdi_status === 'draft')
  const canceladas = facturas.filter(f => f.cfdi_status === 'cancelled')
  const mesFiltro = filtroMes || new Date().toISOString().slice(0, 7)
  const facMes = facturas.filter(f => f.fecha_emision?.startsWith(mesFiltro) && f.cfdi_status === 'stamped')
  const totalMes = facMes.reduce((s, f) => s + f.total, 0)

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtradas = facturas.filter(f => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || f.folio?.toLowerCase().includes(q) || f.receptor_nombre?.toLowerCase().includes(q) || f.receptor_rfc?.toLowerCase().includes(q) || f.uuid?.toLowerCase().includes(q)
    const matchS = !filtroStatus || f.cfdi_status === filtroStatus
    const matchM = !filtroMes || f.fecha_emision?.startsWith(filtroMes)
    return matchQ && matchS && matchM
  })

  // ── Totales del form ──────────────────────────────────────────────────────
  const subtotalForm = form.conceptos.reduce((s, c) => s + c.subtotal, 0)
  const ivaForm = form.conceptos.reduce((s, c) => s + c.iva, 0)
  const totalForm = subtotalForm + ivaForm

  // ── Guardar borrador ──────────────────────────────────────────────────────
  async function guardar(timbrar = false) {
    if (!form.receptor_rfc || !form.receptor_nombre || form.conceptos.length === 0) return
    setSaving(true)
    try {
      const folio = await getNextFolio('invoice')
      const uuid = timbrar ? `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}` : null
      const status = timbrar ? 'stamped' : 'draft'
      const { data, error } = await sb.from('invoices').insert({
        folio, serie: form.serie || 'A',
        fecha_emision: form.fecha_emision,
        cfdi_status: status,
        uuid,
        emisor_rfc: form.emisor_rfc, emisor_nombre: form.emisor_nombre, emisor_regimen: form.emisor_regimen,
        receptor_rfc: form.receptor_rfc, receptor_nombre: form.receptor_nombre,
        receptor_cp: form.receptor_cp, receptor_regimen: form.receptor_regimen,
        uso_cfdi: form.uso_cfdi, forma_pago: form.forma_pago, metodo_pago: form.metodo_pago,
        moneda: form.moneda || 'MXN',
        subtotal: subtotalForm, descuento: 0, iva: ivaForm, total: totalForm,
        conceptos: form.conceptos,
        trip_id: form.trip_id || null,
        notas: form.notas,
      }).select().single()
      if (!error && data) {
        await auditLog({ action: 'INSERT', module: 'facturacion', table_name: 'invoices', record_id: data.id, record_folio: folio, after_data: { ...data, cfdi_status: status } })
        if (timbrar) {
          await trazarExportacion({ tipo: 'CFDI', referencia: folio, destino: 'SAT', registros: form.conceptos.length })
        }
        await cargar()
        setForm(emptyFactura())
        setTab('lista')
      }
    } finally { setSaving(false) }
  }

  // ── Cancelar factura ──────────────────────────────────────────────────────
  async function cancelar(factura: Factura) {
    if (!confirm(`¿Cancelar la factura ${factura.folio}? Esta acción no se puede deshacer.`)) return
    const { error } = await sb.from('invoices').update({ cfdi_status: 'cancelled' }).eq('id', factura.id)
    if (!error) {
      await auditLog({ action: 'UPDATE', module: 'facturacion', table_name: 'invoices', record_id: factura.id, record_folio: factura.folio, before_data: { cfdi_status: factura.cfdi_status }, after_data: { cfdi_status: 'cancelled' } })
      await cargar()
      if (selected?.id === factura.id) setSelected(prev => prev ? { ...prev, cfdi_status: 'cancelled' } : null)
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusBadge = (s: string) => {
    const m: Record<string, { cls: string; label: string }> = {
      draft: { cls: 'bg-slate-100 text-slate-600', label: 'Borrador' },
      stamped: { cls: 'bg-green-100 text-green-700', label: 'Timbrada' },
      cancelled: { cls: 'bg-red-100 text-red-600', label: 'Cancelada' },
      substituted: { cls: 'bg-amber-100 text-amber-700', label: 'Sustituida' },
    }
    return m[s] || { cls: 'bg-gray-100 text-gray-500', label: s }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent'

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Facturación Electrónica</h1>
            <p className="text-slate-400 text-sm">CFDI 4.0 · {facturas.length} facturas · {fmt(totalTimbrado)} timbrado</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyFactura()); setTab('nueva') }} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600">
          <span className="text-lg leading-none">+</span> Nueva factura
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI label="Timbradas (total)" value={String(timbradas.length)} sub={fmt(totalTimbrado)} color="green" />
        <MiniKPI label={`Facturado ${mesFiltro}`} value={fmt(totalMes)} sub={`${facMes.length} facturas`} color="orange" />
        <MiniKPI label="Borradores" value={String(borradores.length)} color="slate" />
        <MiniKPI label="Canceladas" value={String(canceladas.length)} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['lista', 'nueva'] as const).map(t => (
          <button key={t} onClick={() => { if (t === 'nueva') setForm(emptyFactura()); setTab(t) }} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'lista' ? 'Facturas' : 'Nueva CFDI'}
          </button>
        ))}
        {tab === 'detalle' && selected && (
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow text-slate-900">{selected.folio}</button>
        )}
      </div>

      {/* ── LISTA ── */}
      {tab === 'lista' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={cn(inp, 'w-auto')} />
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={cn(inp, 'w-auto')}>
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="stamped">Timbrada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar folio, RFC, cliente…" className={cn(inp, 'max-w-xs')} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                  {['Folio', 'Fecha', 'Receptor', 'RFC', 'Subtotal', 'IVA', 'Total', 'Status', 'UUID', ''].map(h => <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
                ) : filtradas.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">Sin facturas</td></tr>
                ) : filtradas.map(f => {
                  const sb2 = statusBadge(f.cfdi_status)
                  return (
                    <tr key={f.id} className={cn('hover:bg-slate-50 cursor-pointer', f.cfdi_status === 'cancelled' ? 'opacity-50' : '')}>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-orange-600">{f.folio}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(f.fecha_emision)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">{f.receptor_nombre}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.receptor_rfc}</td>
                      <td className="px-4 py-3">{fmt(f.subtotal)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmt(f.iva)}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(f.total)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sb2.cls)}>{sb2.label}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 max-w-[100px] truncate">{f.uuid || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(f); setTab('detalle') }} className="text-blue-600 hover:underline text-xs mr-2">Ver</button>
                        {f.cfdi_status === 'stamped' && (
                          <button onClick={() => cancelar(f)} className="text-red-400 hover:underline text-xs">Cancelar</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── NUEVA CFDI ── */}
      {tab === 'nueva' && (
        <div className="space-y-5 max-w-5xl">
          {/* Encabezado */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b pb-2">Datos generales CFDI 4.0</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Serie</label>
                <input value={form.serie || 'A'} onChange={e => setForm(p => ({ ...p, serie: e.target.value }))} className={inp} maxLength={3} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha emisión</label>
                <input type="date" value={form.fecha_emision} onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Forma de pago</label>
                <select value={form.forma_pago} onChange={e => setForm(p => ({ ...p, forma_pago: e.target.value }))} className={inp}>
                  {FORMAS_PAGO.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Método de pago</label>
                <select value={form.metodo_pago} onChange={e => setForm(p => ({ ...p, metodo_pago: e.target.value }))} className={inp}>
                  {METODOS_PAGO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Emisor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b pb-2">Datos del emisor</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">RFC emisor *</label>
                <input value={form.emisor_rfc || ''} onChange={e => setForm(p => ({ ...p, emisor_rfc: e.target.value.toUpperCase() }))} className={cn(inp, 'font-mono')} placeholder="RFC del emisor" maxLength={13} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre / Razón social</label>
                <input value={form.emisor_nombre || ''} onChange={e => setForm(p => ({ ...p, emisor_nombre: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Régimen fiscal</label>
                <select value={form.emisor_regimen} onChange={e => setForm(p => ({ ...p, emisor_regimen: e.target.value }))} className={inp}>
                  {REGIMENES_FISCALES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Receptor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b pb-2">Datos del receptor</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">RFC receptor *</label>
                <input value={form.receptor_rfc || ''} onChange={e => setForm(p => ({ ...p, receptor_rfc: e.target.value.toUpperCase() }))} className={cn(inp, 'font-mono')} placeholder="RFC del receptor" maxLength={13} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre / Razón social *</label>
                <input value={form.receptor_nombre || ''} onChange={e => setForm(p => ({ ...p, receptor_nombre: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">CP receptor</label>
                <input value={form.receptor_cp || ''} onChange={e => setForm(p => ({ ...p, receptor_cp: e.target.value }))} className={inp} placeholder="CP domicilio fiscal" maxLength={5} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Uso CFDI</label>
                <select value={form.uso_cfdi} onChange={e => setForm(p => ({ ...p, uso_cfdi: e.target.value }))} className={inp}>
                  {USOS_CFDI.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Régimen fiscal receptor</label>
                <select value={form.receptor_regimen} onChange={e => setForm(p => ({ ...p, receptor_regimen: e.target.value }))} className={inp}>
                  {REGIMENES_FISCALES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Conceptos */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-semibold text-slate-700">Conceptos</h2>
              <button onClick={() => setForm(p => ({ ...p, conceptos: [...p.conceptos, emptyConcepto()] }))} className="text-xs text-orange-600 hover:underline">+ Agregar concepto</button>
            </div>
            <div className="space-y-3">
              {form.conceptos.map((c, i) => (
                <div key={c.id} className="border border-slate-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Descripción *</label>
                    <input value={c.descripcion} onChange={e => {
                      const nc = { ...c, descripcion: e.target.value }
                      setForm(p => ({ ...p, conceptos: p.conceptos.map((x, j) => j === i ? nc : x) }))
                    }} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Clave SAT</label>
                    <select value={c.clave_sat} onChange={e => {
                      const nc = calcConcepto({ ...c, clave_sat: e.target.value })
                      setForm(p => ({ ...p, conceptos: p.conceptos.map((x, j) => j === i ? nc : x) }))
                    }} className={inp}>
                      {CLAVES_SAT_TRANSPORTE.map(k => <option key={k.clave} value={k.clave}>{k.clave}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cantidad</label>
                    <input type="number" value={c.cantidad} onChange={e => {
                      const nc = calcConcepto({ ...c, cantidad: Number(e.target.value) })
                      setForm(p => ({ ...p, conceptos: p.conceptos.map((x, j) => j === i ? nc : x) }))
                    }} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Precio unitario</label>
                    <input type="number" value={c.precio_unitario} onChange={e => {
                      const nc = calcConcepto({ ...c, precio_unitario: Number(e.target.value) })
                      setForm(p => ({ ...p, conceptos: p.conceptos.map((x, j) => j === i ? nc : x) }))
                    }} className={inp} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Subtotal / Total</label>
                    <div className="text-sm font-medium text-slate-700">{fmt(c.subtotal)}</div>
                    <div className="text-sm font-semibold text-orange-700">{fmt(c.total)}</div>
                    {form.conceptos.length > 1 && (
                      <button onClick={() => setForm(p => ({ ...p, conceptos: p.conceptos.filter((_, j) => j !== i) }))} className="text-red-400 text-xs hover:underline self-start mt-1">Quitar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmt(subtotalForm)}</span></div>
                <div className="flex justify-between text-slate-500"><span>IVA 16%</span><span>{fmt(ivaForm)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span className="text-orange-700">{fmt(totalForm)}</span></div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas adicionales</label>
            <textarea value={form.notas || ''} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} className={inp} />
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button onClick={() => guardar(false)} disabled={saving || !form.receptor_rfc || !form.receptor_nombre} className="px-6 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button onClick={() => guardar(true)} disabled={saving || !form.receptor_rfc || !form.receptor_nombre || totalForm === 0} className="bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {saving ? 'Timbrando…' : '⚡ Timbrar CFDI'}
            </button>
            <button onClick={() => setTab('lista')} className="px-6 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── DETALLE ── */}
      {tab === 'detalle' && selected && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {/* Header factura */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xl font-bold text-orange-600">{selected.serie}{selected.folio}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusBadge(selected.cfdi_status).cls)}>
                    {statusBadge(selected.cfdi_status).label}
                  </span>
                </div>
                <div className="text-slate-500 text-sm">{fmtDate(selected.fecha_emision)} · {FORMAS_PAGO.find(f => f.id === selected.forma_pago)?.label} · {selected.moneda}</div>
                {selected.uuid && <div className="font-mono text-xs text-slate-400 mt-1">UUID: {selected.uuid}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTab('lista')} className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">← Volver</button>
                {selected.cfdi_status === 'stamped' && (
                  <button onClick={() => cancelar(selected)} className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Cancelar CFDI</button>
                )}
              </div>
            </div>

            {/* Emisor / Receptor */}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">Emisor</div>
                <div className="font-medium text-slate-900">{selected.emisor_nombre}</div>
                <div className="font-mono text-sm text-slate-500">{selected.emisor_rfc}</div>
                <div className="text-xs text-slate-400">{REGIMENES_FISCALES.find(r => r.id === selected.emisor_regimen)?.label}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-xs font-semibold text-orange-500 mb-2 uppercase">Receptor</div>
                <div className="font-medium text-slate-900">{selected.receptor_nombre}</div>
                <div className="font-mono text-sm text-slate-500">{selected.receptor_rfc}</div>
                <div className="text-xs text-slate-400">CP: {selected.receptor_cp} · {USOS_CFDI.find(u => u.id === selected.uso_cfdi)?.label}</div>
              </div>
            </div>

            {/* Conceptos */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                    {['Clave SAT', 'Descripción', 'Cant.', 'Precio unit.', 'Subtotal', 'IVA', 'Total'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(selected.conceptos || []).map((c: ConceptoFactura, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{c.clave_sat}</td>
                      <td className="px-3 py-2 text-slate-800">{c.descripcion}</td>
                      <td className="px-3 py-2 text-center">{c.cantidad}</td>
                      <td className="px-3 py-2">{fmt(c.precio_unitario)}</td>
                      <td className="px-3 py-2">{fmt(c.subtotal)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmt(c.iva)}</td>
                      <td className="px-3 py-2 font-semibold">{fmt(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 font-semibold bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-slate-600">Subtotal / IVA / Total</td>
                    <td className="px-3 py-2">{fmt(selected.subtotal)}</td>
                    <td className="px-3 py-2 text-slate-400">{fmt(selected.iva)}</td>
                    <td className="px-3 py-2 text-orange-700 text-base">{fmt(selected.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {selected.notas && <div className="text-xs text-slate-400 italic">Notas: {selected.notas}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
