'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
import { getNextFolio } from '@/lib/audit'
import { trazarLiquidacion, trazarPagoLiquidacion, redondearMonto, validateAmount } from '@/lib/trazabilidad'
import {
  FileText, Plus, Search, Filter, Check, X, Eye, Printer,
  ChevronDown, ChevronUp, AlertCircle, Download, Clock,
  DollarSign, TrendingUp, Users, CheckCircle, Loader2,
  Calendar, Truck, Banknote, Minus, RefreshCw
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Operador = {
  id: string
  first_name: string
  last_name: string
  license_number: string
  license_expiry: string
  employee_number: string
  daily_rate: number
  trip_bonus: number
  phone: string
  status: string
}

type Viaje = {
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

type Anticipo = {
  id: string
  fecha: string
  concepto: string
  monto: number
  pagado: boolean
}

type DeduccionConcepto = {
  id: string
  concepto: string
  monto: number
  tipo: 'fija' | 'porcentaje' | 'manual'
}

type Liquidacion = {
  id: string
  folio: string
  driver_id: string
  operador_nombre: string
  periodo_inicio: string
  periodo_fin: string
  dias_laborados: number
  viajes_count: number
  total_viajes: number
  salario_base: number
  bonos_viaje: number
  otros_ingresos: number
  anticipos: number
  deducciones_imss: number
  otras_deducciones: number
  total_bruto: number
  total_deducciones: number
  total_neto: number
  metodo_pago: string
  notas: string
  status: 'draft' | 'approved' | 'paid'
  created_at: string
  approved_at: string | null
  paid_at: string | null
}

type NuevaLiquidacion = {
  driver_id: string
  periodo_inicio: string
  periodo_fin: string
  dias_laborados: number
  otros_ingresos: number
  deducciones_imss: number
  otras_deducciones: number
  metodo_pago: string
  notas: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  paid: 'Pagada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Depósito']

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LiquidacionesPage() {
  const sb = createClient()

  const [tab, setTab] = useState<'lista' | 'nueva' | 'detalle'>('lista')
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [seleccionada, setSeleccionada] = useState<Liquidacion | null>(null)

  // Wizard nueva liquidación
  const [paso, setPaso] = useState(1)
  const [operadorSel, setOperadorSel] = useState<Operador | null>(null)
  const [viajesPeriodo, setViajesPeriodo] = useState<Viaje[]>([])
  const [anticiposPeriodo, setAnticipoPeriodo] = useState<Anticipo[]>([])
  const [deduccionesCustom, setDeduccionesCustom] = useState<DeduccionConcepto[]>([])
  const [form, setForm] = useState<NuevaLiquidacion>({
    driver_id: '',
    periodo_inicio: '',
    periodo_fin: '',
    dias_laborados: 0,
    otros_ingresos: 0,
    deducciones_imss: 0,
    otras_deducciones: 0,
    metodo_pago: 'Transferencia',
    notas: '',
  })
  const [errores, setErrores] = useState<string[]>([])

  // ─── Carga inicial ─────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true)
    const [liqRes, opRes] = await Promise.all([
      sb.from('payroll_settlements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      sb.from('drivers')
        .select('id,first_name,last_name,license_number,license_expiry,employee_number,daily_rate,trip_bonus,phone,status')
        .eq('status', 'active')
        .order('first_name'),
    ])
    setLiquidaciones((liqRes.data || []) as Liquidacion[])
    setOperadores((opRes.data || []) as Operador[])
    setLoading(false)
  }, [sb])

  useEffect(() => { cargar() }, [cargar])

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = {
    total: liquidaciones.length,
    pendientes: liquidaciones.filter(l => l.status === 'draft').length,
    aprobadas: liquidaciones.filter(l => l.status === 'approved').length,
    pagadas: liquidaciones.filter(l => l.status === 'paid').length,
    montoPendiente: liquidaciones
      .filter(l => l.status === 'approved')
      .reduce((s, l) => s + (l.total_neto || 0), 0),
    montoPagado: liquidaciones
      .filter(l => l.status === 'paid')
      .reduce((s, l) => s + (l.total_neto || 0), 0),
  }

  // ─── Filtrado ──────────────────────────────────────────────────────────────

  const filtradas = liquidaciones.filter(l => {
    const match = busqueda === '' ||
      l.operador_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.folio?.toLowerCase().includes(busqueda.toLowerCase())
    const estado = filtroEstado === 'todos' || l.status === filtroEstado
    return match && estado
  })

  // ─── Cargar viajes del período seleccionado ────────────────────────────────

  const cargarViajesPeriodo = async (driverId: string, inicio: string, fin: string) => {
    if (!driverId || !inicio || !fin) return
    const { data } = await sb.from('trips')
      .select('id,folio,trip_date,origin,destination,trip_type,amount,driver_commission,status')
      .eq('driver_id', driverId)
      .gte('trip_date', inicio)
      .lte('trip_date', fin)
      .in('status', ['completed', 'closed'])
      .order('trip_date')
    setViajesPeriodo((data || []) as Viaje[])

    // Cargar anticipos pendientes del operador
    const { data: ants } = await sb.from('driver_advances')
      .select('id,fecha,concepto,monto,pagado')
      .eq('driver_id', driverId)
      .eq('pagado', false)
    setAnticipoPeriodo((ants || []) as Anticipo[])
  }

  // ─── Cálculos de liquidación ───────────────────────────────────────────────

  const calculos = (() => {
    if (!operadorSel) return null
    const salarioBase = (form.dias_laborados || 0) * (operadorSel.daily_rate || 0)
    const bonosViaje = viajesPeriodo.reduce((s, v) => s + (v.driver_commission || 0), 0)
    const totalViajes = viajesPeriodo.reduce((s, v) => s + (v.amount || 0), 0)
    const totalAnticipos = anticiposPeriodo.reduce((s, a) => s + a.monto, 0)
    const totalDeducCustom = deduccionesCustom.reduce((s, d) => s + d.monto, 0)
    const totalBruto = redondearMonto(salarioBase + bonosViaje + (form.otros_ingresos || 0))
    const totalDeducciones = redondearMonto(
      (form.deducciones_imss || 0) + totalAnticipos + totalDeducCustom + (form.otras_deducciones || 0)
    )
    const totalNeto = redondearMonto(totalBruto - totalDeducciones)
    return {
      salarioBase, bonosViaje, totalViajes,
      totalAnticipos, totalDeducCustom,
      totalBruto, totalDeducciones, totalNeto,
    }
  })()

  // ─── Guardar nueva liquidación ─────────────────────────────────────────────

  const guardarLiquidacion = async () => {
    if (!operadorSel || !calculos) return
    const errs: string[] = []
    if (!form.periodo_inicio) errs.push('Selecciona el período de inicio')
    if (!form.periodo_fin) errs.push('Selecciona el período fin')
    if (form.dias_laborados <= 0) errs.push('Los días laborados deben ser mayor a 0')
    const montoVal = validateAmount(calculos.totalNeto, 'total neto')
    if (!montoVal.valid) errs.push(...montoVal.errors.map(e => e.message))
    if (errs.length > 0) { setErrores(errs); return }

    setSaving(true)
    try {
      const folio = await getNextFolio('liquidacion')
      const operadorNombre = `${operadorSel.first_name} ${operadorSel.last_name}`

      const { data, error } = await sb.from('payroll_settlements').insert({
        folio,
        driver_id: operadorSel.id,
        operador_nombre: operadorNombre,
        periodo_inicio: form.periodo_inicio,
        periodo_fin: form.periodo_fin,
        dias_laborados: form.dias_laborados,
        viajes_count: viajesPeriodo.length,
        total_viajes: calculos.totalViajes,
        salario_base: calculos.salarioBase,
        bonos_viaje: calculos.bonosViaje,
        otros_ingresos: form.otros_ingresos,
        anticipos: calculos.totalAnticipos,
        deducciones_imss: form.deducciones_imss,
        otras_deducciones: calculos.totalDeducCustom + form.otras_deducciones,
        total_bruto: calculos.totalBruto,
        total_deducciones: calculos.totalDeducciones,
        total_neto: calculos.totalNeto,
        metodo_pago: form.metodo_pago,
        notas: form.notas,
        status: 'draft',
        trip_ids: viajesPeriodo.map(v => v.id),
        advance_ids: anticiposPeriodo.map(a => a.id),
        deductions_detail: deduccionesCustom,
      }).select().single()

      if (error) { setErrores([error.message]); return }

      // Marcar anticipos como pagados
      if (anticiposPeriodo.length > 0) {
        await sb.from('driver_advances')
          .update({ pagado: true, liquidacion_id: data.id })
          .in('id', anticiposPeriodo.map(a => a.id))
      }

      // Audit trail
      const { data: { user } } = await sb.auth.getUser()
      await trazarLiquidacion({
        liquidacion_id: data.id,
        folio,
        operador_id: operadorSel.id,
        operador_nombre: operadorNombre,
        periodo: `${form.periodo_inicio} → ${form.periodo_fin}`,
        total_bruto: calculos.totalBruto,
        total_deducciones: calculos.totalDeducciones,
        total_neto: calculos.totalNeto,
        viajes_count: viajesPeriodo.length,
        user_id: user?.id || '',
      })

      await cargar()
      resetForm()
      setTab('lista')
    } finally {
      setSaving(false)
    }
  }

  // ─── Aprobar liquidación ───────────────────────────────────────────────────

  const aprobarLiquidacion = async (liq: Liquidacion) => {
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('payroll_settlements').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    }).eq('id', liq.id)
    await cargar()
    if (seleccionada?.id === liq.id) {
      setSeleccionada({ ...liq, status: 'approved', approved_at: new Date().toISOString() })
    }
  }

  // ─── Marcar como pagada ────────────────────────────────────────────────────

  const marcarPagada = async (liq: Liquidacion) => {
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('payroll_settlements').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: user?.id,
    }).eq('id', liq.id)

    await trazarPagoLiquidacion({
      liquidacion_id: liq.id,
      folio: liq.folio,
      operador_nombre: liq.operador_nombre,
      monto_antes: liq.total_neto,
      monto_pagado: liq.total_neto,
      monto_despues: 0,
      metodo: liq.metodo_pago,
      user_id: user?.id || '',
    })

    await cargar()
    if (seleccionada?.id === liq.id) {
      setSeleccionada({ ...liq, status: 'paid', paid_at: new Date().toISOString() })
    }
  }

  // ─── Reset form ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setPaso(1)
    setOperadorSel(null)
    setViajesPeriodo([])
    setAnticipoPeriodo([])
    setDeduccionesCustom([])
    setForm({
      driver_id: '',
      periodo_inicio: '',
      periodo_fin: '',
      dias_laborados: 0,
      otros_ingresos: 0,
      deducciones_imss: 0,
      otras_deducciones: 0,
      metodo_pago: 'Transferencia',
      notas: '',
    })
    setErrores([])
  }

  // ─── Agregar deducción custom ──────────────────────────────────────────────

  const agregarDeduccion = () => {
    setDeduccionesCustom(prev => [
      ...prev,
      { id: crypto.randomUUID(), concepto: '', monto: 0, tipo: 'manual' },
    ])
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidaciones de Operadores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cálculo y pago de liquidaciones quincenales/semanales
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setTab('nueva') }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Liquidación
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'lista', label: 'Liquidaciones' },
          { id: 'nueva', label: 'Nueva Liquidación' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as 'lista' | 'nueva' | 'detalle'); if (t.id !== 'nueva') setSeleccionada(null) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
        {seleccionada && (
          <button
            onClick={() => setTab('detalle')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === 'detalle'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {seleccionada.folio}
          </button>
        )}
      </div>

      {/* ── TAB LISTA ───────────────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: fmtN(kpis.total), icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' },
              { label: 'Borradores', value: fmtN(kpis.pendientes), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Por pagar', value: fmt(kpis.montoPendiente), icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Pagado (total)', value: fmt(kpis.montoPagado), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
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
                placeholder="Buscar por operador o folio..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="approved">Aprobada</option>
              <option value="paid">Pagada</option>
            </select>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Cargando liquidaciones...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-red-50">
                      {['Folio', 'Operador', 'Período', 'Viajes', 'Bruto', 'Deducciones', 'Neto', 'Método', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtradas.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                          No hay liquidaciones
                        </td>
                      </tr>
                    ) : filtradas.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{l.folio}</td>
                        <td className="px-4 py-3 font-medium">{l.operador_nombre}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {fmtDate(l.periodo_inicio)} → {fmtDate(l.periodo_fin)}
                        </td>
                        <td className="px-4 py-3 text-center">{fmtN(l.viajes_count)}</td>
                        <td className="px-4 py-3 font-medium">{fmt(l.total_bruto)}</td>
                        <td className="px-4 py-3 text-red-600">-{fmt(l.total_deducciones)}</td>
                        <td className="px-4 py-3 font-bold text-green-700">{fmt(l.total_neto)}</td>
                        <td className="px-4 py-3 text-gray-500">{l.metodo_pago}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-gray-100'}`}>
                            {STATUS_LABELS[l.status] || l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setSeleccionada(l); setTab('detalle') }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {l.status === 'draft' && (
                              <button
                                onClick={() => aprobarLiquidacion(l)}
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600"
                                title="Aprobar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {l.status === 'approved' && (
                              <button
                                onClick={() => marcarPagada(l)}
                                className="p-1.5 rounded hover:bg-green-50 text-green-400 hover:text-green-600"
                                title="Marcar como pagada"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB NUEVA LIQUIDACIÓN ────────────────────────────────────────────── */}
      {tab === 'nueva' && (
        <div className="max-w-4xl space-y-6">
          {/* Stepper */}
          <div className="flex items-center gap-0">
            {[
              { n: 1, label: 'Operador y Período' },
              { n: 2, label: 'Viajes y Conceptos' },
              { n: 3, label: 'Revisión y Guardar' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    paso >= s.n ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {paso > s.n ? <Check className="w-4 h-4" /> : s.n}
                  </div>
                  <span className={`text-sm font-medium ${paso >= s.n ? 'text-red-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-3 ${paso > s.n ? 'bg-red-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <ul className="text-sm text-red-700 space-y-0.5">
                  {errores.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* PASO 1: Operador y período */}
          {paso === 1 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                Seleccionar Operador y Período
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operador *</label>
                  <select
                    value={form.driver_id}
                    onChange={e => {
                      const op = operadores.find(o => o.id === e.target.value) || null
                      setOperadorSel(op)
                      setForm(f => ({ ...f, driver_id: e.target.value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  >
                    <option value="">— Selecciona operador —</option>
                    {operadores.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.first_name} {o.last_name} — {o.employee_number}
                      </option>
                    ))}
                  </select>
                </div>

                {operadorSel && (
                  <div className="md:col-span-2 bg-gray-50 rounded-lg p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-gray-500 text-xs">N° Empleado</p>
                      <p className="font-medium">{operadorSel.employee_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Tarifa diaria</p>
                      <p className="font-medium text-green-700">{fmt(operadorSel.daily_rate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Bono por viaje</p>
                      <p className="font-medium text-green-700">{fmt(operadorSel.trip_bonus)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Licencia vence</p>
                      <p className={`font-medium ${
                        new Date(operadorSel.license_expiry) < new Date(Date.now() + 30 * 86400000)
                          ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {fmtDate(operadorSel.license_expiry)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período inicio *</label>
                  <input
                    type="date"
                    value={form.periodo_inicio}
                    onChange={e => {
                      setForm(f => ({ ...f, periodo_inicio: e.target.value }))
                      if (form.periodo_fin && form.driver_id) {
                        cargarViajesPeriodo(form.driver_id, e.target.value, form.periodo_fin)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período fin *</label>
                  <input
                    type="date"
                    value={form.periodo_fin}
                    onChange={e => {
                      setForm(f => ({ ...f, periodo_fin: e.target.value }))
                      if (form.periodo_inicio && form.driver_id) {
                        cargarViajesPeriodo(form.driver_id, form.periodo_inicio, e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días laborados *</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={form.dias_laborados || ''}
                    onChange={e => setForm(f => ({ ...f, dias_laborados: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                  <select
                    value={form.metodo_pago}
                    onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  >
                    {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const errs: string[] = []
                    if (!form.driver_id) errs.push('Selecciona un operador')
                    if (!form.periodo_inicio) errs.push('Ingresa la fecha de inicio del período')
                    if (!form.periodo_fin) errs.push('Ingresa la fecha fin del período')
                    if (form.dias_laborados <= 0) errs.push('Los días laborados deben ser mayor a 0')
                    if (errs.length > 0) { setErrores(errs); return }
                    setErrores([])
                    setPaso(2)
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Viajes y conceptos */}
          {paso === 2 && (
            <div className="space-y-4">
              {/* Viajes del período */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-red-500" />
                  Viajes completados en el período
                  <span className="ml-auto text-sm font-normal text-gray-500">{viajesPeriodo.length} viajes</span>
                </h3>
                {viajesPeriodo.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    No hay viajes completados en este período para el operador seleccionado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase border-b">
                          <th className="pb-2 text-left">Folio</th>
                          <th className="pb-2 text-left">Fecha</th>
                          <th className="pb-2 text-left">Ruta</th>
                          <th className="pb-2 text-right">Importe</th>
                          <th className="pb-2 text-right">Comisión</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {viajesPeriodo.map(v => (
                          <tr key={v.id} className="hover:bg-gray-50">
                            <td className="py-2 font-mono text-xs text-gray-500">{v.folio}</td>
                            <td className="py-2">{fmtDate(v.trip_date)}</td>
                            <td className="py-2 text-gray-600">{v.origin} → {v.destination}</td>
                            <td className="py-2 text-right">{fmt(v.amount)}</td>
                            <td className="py-2 text-right font-medium text-green-700">{fmt(v.driver_commission)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 font-semibold">
                          <td colSpan={3} className="py-2 text-right text-xs text-gray-500">TOTALES:</td>
                          <td className="py-2 text-right">{fmt(viajesPeriodo.reduce((s, v) => s + v.amount, 0))}</td>
                          <td className="py-2 text-right text-green-700">{fmt(viajesPeriodo.reduce((s, v) => s + v.driver_commission, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Anticipos pendientes */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-orange-500" />
                  Anticipos por descontar
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {fmt(anticiposPeriodo.reduce((s, a) => s + a.monto, 0))}
                  </span>
                </h3>
                {anticiposPeriodo.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">Sin anticipos pendientes</p>
                ) : (
                  <div className="space-y-2">
                    {anticiposPeriodo.map(a => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                        <div>
                          <p className="font-medium">{a.concepto}</p>
                          <p className="text-xs text-gray-500">{fmtDate(a.fecha)}</p>
                        </div>
                        <span className="font-medium text-orange-600">-{fmt(a.monto)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Otros ingresos y deducciones */}
              <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Conceptos adicionales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Otros ingresos</label>
                    <input
                      type="number"
                      min={0}
                      value={form.otros_ingresos || ''}
                      onChange={e => setForm(f => ({ ...f, otros_ingresos: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IMSS / Seg. Social</label>
                    <input
                      type="number"
                      min={0}
                      value={form.deducciones_imss || ''}
                      onChange={e => setForm(f => ({ ...f, deducciones_imss: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Otras deducciones</label>
                    <input
                      type="number"
                      min={0}
                      value={form.otras_deducciones || ''}
                      onChange={e => setForm(f => ({ ...f, otras_deducciones: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Deducciones custom */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Conceptos adicionales de deducción</span>
                    <button
                      onClick={agregarDeduccion}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                  {deduccionesCustom.map((d, i) => (
                    <div key={d.id} className="flex gap-2 mb-2">
                      <input
                        value={d.concepto}
                        onChange={e => setDeduccionesCustom(prev => prev.map((x, j) => j === i ? { ...x, concepto: e.target.value } : x))}
                        placeholder="Concepto"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={d.monto || ''}
                        onChange={e => setDeduccionesCustom(prev => prev.map((x, j) => j === i ? { ...x, monto: Number(e.target.value) } : x))}
                        placeholder="0.00"
                        className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => setDeduccionesCustom(prev => prev.filter((_, j) => j !== i))}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setPaso(1)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => { setErrores([]); setPaso(3) }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Revisar →
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Resumen */}
          {paso === 3 && calculos && operadorSel && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                Resumen de Liquidación
              </h2>

              {/* Encabezado */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Operador</p>
                  <p className="font-semibold">{operadorSel.first_name} {operadorSel.last_name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{operadorSel.employee_number}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Período</p>
                  <p className="font-medium">{fmtDate(form.periodo_inicio)} → {fmtDate(form.periodo_fin)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{form.dias_laborados} días laborados</p>
                </div>
              </div>

              {/* Desglose */}
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">INGRESOS</div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-600">Salario base ({form.dias_laborados} días × {fmt(operadorSel.daily_rate)})</span>
                  <span className="font-medium text-green-700">{fmt(calculos.salarioBase)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-600">Bonos por viaje ({viajesPeriodo.length} viajes)</span>
                  <span className="font-medium text-green-700">{fmt(calculos.bonosViaje)}</span>
                </div>
                {form.otros_ingresos > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">Otros ingresos</span>
                    <span className="font-medium text-green-700">{fmt(form.otros_ingresos)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-semibold text-base border-b-2 border-gray-200">
                  <span>Total bruto</span>
                  <span className="text-green-700">{fmt(calculos.totalBruto)}</span>
                </div>

                <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2 mt-4">DEDUCCIONES</div>
                {form.deducciones_imss > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">IMSS / Seguridad Social</span>
                    <span className="font-medium text-red-600">-{fmt(form.deducciones_imss)}</span>
                  </div>
                )}
                {calculos.totalAnticipos > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">Anticipos ({anticiposPeriodo.length})</span>
                    <span className="font-medium text-red-600">-{fmt(calculos.totalAnticipos)}</span>
                  </div>
                )}
                {deduccionesCustom.map(d => (
                  <div key={d.id} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">{d.concepto}</span>
                    <span className="font-medium text-red-600">-{fmt(d.monto)}</span>
                  </div>
                ))}
                {form.otras_deducciones > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">Otras deducciones</span>
                    <span className="font-medium text-red-600">-{fmt(form.otras_deducciones)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-semibold border-b border-gray-200">
                  <span>Total deducciones</span>
                  <span className="text-red-600">-{fmt(calculos.totalDeducciones)}</span>
                </div>

                {/* Neto */}
                <div className="flex justify-between py-4 text-xl font-bold">
                  <span>NETO A PAGAR</span>
                  <span className="text-green-700">{fmt(calculos.totalNeto)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Banknote className="w-4 h-4" />
                  Método: {form.metodo_pago}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setPaso(2)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  ← Atrás
                </button>
                <button
                  onClick={guardarLiquidacion}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar Liquidación'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB DETALLE ──────────────────────────────────────────────────────── */}
      {tab === 'detalle' && seleccionada && (
        <div className="max-w-3xl space-y-4">
          {/* Header detalle */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">{seleccionada.folio}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[seleccionada.status]}`}>
                    {STATUS_LABELS[seleccionada.status]}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{seleccionada.operador_nombre}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {fmtDate(seleccionada.periodo_inicio)} → {fmtDate(seleccionada.periodo_fin)} ·{' '}
                  {seleccionada.dias_laborados} días
                </p>
              </div>
              <div className="flex gap-2">
                {seleccionada.status === 'draft' && (
                  <button
                    onClick={() => aprobarLiquidacion(seleccionada)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4" /> Aprobar
                  </button>
                )}
                {seleccionada.status === 'approved' && (
                  <button
                    onClick={() => marcarPagada(seleccionada)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    <DollarSign className="w-4 h-4" /> Registrar Pago
                  </button>
                )}
              </div>
            </div>

            {/* Desglose completo */}
            <div className="space-y-1 text-sm border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Ingresos</p>
                  <RowDetalle label="Salario base" value={fmt(seleccionada.salario_base)} />
                  <RowDetalle label={`Bonos viaje (${seleccionada.viajes_count} viajes)`} value={fmt(seleccionada.bonos_viaje)} />
                  {seleccionada.otros_ingresos > 0 && (
                    <RowDetalle label="Otros ingresos" value={fmt(seleccionada.otros_ingresos)} />
                  )}
                  <RowDetalle label="TOTAL BRUTO" value={fmt(seleccionada.total_bruto)} bold />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Deducciones</p>
                  {seleccionada.deducciones_imss > 0 && (
                    <RowDetalle label="IMSS" value={`-${fmt(seleccionada.deducciones_imss)}`} red />
                  )}
                  {seleccionada.anticipos > 0 && (
                    <RowDetalle label="Anticipos" value={`-${fmt(seleccionada.anticipos)}`} red />
                  )}
                  {seleccionada.otras_deducciones > 0 && (
                    <RowDetalle label="Otras deducciones" value={`-${fmt(seleccionada.otras_deducciones)}`} red />
                  )}
                  <RowDetalle label="TOTAL DEDUCCIONES" value={`-${fmt(seleccionada.total_deducciones)}`} bold red />
                </div>
              </div>
              <div className="border-t-2 border-gray-200 pt-3 mt-3 flex justify-between text-xl font-bold">
                <span>NETO A PAGAR</span>
                <span className="text-green-700">{fmt(seleccionada.total_neto)}</span>
              </div>
              <p className="text-sm text-gray-500">Método: {seleccionada.metodo_pago}</p>
            </div>

            {/* Timeline */}
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Historial</p>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Creada {fmtDate(seleccionada.created_at)}
                </div>
                {seleccionada.approved_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Aprobada {fmtDate(seleccionada.approved_at)}
                  </div>
                )}
                {seleccionada.paid_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Pagada {fmtDate(seleccionada.paid_at)}
                  </div>
                )}
              </div>
            </div>

            {seleccionada.notas && (
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Notas</p>
                <p className="text-sm text-gray-700">{seleccionada.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente ────────────────────────────────────────────────────────────

function RowDetalle({
  label, value, bold, red,
}: {
  label: string
  value: string
  bold?: boolean
  red?: boolean
}) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold border-t' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className={red ? 'text-red-600' : bold ? 'text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  )
}
