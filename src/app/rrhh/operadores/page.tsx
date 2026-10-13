'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { capitalizarNombre, normalizarTelefono, sanitizarTexto } from '@/lib/trazabilidad'
import {
  User, Plus, Search, Eye, Edit2, Check, X, AlertTriangle,
  ChevronDown, FileText, Truck, Calendar, Phone, Hash,
  Shield, Star, TrendingUp, Loader2, AlertCircle, Clock,
  DollarSign, IdCard, Upload, RefreshCw, BadgeCheck
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Operador = {
  id: string
  first_name: string
  last_name: string
  employee_number: string
  phone: string
  email: string
  license_number: string
  license_type: string
  license_expiry: string
  daily_rate: number
  trip_bonus: number
  base_salary: number
  address: string
  hire_date: string
  birth_date: string
  curp: string
  rfc: string
  nss: string
  emergency_contact: string
  emergency_phone: string
  status: 'active' | 'inactive' | 'suspended'
  notes: string
  created_at: string
}

type TripHistorial = {
  id: string
  folio: string
  trip_date: string
  origin: string
  destination: string
  trip_type: string
  amount: number
  driver_commission: number
  status: string
}

type Documento = {
  id: string
  tipo: string
  folio: string
  emision: string
  vencimiento: string
  archivo_url: string
  status: string
}

type LiquidacionResumen = {
  id: string
  folio: string
  periodo_inicio: string
  periodo_fin: string
  total_neto: number
  status: string
  paid_at: string | null
}

type Anticipo = {
  id: string
  fecha: string
  concepto: string
  monto: number
  pagado: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-700',
}

const LICENSE_TYPES = ['A', 'B', 'C', 'D', 'E', 'F']

const TABS_DETALLE = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'viajes', label: 'Historial de viajes' },
  { id: 'liquidaciones', label: 'Liquidaciones' },
  { id: 'anticipos', label: 'Anticipos' },
  { id: 'costo', label: 'Costo operativo' },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OperadoresPage() {
  const sb = createClient()

  const [tab, setTab] = useState<'lista' | 'nuevo' | 'detalle'>('lista')
  const [tabDetalle, setTabDetalle] = useState('perfil')
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [seleccionado, setSeleccionado] = useState<Operador | null>(null)
  const [editando, setEditando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])

  // Detalle data
  const [viajes, setViajes] = useState<TripHistorial[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionResumen[]>([])
  const [anticipos, setAnticipos] = useState<Anticipo[]>([])

  // Nuevo operador form
  const [form, setForm] = useState<Partial<Operador>>({
    status: 'active',
    daily_rate: 0,
    trip_bonus: 0,
    base_salary: 0,
  })

  // ─── Carga ─────────────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('drivers')
      .select('*')
      .order('last_name')
    setOperadores((data || []) as Operador[])
    setLoading(false)
  }, [sb])

  useEffect(() => { cargar() }, [cargar])

  const cargarDetalle = useCallback(async (op: Operador) => {
    const [vRes, lRes, aRes] = await Promise.all([
      sb.from('trips')
        .select('id,folio,trip_date,origin,destination,trip_type,amount,driver_commission,status')
        .eq('driver_id', op.id)
        .order('trip_date', { ascending: false })
        .limit(50),
      sb.from('payroll_settlements')
        .select('id,folio,periodo_inicio,periodo_fin,total_neto,status,paid_at')
        .eq('driver_id', op.id)
        .order('created_at', { ascending: false })
        .limit(20),
      sb.from('driver_advances')
        .select('id,fecha,concepto,monto,pagado')
        .eq('driver_id', op.id)
        .order('fecha', { ascending: false })
        .limit(30),
    ])
    setViajes((vRes.data || []) as TripHistorial[])
    setLiquidaciones((lRes.data || []) as LiquidacionResumen[])
    setAnticipos((aRes.data || []) as Anticipo[])
  }, [sb])

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const hoy = new Date()
  const en30 = new Date(hoy.getTime() + 30 * 86400000)
  const en60 = new Date(hoy.getTime() + 60 * 86400000)

  const kpis = {
    total: operadores.length,
    activos: operadores.filter(o => o.status === 'active').length,
    vencen30: operadores.filter(o =>
      o.status === 'active' &&
      new Date(o.license_expiry) <= en30 &&
      new Date(o.license_expiry) >= hoy
    ).length,
    vencidos: operadores.filter(o =>
      o.status === 'active' && new Date(o.license_expiry) < hoy
    ).length,
  }

  // ─── Filtrado ──────────────────────────────────────────────────────────────

  const filtrados = operadores.filter(o => {
    const match = busqueda === '' ||
      `${o.first_name} ${o.last_name}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.employee_number?.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.license_number?.toLowerCase().includes(busqueda.toLowerCase())
    const estado = filtroStatus === 'todos' || o.status === filtroStatus
    return match && estado
  })

  // ─── Guardar operador ──────────────────────────────────────────────────────

  const guardar = async () => {
    const errs: string[] = []
    if (!form.first_name?.trim()) errs.push('El nombre es requerido')
    if (!form.last_name?.trim()) errs.push('El apellido es requerido')
    if (!form.license_number?.trim()) errs.push('El número de licencia es requerido')
    if (!form.license_expiry) errs.push('La fecha de vencimiento de licencia es requerida')
    if (errs.length > 0) { setErrores(errs); return }

    setSaving(true)
    try {
      const payload = {
        first_name: capitalizarNombre(form.first_name || ''),
        last_name: capitalizarNombre(form.last_name || ''),
        employee_number: form.employee_number || `OP-${Date.now().toString().slice(-5)}`,
        phone: form.phone ? normalizarTelefono(form.phone) : null,
        email: form.email || null,
        license_number: form.license_number?.toUpperCase(),
        license_type: form.license_type || 'E',
        license_expiry: form.license_expiry,
        daily_rate: form.daily_rate || 0,
        trip_bonus: form.trip_bonus || 0,
        base_salary: form.base_salary || 0,
        address: form.address ? sanitizarTexto(form.address) : null,
        hire_date: form.hire_date || null,
        birth_date: form.birth_date || null,
        curp: form.curp?.toUpperCase() || null,
        rfc: form.rfc?.toUpperCase() || null,
        nss: form.nss || null,
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
        status: form.status || 'active',
        notes: form.notes ? sanitizarTexto(form.notes) : null,
      }

      const { data: { user } } = await sb.auth.getUser()

      if (editando && seleccionado) {
        const { error } = await sb.from('drivers').update(payload).eq('id', seleccionado.id)
        if (error) { setErrores([error.message]); return }
        await auditLog({
          action: 'UPDATE',
          module: 'rrhh',
          table_name: 'drivers',
          record_id: seleccionado.id,
          record_folio: seleccionado.employee_number,
          before_data: { ...seleccionado } as Record<string, unknown>,
          after_data: payload as Record<string, unknown>,
          user_id: user?.id,
        })
      } else {
        const { data, error } = await sb.from('drivers').insert(payload).select().single()
        if (error) { setErrores([error.message]); return }
        await auditLog({
          action: 'INSERT',
          module: 'rrhh',
          table_name: 'drivers',
          record_id: data.id,
          record_folio: data.employee_number,
          after_data: payload as Record<string, unknown>,
          user_id: user?.id,
        })
      }

      await cargar()
      setTab('lista')
      setEditando(false)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setForm({ status: 'active', daily_rate: 0, trip_bonus: 0, base_salary: 0 })
    setErrores([])
  }

  const abrirEditar = (op: Operador) => {
    setForm({ ...op })
    setEditando(true)
    setTab('nuevo')
  }

  const abrirDetalle = (op: Operador) => {
    setSeleccionado(op)
    setTab('detalle')
    setTabDetalle('perfil')
    cargarDetalle(op)
  }

  // ─── Agregar anticipo ──────────────────────────────────────────────────────

  const [nuevoAnticipo, setNuevoAnticipo] = useState({ concepto: '', monto: 0, fecha: '' })
  const [showAnticipo, setShowAnticipo] = useState(false)

  const guardarAnticipo = async () => {
    if (!seleccionado || !nuevoAnticipo.concepto || !nuevoAnticipo.monto) return
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('driver_advances').insert({
      driver_id: seleccionado.id,
      fecha: nuevoAnticipo.fecha || new Date().toISOString().slice(0, 10),
      concepto: nuevoAnticipo.concepto,
      monto: nuevoAnticipo.monto,
      pagado: false,
      created_by: user?.id,
    })
    setNuevoAnticipo({ concepto: '', monto: 0, fecha: '' })
    setShowAnticipo(false)
    cargarDetalle(seleccionado)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operadores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de conductores y perfil operativo</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditando(false); setTab('nuevo') }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Operador
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'lista', label: 'Operadores' },
          { id: 'nuevo', label: editando ? 'Editar Operador' : 'Nuevo Operador' },
          ...(seleccionado ? [{ id: 'detalle', label: `${seleccionado.first_name} ${seleccionado.last_name}` }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'lista' | 'nuevo' | 'detalle')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB LISTA ───────────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total operadores', value: fmtN(kpis.total), icon: Users2, color: 'text-gray-600', bg: 'bg-gray-50' },
              { label: 'Activos', value: fmtN(kpis.activos), icon: BadgeCheck, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Licencia vence (30d)', value: fmtN(kpis.vencen30), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Licencia vencida', value: fmtN(kpis.vencidos), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
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

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, no. empleado o licencia..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="todos">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />Cargando operadores...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-red-50">
                      {['Operador', 'No. Empleado', 'Licencia', 'Vence', 'Tarifa/día', 'Bono viaje', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          No hay operadores{busqueda ? ` que coincidan con "${busqueda}"` : ''}
                        </td>
                      </tr>
                    ) : filtrados.map(o => {
                      const licExpiry = new Date(o.license_expiry)
                      const vencida = licExpiry < hoy
                      const proxima = licExpiry <= en30 && !vencida
                      return (
                        <tr key={o.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs">
                                {o.first_name?.[0]}{o.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-medium">{o.first_name} {o.last_name}</p>
                                {o.phone && <p className="text-xs text-gray-400">{o.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.employee_number}</td>
                          <td className="px-4 py-3 font-mono text-xs">{o.license_number}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {(vencida || proxima) && (
                                <AlertTriangle className={`w-3 h-3 ${vencida ? 'text-red-500' : 'text-yellow-500'}`} />
                              )}
                              <span className={`text-xs ${vencida ? 'text-red-600 font-medium' : proxima ? 'text-yellow-600' : 'text-gray-500'}`}>
                                {fmtDate(o.license_expiry)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium">{fmt(o.daily_rate)}</td>
                          <td className="px-4 py-3 text-green-700">{fmt(o.trip_bonus)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                              {STATUS_LABELS[o.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => abrirDetalle(o)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => abrirEditar(o)}
                                className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
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
      )}

      {/* ── TAB NUEVO / EDITAR ────────────────────────────────────────────────── */}
      {tab === 'nuevo' && (
        <div className="max-w-3xl space-y-6">
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <ul className="text-sm text-red-700 space-y-0.5">
                  {errores.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Datos personales */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-red-500" />
              Datos personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Nombre *" value={form.first_name} onChange={v => setForm(f => ({ ...f, first_name: v }))} />
              <Campo label="Apellido(s) *" value={form.last_name} onChange={v => setForm(f => ({ ...f, last_name: v }))} />
              <Campo label="No. Empleado" value={form.employee_number} onChange={v => setForm(f => ({ ...f, employee_number: v }))} placeholder="Auto-generado si se deja vacío" />
              <Campo label="Teléfono" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="10 dígitos" />
              <Campo label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
              <Campo label="Fecha contratación" value={form.hire_date} onChange={v => setForm(f => ({ ...f, hire_date: v }))} type="date" />
              <Campo label="Fecha nacimiento" value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} type="date" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Operador['status'] }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Campo label="Dirección" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
              </div>
            </div>
          </div>

          {/* Documentos oficiales */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <IdCard className="w-5 h-5 text-blue-500" />
              Documentos oficiales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="CURP" value={form.curp} onChange={v => setForm(f => ({ ...f, curp: v.toUpperCase() }))} placeholder="18 caracteres" />
              <Campo label="RFC" value={form.rfc} onChange={v => setForm(f => ({ ...f, rfc: v.toUpperCase() }))} placeholder="13 caracteres" />
              <Campo label="NSS (IMSS)" value={form.nss} onChange={v => setForm(f => ({ ...f, nss: v }))} />
              <Campo label="No. Licencia *" value={form.license_number} onChange={v => setForm(f => ({ ...f, license_number: v.toUpperCase() }))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de licencia</label>
                <select
                  value={form.license_type || 'E'}
                  onChange={e => setForm(f => ({ ...f, license_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {LICENSE_TYPES.map(l => <option key={l} value={l}>Tipo {l}</option>)}
                </select>
              </div>
              <Campo label="Vencimiento licencia *" value={form.license_expiry} onChange={v => setForm(f => ({ ...f, license_expiry: v }))} type="date" />
            </div>
          </div>

          {/* Perfil económico */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Perfil de compensación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoNum label="Salario base mensual" value={form.base_salary} onChange={v => setForm(f => ({ ...f, base_salary: v }))} />
              <CampoNum label="Tarifa diaria" value={form.daily_rate} onChange={v => setForm(f => ({ ...f, daily_rate: v }))} />
              <CampoNum label="Bono por viaje" value={form.trip_bonus} onChange={v => setForm(f => ({ ...f, trip_bonus: v }))} />
            </div>
          </div>

          {/* Contacto de emergencia */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-500" />
              Contacto de emergencia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Nombre" value={form.emergency_contact} onChange={v => setForm(f => ({ ...f, emergency_contact: v }))} />
              <Campo label="Teléfono" value={form.emergency_phone} onChange={v => setForm(f => ({ ...f, emergency_phone: v }))} />
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              placeholder="Observaciones sobre el operador..."
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => { setTab('lista'); setEditando(false); resetForm() }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear operador'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB DETALLE ──────────────────────────────────────────────────────── */}
      {tab === 'detalle' && seleccionado && (
        <div className="space-y-4">
          {/* Header operador */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xl">
                  {seleccionado.first_name?.[0]}{seleccionado.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {seleccionado.first_name} {seleccionado.last_name}
                  </h2>
                  <p className="text-gray-500 text-sm">{seleccionado.employee_number}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[seleccionado.status]}`}>
                      {STATUS_LABELS[seleccionado.status]}
                    </span>
                    <span className="text-xs text-gray-400">Lic. Tipo {seleccionado.license_type} · {seleccionado.license_number}</span>
                    {new Date(seleccionado.license_expiry) < hoy && (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Licencia vencida
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => abrirEditar(seleccionado)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" /> Editar
              </button>
            </div>

            {/* Mini KPIs del operador */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t">
              <MiniKPI label="Tarifa diaria" value={fmt(seleccionado.daily_rate)} />
              <MiniKPI label="Bono por viaje" value={fmt(seleccionado.trip_bonus)} />
              <MiniKPI label="Viajes registrados" value={fmtN(viajes.length)} />
              <MiniKPI label="Liquidaciones" value={fmtN(liquidaciones.length)} />
            </div>
          </div>

          {/* Sub-tabs detalle */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {TABS_DETALLE.map(t => (
              <button
                key={t.id}
                onClick={() => setTabDetalle(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  tabDetalle === t.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Perfil */}
          {tabDetalle === 'perfil' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard title="Datos personales">
                <InfoRow label="Teléfono" value={seleccionado.phone} />
                <InfoRow label="Email" value={seleccionado.email} />
                <InfoRow label="Dirección" value={seleccionado.address} />
                <InfoRow label="Fecha nacimiento" value={fmtDate(seleccionado.birth_date)} />
                <InfoRow label="Fecha contratación" value={fmtDate(seleccionado.hire_date)} />
              </InfoCard>
              <InfoCard title="Documentos oficiales">
                <InfoRow label="CURP" value={seleccionado.curp} mono />
                <InfoRow label="RFC" value={seleccionado.rfc} mono />
                <InfoRow label="NSS" value={seleccionado.nss} mono />
                <InfoRow label="Licencia" value={`${seleccionado.license_number} (Tipo ${seleccionado.license_type})`} mono />
                <InfoRow
                  label="Vence"
                  value={fmtDate(seleccionado.license_expiry)}
                  danger={new Date(seleccionado.license_expiry) < en60}
                />
              </InfoCard>
              <InfoCard title="Compensación">
                <InfoRow label="Salario base mensual" value={fmt(seleccionado.base_salary)} />
                <InfoRow label="Tarifa diaria" value={fmt(seleccionado.daily_rate)} />
                <InfoRow label="Bono por viaje" value={fmt(seleccionado.trip_bonus)} />
              </InfoCard>
              <InfoCard title="Contacto de emergencia">
                <InfoRow label="Nombre" value={seleccionado.emergency_contact} />
                <InfoRow label="Teléfono" value={seleccionado.emergency_phone} />
              </InfoCard>
              {seleccionado.notes && (
                <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Notas</p>
                  <p className="text-sm text-gray-700">{seleccionado.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Viajes */}
          {tabDetalle === 'viajes' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Historial de viajes</span>
                <span className="text-xs text-gray-500">{viajes.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b">
                      <th className="px-4 py-3 text-left">Folio</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Ruta</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-right">Importe</th>
                      <th className="px-4 py-3 text-right">Comisión</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {viajes.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin viajes registrados</td></tr>
                    ) : viajes.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.folio}</td>
                        <td className="px-4 py-3">{fmtDate(v.trip_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{v.origin} → {v.destination}</td>
                        <td className="px-4 py-3 capitalize text-gray-500 text-xs">{v.trip_type}</td>
                        <td className="px-4 py-3 text-right">{fmt(v.amount)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(v.driver_commission)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">{v.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {viajes.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold bg-gray-50">
                        <td colSpan={4} className="px-4 py-3 text-right text-xs text-gray-500">TOTALES:</td>
                        <td className="px-4 py-3 text-right">{fmt(viajes.reduce((s, v) => s + v.amount, 0))}</td>
                        <td className="px-4 py-3 text-right text-green-700">{fmt(viajes.reduce((s, v) => s + v.driver_commission, 0))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Liquidaciones */}
          {tabDetalle === 'liquidaciones' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">Liquidaciones del operador</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b">
                      <th className="px-4 py-3 text-left">Folio</th>
                      <th className="px-4 py-3 text-left">Período</th>
                      <th className="px-4 py-3 text-right">Neto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-left">Fecha pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {liquidaciones.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin liquidaciones</td></tr>
                    ) : liquidaciones.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{l.folio}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(l.periodo_inicio)} → {fmtDate(l.periodo_fin)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(l.total_neto)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            l.status === 'paid' ? 'bg-green-100 text-green-700' :
                            l.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {l.status === 'paid' ? 'Pagada' : l.status === 'approved' ? 'Aprobada' : 'Borrador'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{l.paid_at ? fmtDate(l.paid_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Anticipos */}
          {tabDetalle === 'anticipos' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Anticipos</p>
                  <p className="text-xs text-gray-400">
                    Pendiente: {fmt(anticipos.filter(a => !a.pagado).reduce((s, a) => s + a.monto, 0))}
                  </p>
                </div>
                <button
                  onClick={() => setShowAnticipo(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  <Plus className="w-4 h-4" /> Nuevo anticipo
                </button>
              </div>

              {showAnticipo && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={nuevoAnticipo.fecha}
                      onChange={e => setNuevoAnticipo(p => ({ ...p, fecha: e.target.value }))}
                      type="date"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      value={nuevoAnticipo.concepto}
                      onChange={e => setNuevoAnticipo(p => ({ ...p, concepto: e.target.value }))}
                      placeholder="Concepto del anticipo"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      value={nuevoAnticipo.monto || ''}
                      onChange={e => setNuevoAnticipo(p => ({ ...p, monto: Number(e.target.value) }))}
                      type="number"
                      placeholder="Monto"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAnticipo(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                      Cancelar
                    </button>
                    <button onClick={guardarAnticipo} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                      Guardar anticipo
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b bg-gray-50">
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {anticipos.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin anticipos registrados</td></tr>
                    ) : anticipos.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{fmtDate(a.fecha)}</td>
                        <td className="px-4 py-3">{a.concepto}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(a.monto)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.pagado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {a.pagado ? 'Descontado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Costo operativo */}
          {tabDetalle === 'costo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Costo operativo mensual estimado</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Salario base</span>
                    <span>{fmt(seleccionado.base_salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IMSS estimado (~20%)</span>
                    <span>{fmt(seleccionado.base_salary * 0.20)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vacaciones y aguinaldo (~18%)</span>
                    <span>{fmt(seleccionado.base_salary * 0.18)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Costo total estimado</span>
                    <span className="text-red-700">{fmt(seleccionado.base_salary * 1.38)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Productividad (últimos 50 viajes)</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total viajes</span>
                    <span>{fmtN(viajes.length)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ingresos generados</span>
                    <span>{fmt(viajes.reduce((s, v) => s + v.amount, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Comisiones pagadas</span>
                    <span className="text-red-600">{fmt(viajes.reduce((s, v) => s + v.driver_commission, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">% Comisión promedio</span>
                    <span>
                      {viajes.length > 0
                        ? `${((viajes.reduce((s, v) => s + v.driver_commission, 0) / viajes.reduce((s, v) => s + v.amount, 0)) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documentos tab (placeholder para futura expansión) */}
          {tabDetalle === 'documentos' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Módulo de gestión de documentos en desarrollo</p>
              <p className="text-xs mt-1">Aquí se podrán cargar: licencia, CURP, NSS, contratos, etc.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Users2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function Campo({
  label, value, onChange, placeholder, type = 'text'
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
      />
    </div>
  )
}

function CampoNum({
  label, value, onChange
}: {
  label: string
  value?: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value))}
        placeholder="0.00"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
      />
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono, danger }: {
  label: string; value?: string | null; mono?: boolean; danger?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} ${danger ? 'text-red-600 font-medium' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-base font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
