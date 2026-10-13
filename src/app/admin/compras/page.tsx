'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
import { getNextFolio } from '@/lib/audit'
import { trazarOrdenCompra, validateAmount, redondearMonto } from '@/lib/trazabilidad'
import {
  ShoppingCart, Plus, Search, Eye, Check, X, AlertCircle,
  Loader2, Package, Truck, FileText, DollarSign, Clock,
  ChevronRight, Trash2, Edit2, Star, ArrowRight
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Proveedor = {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  rfc: string
  payment_terms: string
  status: string
}

type Producto = {
  id: string
  name: string
  sku: string
  unit: string
  unit_price: number
  category: string
}

type ReqItem = {
  id: string
  producto_id: string
  nombre: string
  cantidad: number
  unidad: string
  precio_estimado: number
  notas: string
}

type Requisicion = {
  id: string
  folio: string
  fecha: string
  solicitante: string
  departamento: string
  prioridad: 'urgente' | 'normal' | 'baja'
  justificacion: string
  items: ReqItem[]
  total_estimado: number
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'cancelled'
  created_at: string
}

type OcItem = {
  id: string
  producto_id: string
  nombre: string
  cantidad: number
  unidad: string
  precio_unitario: number
  subtotal: number
  recibido: number
}

type OrdenCompra = {
  id: string
  folio: string
  fecha: string
  proveedor_id: string
  proveedor_nombre: string
  requisicion_id: string | null
  items: OcItem[]
  subtotal: number
  iva: number
  total: number
  condiciones_pago: string
  fecha_entrega: string
  notas: string
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  created_at: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const REQ_STATUS: Record<string, string> = {
  draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobada',
  ordered: 'Ordenada', cancelled: 'Cancelada',
}
const REQ_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  ordered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

const OC_STATUS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', partial: 'Parcial', received: 'Recibida', cancelled: 'Cancelada',
}
const OC_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

const PRIORIDAD_COLORS: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  normal: 'bg-blue-100 text-blue-600',
  baja: 'bg-gray-100 text-gray-500',
}

const CATEGORIAS = ['Refacciones', 'Neumáticos', 'Lubricantes', 'Combustible', 'Limpieza', 'Oficina', 'Seguridad', 'Herramientas', 'Servicios', 'Otro']

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ComprasPage() {
  const sb = createClient()

  const [tab, setTab] = useState<'requisiciones' | 'ordenes' | 'proveedores' | 'nueva_req' | 'nueva_oc'>('requisiciones')
  const [requisiciones, setRequisiciones] = useState<Requisicion[]>([])
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [errores, setErrores] = useState<string[]>([])

  // Requisición form
  const [reqItems, setReqItems] = useState<ReqItem[]>([emptyReqItem()])
  const [reqForm, setReqForm] = useState({
    solicitante: '',
    departamento: 'Mantenimiento',
    prioridad: 'normal' as Requisicion['prioridad'],
    justificacion: '',
    fecha: new Date().toISOString().slice(0, 10),
  })

  // OC form
  const [ocItems, setOcItems] = useState<OcItem[]>([emptyOcItem()])
  const [ocForm, setOcForm] = useState({
    proveedor_id: '',
    fecha_entrega: '',
    condiciones_pago: 'Contado',
    notas: '',
    iva_pct: 16,
  })

  // Proveedor form
  const [showProvForm, setShowProvForm] = useState(false)
  const [provForm, setProvForm] = useState<Partial<Proveedor>>({})

  // ─── Carga ─────────────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true)
    const [reqRes, ocRes, provRes] = await Promise.all([
      sb.from('purchase_requests').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('suppliers').select('*').eq('status', 'active').order('name'),
    ])
    setRequisiciones((reqRes.data || []) as Requisicion[])
    setOrdenes((ocRes.data || []) as OrdenCompra[])
    setProveedores((provRes.data || []) as Proveedor[])
    setLoading(false)
  }, [sb])

  useEffect(() => { cargar() }, [cargar])

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = {
    reqPendientes: requisiciones.filter(r => r.status === 'pending').length,
    ocAbiertas: ordenes.filter(o => ['draft', 'sent', 'partial'].includes(o.status)).length,
    totalOcMes: ordenes
      .filter(o => o.created_at?.slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((s, o) => s + (o.total || 0), 0),
    proveedores: proveedores.length,
  }

  // ─── Calculos OC ──────────────────────────────────────────────────────────

  const calcOC = (() => {
    const subtotal = redondearMonto(ocItems.reduce((s, i) => s + (i.subtotal || 0), 0))
    const iva = redondearMonto(subtotal * (ocForm.iva_pct / 100))
    const total = redondearMonto(subtotal + iva)
    return { subtotal, iva, total }
  })()

  const calcReq = (() => {
    return redondearMonto(reqItems.reduce((s, i) => s + (i.cantidad * i.precio_estimado || 0), 0))
  })()

  // ─── Guardar requisición ───────────────────────────────────────────────────

  const guardarRequisicion = async () => {
    const errs: string[] = []
    if (!reqForm.solicitante.trim()) errs.push('El solicitante es requerido')
    if (reqItems.filter(i => i.nombre).length === 0) errs.push('Agrega al menos un artículo')
    if (errs.length > 0) { setErrores(errs); return }

    setSaving(true)
    try {
      const folio = await getNextFolio('purchase_request')
      const validItems = reqItems.filter(i => i.nombre)
      const { data, error } = await sb.from('purchase_requests').insert({
        folio,
        fecha: reqForm.fecha,
        solicitante: reqForm.solicitante,
        departamento: reqForm.departamento,
        prioridad: reqForm.prioridad,
        justificacion: reqForm.justificacion,
        items: validItems,
        total_estimado: calcReq,
        status: 'pending',
      }).select().single()

      if (error) { setErrores([error.message]); return }

      const { data: { user } } = await sb.auth.getUser()
      await trazarOrdenCompra({
        tipo: 'requisicion',
        record_id: data.id,
        folio,
        total: calcReq,
        items_count: validItems.length,
        user_id: user?.id || '',
      })

      await cargar()
      setReqItems([emptyReqItem()])
      setReqForm({ solicitante: '', departamento: 'Mantenimiento', prioridad: 'normal', justificacion: '', fecha: new Date().toISOString().slice(0, 10) })
      setErrores([])
      setTab('requisiciones')
    } finally {
      setSaving(false)
    }
  }

  // ─── Guardar OC ───────────────────────────────────────────────────────────

  const guardarOC = async () => {
    const errs: string[] = []
    if (!ocForm.proveedor_id) errs.push('Selecciona un proveedor')
    if (ocItems.filter(i => i.nombre).length === 0) errs.push('Agrega al menos un artículo')
    const montoVal = validateAmount(calcOC.total, 'total OC')
    if (!montoVal.valid) errs.push(...montoVal.errors.map(e => e.message))
    if (errs.length > 0) { setErrores(errs); return }

    setSaving(true)
    try {
      const folio = await getNextFolio('purchase_order')
      const proveedor = proveedores.find(p => p.id === ocForm.proveedor_id)
      const validItems = ocItems.filter(i => i.nombre)

      const { data, error } = await sb.from('purchase_orders').insert({
        folio,
        fecha: new Date().toISOString().slice(0, 10),
        proveedor_id: ocForm.proveedor_id,
        proveedor_nombre: proveedor?.name || '',
        items: validItems,
        subtotal: calcOC.subtotal,
        iva: calcOC.iva,
        total: calcOC.total,
        condiciones_pago: ocForm.condiciones_pago,
        fecha_entrega: ocForm.fecha_entrega || null,
        notas: ocForm.notas,
        status: 'draft',
      }).select().single()

      if (error) { setErrores([error.message]); return }

      const { data: { user } } = await sb.auth.getUser()
      await trazarOrdenCompra({
        tipo: 'orden_compra',
        record_id: data.id,
        folio,
        proveedor: proveedor?.name,
        total: calcOC.total,
        items_count: validItems.length,
        user_id: user?.id || '',
      })

      await cargar()
      setOcItems([emptyOcItem()])
      setOcForm({ proveedor_id: '', fecha_entrega: '', condiciones_pago: 'Contado', notas: '', iva_pct: 16 })
      setErrores([])
      setTab('ordenes')
    } finally {
      setSaving(false)
    }
  }

  // ─── Guardar proveedor ─────────────────────────────────────────────────────

  const guardarProveedor = async () => {
    if (!provForm.name) return
    await sb.from('suppliers').insert({
      name: provForm.name,
      contact: provForm.contact,
      phone: provForm.phone,
      email: provForm.email,
      rfc: provForm.rfc?.toUpperCase(),
      payment_terms: provForm.payment_terms || 'Contado',
      status: 'active',
    })
    setProvForm({})
    setShowProvForm(false)
    cargar()
  }

  // ─── Aprobar requisición ───────────────────────────────────────────────────

  const aprobarReq = async (id: string) => {
    await sb.from('purchase_requests').update({ status: 'approved' }).eq('id', id)
    cargar()
  }

  // ─── Cambiar estado OC ─────────────────────────────────────────────────────

  const cambiarEstadoOC = async (id: string, status: string) => {
    await sb.from('purchase_orders').update({ status }).eq('id', id)
    cargar()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Requisiciones, órdenes de compra y proveedores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setErrores([]); setTab('nueva_req') }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" /> Requisición
          </button>
          <button
            onClick={() => { setErrores([]); setTab('nueva_oc') }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Orden de Compra
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Req. pendientes', value: fmtN(kpis.reqPendientes), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'OC abiertas', value: fmtN(kpis.ocAbiertas), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Gasto este mes', value: fmt(kpis.totalOcMes), icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Proveedores activos', value: fmtN(kpis.proveedores), icon: Truck, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
            <k.icon className={`w-6 h-6 ${k.color}`} />
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'requisiciones', label: `Requisiciones (${requisiciones.length})` },
          { id: 'ordenes', label: `Órdenes de Compra (${ordenes.length})` },
          { id: 'proveedores', label: `Proveedores (${proveedores.length})` },
          { id: 'nueva_req', label: 'Nueva Requisición' },
          { id: 'nueva_oc', label: 'Nueva OC' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === t.id
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── REQUISICIONES ─────────────────────────────────────────────────────── */}
      {tab === 'requisiciones' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
                    {['Folio', 'Fecha', 'Solicitante', 'Dpto.', 'Artículos', 'Total est.', 'Prioridad', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requisiciones.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Sin requisiciones</td></tr>
                  ) : requisiciones.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.folio}</td>
                      <td className="px-4 py-3">{fmtDate(r.fecha)}</td>
                      <td className="px-4 py-3 font-medium">{r.solicitante}</td>
                      <td className="px-4 py-3 text-gray-500">{r.departamento}</td>
                      <td className="px-4 py-3 text-center">{fmtN(r.items?.length || 0)}</td>
                      <td className="px-4 py-3 font-medium">{fmt(r.total_estimado)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORIDAD_COLORS[r.prioridad]}`}>
                          {r.prioridad}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REQ_STATUS_COLORS[r.status]}`}>
                          {REQ_STATUS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => aprobarReq(r.id)}
                            className="p-1.5 rounded hover:bg-green-50 text-green-500"
                            title="Aprobar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ÓRDENES DE COMPRA ─────────────────────────────────────────────────── */}
      {tab === 'ordenes' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
                  {['Folio', 'Fecha', 'Proveedor', 'Artículos', 'Subtotal', 'IVA', 'Total', 'Entrega', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ordenes.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">Sin órdenes de compra</td></tr>
                ) : ordenes.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.folio}</td>
                    <td className="px-4 py-3">{fmtDate(o.fecha)}</td>
                    <td className="px-4 py-3 font-medium">{o.proveedor_nombre}</td>
                    <td className="px-4 py-3 text-center">{fmtN(o.items?.length || 0)}</td>
                    <td className="px-4 py-3">{fmt(o.subtotal)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(o.iva)}</td>
                    <td className="px-4 py-3 font-bold">{fmt(o.total)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{o.fecha_entrega ? fmtDate(o.fecha_entrega) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OC_STATUS_COLORS[o.status]}`}>
                        {OC_STATUS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {o.status === 'draft' && (
                          <button
                            onClick={() => cambiarEstadoOC(o.id, 'sent')}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Enviar
                          </button>
                        )}
                        {o.status === 'sent' && (
                          <button
                            onClick={() => cambiarEstadoOC(o.id, 'received')}
                            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                          >
                            Recibir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROVEEDORES ────────────────────────────────────────────────────────── */}
      {tab === 'proveedores' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowProvForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700"
            >
              <Plus className="w-4 h-4" /> Nuevo proveedor
            </button>
          </div>

          {showProvForm && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Nuevo proveedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Campo label="Nombre *" value={provForm.name} onChange={v => setProvForm(f => ({ ...f, name: v }))} />
                <Campo label="Contacto" value={provForm.contact} onChange={v => setProvForm(f => ({ ...f, contact: v }))} />
                <Campo label="Teléfono" value={provForm.phone} onChange={v => setProvForm(f => ({ ...f, phone: v }))} />
                <Campo label="Email" value={provForm.email} onChange={v => setProvForm(f => ({ ...f, email: v }))} />
                <Campo label="RFC" value={provForm.rfc} onChange={v => setProvForm(f => ({ ...f, rfc: v.toUpperCase() }))} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones de pago</label>
                  <select
                    value={provForm.payment_terms || 'Contado'}
                    onChange={e => setProvForm(f => ({ ...f, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {['Contado', 'Neto 15', 'Neto 30', 'Neto 45', 'Neto 60'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowProvForm(false); setProvForm({}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                  Cancelar
                </button>
                <button onClick={guardarProveedor} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">
                  Guardar proveedor
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proveedores.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    {p.contact && <p className="text-sm text-gray-500">{p.contact}</p>}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.payment_terms}</span>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                  {p.phone && <p>📞 {p.phone}</p>}
                  {p.email && <p>✉️ {p.email}</p>}
                  {p.rfc && <p>RFC: {p.rfc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NUEVA REQUISICIÓN ─────────────────────────────────────────────────── */}
      {tab === 'nueva_req' && (
        <div className="max-w-3xl space-y-4">
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-sm text-red-700 space-y-0.5">
                {errores.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-yellow-500" />
              Encabezado de la requisición
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Solicitante *" value={reqForm.solicitante} onChange={v => setReqForm(f => ({ ...f, solicitante: v }))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                <select value={reqForm.departamento} onChange={e => setReqForm(f => ({ ...f, departamento: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {['Mantenimiento', 'Operaciones', 'Administración', 'Seguridad', 'Gerencia'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select value={reqForm.prioridad} onChange={e => setReqForm(f => ({ ...f, prioridad: e.target.value as Requisicion['prioridad'] }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <Campo label="Fecha" value={reqForm.fecha} onChange={v => setReqForm(f => ({ ...f, fecha: v }))} type="date" />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Justificación</label>
                <textarea value={reqForm.justificacion} onChange={e => setReqForm(f => ({ ...f, justificacion: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="¿Por qué se necesita?" />
              </div>
            </div>
          </div>

          {/* Artículos */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Artículos solicitados
              </h3>
              <span className="text-sm text-gray-500">Total est.: <strong>{fmt(calcReq)}</strong></span>
            </div>
            {reqItems.map((item, i) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Descripción</label>}
                  <input
                    value={item.nombre}
                    onChange={e => setReqItems(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Refacción, material, servicio..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Cant.</label>}
                  <input
                    type="number" min={1}
                    value={item.cantidad || ''}
                    onChange={e => setReqItems(prev => prev.map((x, j) => j === i ? { ...x, cantidad: Number(e.target.value) } : x))}
                    placeholder="1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Unidad</label>}
                  <input
                    value={item.unidad}
                    onChange={e => setReqItems(prev => prev.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))}
                    placeholder="Pza"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">P. est.</label>}
                  <input
                    type="number" min={0}
                    value={item.precio_estimado || ''}
                    onChange={e => setReqItems(prev => prev.map((x, j) => j === i ? { ...x, precio_estimado: Number(e.target.value) } : x))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => setReqItems(prev => prev.filter((_, j) => j !== i))}
                    disabled={reqItems.length === 1}
                    className="p-2 text-gray-300 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setReqItems(prev => [...prev, emptyReqItem()])}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Agregar artículo
            </button>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setTab('requisiciones')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={guardarRequisicion}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Crear Requisición'}
            </button>
          </div>
        </div>
      )}

      {/* ── NUEVA OC ──────────────────────────────────────────────────────────── */}
      {tab === 'nueva_oc' && (
        <div className="max-w-3xl space-y-4">
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-sm text-red-700 space-y-0.5">
                {errores.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-500" />
              Datos de la orden
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <select
                  value={ocForm.proveedor_id}
                  onChange={e => setOcForm(f => ({ ...f, proveedor_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">— Selecciona proveedor —</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones de pago</label>
                <select value={ocForm.condiciones_pago} onChange={e => setOcForm(f => ({ ...f, condiciones_pago: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {['Contado', 'Neto 15', 'Neto 30', 'Neto 45', 'Neto 60'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Campo label="Fecha de entrega esperada" value={ocForm.fecha_entrega} onChange={v => setOcForm(f => ({ ...f, fecha_entrega: v }))} type="date" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IVA %</label>
                <select value={ocForm.iva_pct} onChange={e => setOcForm(f => ({ ...f, iva_pct: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value={0}>0% (Sin IVA)</option>
                  <option value={8}>8%</option>
                  <option value={16}>16%</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={ocForm.notas} onChange={e => setOcForm(f => ({ ...f, notas: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
              </div>
            </div>
          </div>

          {/* Artículos OC */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Artículos de la orden
              </h3>
            </div>
            {ocItems.map((item, i) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Descripción</label>}
                  <input
                    value={item.nombre}
                    onChange={e => setOcItems(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Artículo o servicio"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Cant.</label>}
                  <input
                    type="number" min={1}
                    value={item.cantidad || ''}
                    onChange={e => {
                      const cant = Number(e.target.value)
                      setOcItems(prev => prev.map((x, j) => j === i ? { ...x, cantidad: cant, subtotal: redondearMonto(cant * x.precio_unitario) } : x))
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Unidad</label>}
                  <input
                    value={item.unidad}
                    onChange={e => setOcItems(prev => prev.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))}
                    placeholder="Pza"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">P. unitario</label>}
                  <input
                    type="number" min={0}
                    value={item.precio_unitario || ''}
                    onChange={e => {
                      const precio = Number(e.target.value)
                      setOcItems(prev => prev.map((x, j) => j === i ? { ...x, precio_unitario: precio, subtotal: redondearMonto(x.cantidad * precio) } : x))
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Subtotal</label>}
                  <div className="px-2 py-2 text-sm font-medium text-gray-700">{fmt(item.subtotal || 0)}</div>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => setOcItems(prev => prev.filter((_, j) => j !== i))} disabled={ocItems.length === 1} className="p-2 text-gray-300 hover:text-red-400 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setOcItems(prev => [...prev, emptyOcItem()])} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar artículo
            </button>

            {/* Totales */}
            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{fmt(calcOC.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA ({ocForm.iva_pct}%)</span><span>{fmt(calcOC.iva)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span><span>{fmt(calcOC.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setTab('ordenes')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={guardarOC}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Crear Orden de Compra'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyReqItem(): ReqItem {
  return { id: crypto.randomUUID(), producto_id: '', nombre: '', cantidad: 1, unidad: 'Pza', precio_estimado: 0, notas: '' }
}

function emptyOcItem(): OcItem {
  return { id: crypto.randomUUID(), producto_id: '', nombre: '', cantidad: 1, unidad: 'Pza', precio_unitario: 0, subtotal: 0, recibido: 0 }
}

function Campo({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-slate-400" />
    </div>
  )
}
