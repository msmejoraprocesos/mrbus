'use client'

/**
 * Nómina — MrBus
 * Cálculo, generación y pago de nómina quincenal/mensual
 * IMSS, ISR (tabla SAT), INFONAVIT, SBC
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN, cn } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'

// ── Tablas ISR 2024 (quincenal) ───────────────────────────────────────────
const ISR_TABLA_QUINCENAL = [
  { li: 0,        ls: 1_013.30,  cuota: 0,        porcentaje: 1.92 },
  { li: 1_013.31, ls: 8_599.43,  cuota: 19.46,    porcentaje: 6.40 },
  { li: 8_599.44, ls: 15_103.65, cuota: 505.39,   porcentaje: 10.88 },
  { li: 15_103.66,ls: 17_588.99, cuota: 1_213.30, porcentaje: 16.00 },
  { li: 17_589.00,ls: 21_051.05, cuota: 1_610.18, porcentaje: 17.92 },
  { li: 21_051.06,ls: 42_454.28, cuota: 2_230.87, porcentaje: 21.36 },
  { li: 42_454.29,ls: 66_922.58, cuota: 6_798.60, porcentaje: 23.52 },
  { li: 66_922.59,ls: 85_604.28, cuota: 12_548.14,porcentaje: 30.00 },
  { li: 85_604.29,ls: 128_406.42,cuota: 18_152.72,porcentaje: 32.00 },
  { li: 128_406.43,ls: 9_999_999, cuota: 31_859.01,porcentaje: 34.00 },
]

function calcISR(baseGravable: number): number {
  const fila = ISR_TABLA_QUINCENAL.find(f => baseGravable >= f.li && baseGravable <= f.ls)
  if (!fila) return 0
  return fila.cuota + (baseGravable - fila.li) * (fila.porcentaje / 100)
}

// ── IMSS cuotas obrero (aprox. 2024) ─────────────────────────────────────
const IMSS_OBRERO_PCT = {
  enfermedades_maternidad: 0.00375,   // 0.375%
  invalidez_vida: 0.00625,             // 0.625%
  retiro: 0.00,                        // a cargo del patrón
  cesantia_vejez: 0.01125,             // 1.125%
  guarderias: 0.00,                    // a cargo del patrón
  total: 0.02125,                      // 2.125%
}

const PERIODICIDADES = [
  { id: 'quincenal', label: 'Quincenal', factor: 0.5 },
  { id: 'mensual',   label: 'Mensual',   factor: 1 },
  { id: 'semanal',   label: 'Semanal',   factor: 0.23077 },
]

type EmpleadoNomina = {
  id: string
  nombre: string
  puesto: string
  base_salary: number
  daily_rate: number
  tipo: 'operador' | 'administrativo'
  // Para nómina
  dias_trabajados: number
  horas_extra: number
  bonos: number
  otras_percepciones: number
  prestamo_infonavit: number
  otras_deducciones: number
  // Calculados
  salario_base: number
  he_monto: number
  total_percepciones: number
  imss_obrero: number
  isr: number
  total_deducciones: number
  neto: number
  incluir: boolean
}

type NominaHeader = {
  id: string
  folio: string
  periodo_inicio: string
  periodo_fin: string
  periodicidad: string
  status: string
  total_empleados: number
  total_percepciones: number
  total_deducciones: number
  total_neto: number
  created_at: string
}

function calcEmpleado(e: EmpleadoNomina, periodicidad: string): EmpleadoNomina {
  const factor = PERIODICIDADES.find(p => p.id === periodicidad)?.factor || 0.5
  const salarioBase = e.base_salary * factor * (e.dias_trabajados / (periodicidad === 'quincenal' ? 15 : periodicidad === 'mensual' ? 30 : 7))
  const heMonto = (e.base_salary / 30 / 8) * e.horas_extra * 2 // horas extra al doble
  const totalPercepciones = salarioBase + heMonto + e.bonos + e.otras_percepciones
  const sbc = e.base_salary / 30 // salario base cotización diario
  const imssObrero = sbc * IMSS_OBRERO_PCT.total * (periodicidad === 'quincenal' ? 15 : periodicidad === 'mensual' ? 30 : 7)
  const isr = calcISR(totalPercepciones)
  const totalDeducciones = imssObrero + isr + e.prestamo_infonavit + e.otras_deducciones
  const neto = Math.max(0, totalPercepciones - totalDeducciones)
  return { ...e, salario_base: salarioBase, he_monto: heMonto, total_percepciones: totalPercepciones, imss_obrero: imssObrero, isr, total_deducciones: totalDeducciones, neto }
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

export default function NominaPage() {
  const sb = createClient()
  const [tab, setTab] = useState<'nominas' | 'nueva' | 'detalle'>('nominas')
  const [nominas, setNominas] = useState<NominaHeader[]>([])
  const [empleados, setEmpleados] = useState<EmpleadoNomina[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<NominaHeader | null>(null)
  const [detalleRows, setDetalleRows] = useState<EmpleadoNomina[]>([])

  // Configuración nómina nueva
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [periodoFin, setPeriodoFin] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 15).toISOString().slice(0, 10)
  })
  const [periodicidad, setPeriodicidad] = useState('quincenal')

  const cargarNominas = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('payroll_runs').select('*').order('created_at', { ascending: false })
    setNominas((data || []) as NominaHeader[])
    setLoading(false)
  }, [])

  const cargarEmpleados = useCallback(async () => {
    const { data: drivers } = await sb.from('drivers').select('id, first_name, last_name, base_salary, daily_rate, status').eq('status', 'active')
    const rows: EmpleadoNomina[] = (drivers || []).map(d => {
      const base = {
        id: d.id,
        nombre: `${d.first_name} ${d.last_name}`,
        puesto: 'Operador',
        base_salary: d.base_salary || 0,
        daily_rate: d.daily_rate || 0,
        tipo: 'operador' as const,
        dias_trabajados: 15,
        horas_extra: 0,
        bonos: 0,
        otras_percepciones: 0,
        prestamo_infonavit: 0,
        otras_deducciones: 0,
        salario_base: 0, he_monto: 0, total_percepciones: 0,
        imss_obrero: 0, isr: 0, total_deducciones: 0, neto: 0,
        incluir: true,
      }
      return calcEmpleado(base, 'quincenal')
    })
    setEmpleados(rows)
  }, [])

  useEffect(() => { cargarNominas() }, [cargarNominas])
  useEffect(() => { if (tab === 'nueva') cargarEmpleados() }, [tab, cargarEmpleados])

  // Recalcular al cambiar periodicidad
  useEffect(() => {
    if (empleados.length > 0) {
      setEmpleados(prev => prev.map(e => calcEmpleado(e, periodicidad)))
    }
  }, [periodicidad])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const nominasPagadas = nominas.filter(n => n.status === 'pagada')
  const totalPagado = nominasPagadas.reduce((s, n) => s + n.total_neto, 0)
  const mesActual = new Date().toISOString().slice(0, 7)
  const nominasMes = nominas.filter(n => n.periodo_inicio?.startsWith(mesActual))
  const totalMes = nominasMes.reduce((s, n) => s + n.total_neto, 0)

  // ── Empleados incluidos en la nueva nómina ────────────────────────────────
  const incluidos = empleados.filter(e => e.incluir)
  const totalPercepciones = incluidos.reduce((s, e) => s + e.total_percepciones, 0)
  const totalDeducciones = incluidos.reduce((s, e) => s + e.total_deducciones, 0)
  const totalNeto = incluidos.reduce((s, e) => s + e.neto, 0)
  const totalISS = incluidos.reduce((s, e) => s + e.imss_obrero, 0)
  const totalISR = incluidos.reduce((s, e) => s + e.isr, 0)

  // ── Actualizar empleado ───────────────────────────────────────────────────
  function setEmp(idx: number, campo: keyof EmpleadoNomina, valor: number | boolean) {
    setEmpleados(prev => {
      const rows = [...prev]
      rows[idx] = calcEmpleado({ ...rows[idx], [campo]: valor }, periodicidad)
      return rows
    })
  }

  // ── Guardar nómina ────────────────────────────────────────────────────────
  async function guardarNomina(pagar = false) {
    if (incluidos.length === 0) return
    setSaving(true)
    try {
      const folio = await getNextFolio('nomina')
      const { data, error } = await sb.from('payroll_runs').insert({
        folio, periodo_inicio: periodoInicio, periodo_fin: periodoFin,
        periodicidad, status: pagar ? 'pagada' : 'generada',
        total_empleados: incluidos.length,
        total_percepciones: totalPercepciones,
        total_deducciones: totalDeducciones,
        total_neto: totalNeto,
        detalle: incluidos.map(e => ({ empleado_id: e.id, nombre: e.nombre, ...e })),
      }).select().single()
      if (!error && data) {
        await auditLog({ action: 'INSERT', module: 'nomina', table_name: 'payroll_runs', record_id: data.id, record_folio: folio, after_data: { folio, total_neto: totalNeto, empleados: incluidos.length } })
        await cargarNominas()
        setTab('nominas')
      }
    } finally { setSaving(false) }
  }

  // ── Ver detalle ───────────────────────────────────────────────────────────
  async function verDetalle(n: NominaHeader) {
    const { data } = await sb.from('payroll_runs').select('detalle').eq('id', n.id).single()
    setDetalleRows((data?.detalle || []) as EmpleadoNomina[])
    setSelected(n); setTab('detalle')
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { generada: 'bg-blue-100 text-blue-700', pagada: 'bg-green-100 text-green-700', cancelada: 'bg-red-100 text-red-600' }
    return m[s] || 'bg-slate-100 text-slate-500'
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent'

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nómina</h1>
            <p className="text-slate-400 text-sm">{nominas.length} nóminas · {fmt(totalPagado)} pagado total</p>
          </div>
        </div>
        <button onClick={() => setTab('nueva')} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
          <span className="text-lg leading-none">+</span> Generar nómina
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI label="Nóminas generadas" value={fmtN(nominas.length)} sub={`${nominasPagadas.length} pagadas`} color="slate" />
        <MiniKPI label="Total pagado acum." value={fmt(totalPagado)} color="green" />
        <MiniKPI label={`Mes actual (${mesActual})`} value={fmt(totalMes)} sub={`${nominasMes.length} nóminas`} color="blue" />
        <MiniKPI label="Pendientes pago" value={fmtN(nominas.filter(n => n.status === 'generada').length)} color="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['nominas', 'nueva'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'nominas' ? 'Historial' : 'Nueva nómina'}
          </button>
        ))}
        {tab === 'detalle' && selected && (
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow text-slate-900">{selected.folio}</button>
        )}
      </div>

      {/* ── HISTORIAL ── */}
      {tab === 'nominas' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                {['Folio', 'Período', 'Periodicidad', 'Empleados', 'Percepciones', 'Deducciones', 'Neto', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
              ) : nominas.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Sin nóminas generadas</td></tr>
              ) : nominas.map(n => (
                <tr key={n.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-red-600">{n.folio}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(n.periodo_inicio)} – {fmtDate(n.periodo_fin)}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">{n.periodicidad}</td>
                  <td className="px-4 py-3 text-center">{n.total_empleados}</td>
                  <td className="px-4 py-3 text-blue-700">{fmt(n.total_percepciones)}</td>
                  <td className="px-4 py-3 text-red-500">{fmt(n.total_deducciones)}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{fmt(n.total_neto)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusBadge(n.status))}>{n.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => verDetalle(n)} className="text-blue-600 hover:underline text-xs">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── NUEVA NÓMINA ── */}
      {tab === 'nueva' && (
        <div className="space-y-5">
          {/* Configuración */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b pb-2">Configuración del período</h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Periodicidad</label>
                <select value={periodicidad} onChange={e => setPeriodicidad(e.target.value)} className={cn(inp, 'w-auto')}>
                  {PERIODICIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Período inicio</label>
                <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className={cn(inp, 'w-auto')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Período fin</label>
                <input type="date" value={periodoFin} onChange={e => setPeriodoFin(e.target.value)} className={cn(inp, 'w-auto')} />
              </div>
            </div>
          </div>

          {/* Resumen totales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniKPI label="Empleados" value={fmtN(incluidos.length)} color="slate" />
            <MiniKPI label="Total percepciones" value={fmt(totalPercepciones)} color="blue" />
            <MiniKPI label="IMSS obrero" value={fmt(totalISS)} color="slate" />
            <MiniKPI label="ISR retenido" value={fmt(totalISR)} color="slate" />
            <MiniKPI label="Neto a pagar" value={fmt(totalNeto)} color="green" />
          </div>

          {/* Tabla de empleados */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b">
              <span className="font-semibold text-slate-700 text-sm">Detalle por empleado — modifica días y conceptos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 font-semibold border-b bg-slate-50/50">
                    {['✓','Nombre','Días','H.E.','Bonos','Sueldo','H.E.$','Percepciones','IMSS','ISR','Deduc.','Neto'].map(h => (
                      <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {empleados.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">Cargando empleados…</td></tr>
                  ) : empleados.map((e, i) => (
                    <tr key={e.id} className={cn('hover:bg-slate-50', !e.incluir ? 'opacity-40' : '')}>
                      <td className="px-2 py-1.5">
                        <input type="checkbox" checked={e.incluir} onChange={ev => setEmp(i, 'incluir', ev.target.checked)} className="rounded" />
                      </td>
                      <td className="px-2 py-1.5 font-medium text-slate-800 whitespace-nowrap">{e.nombre}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={e.dias_trabajados} onChange={ev => setEmp(i, 'dias_trabajados', Number(ev.target.value))} className="w-14 px-1.5 py-1 border border-slate-200 rounded text-xs text-center" min={0} max={31} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={e.horas_extra} onChange={ev => setEmp(i, 'horas_extra', Number(ev.target.value))} className="w-12 px-1.5 py-1 border border-slate-200 rounded text-xs text-center" min={0} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={e.bonos} onChange={ev => setEmp(i, 'bonos', Number(ev.target.value))} className="w-20 px-1.5 py-1 border border-slate-200 rounded text-xs" min={0} />
                      </td>
                      <td className="px-2 py-1.5 text-blue-700">{fmt(e.salario_base)}</td>
                      <td className="px-2 py-1.5 text-slate-500">{e.he_monto > 0 ? fmt(e.he_monto) : '—'}</td>
                      <td className="px-2 py-1.5 font-medium text-blue-700">{fmt(e.total_percepciones)}</td>
                      <td className="px-2 py-1.5 text-slate-500">{fmt(e.imss_obrero)}</td>
                      <td className="px-2 py-1.5 text-slate-500">{fmt(e.isr)}</td>
                      <td className="px-2 py-1.5 text-red-500">{fmt(e.total_deducciones)}</td>
                      <td className="px-2 py-1.5 font-semibold text-green-700">{fmt(e.neto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-slate-50 font-semibold text-xs">
                  <tr>
                    <td colSpan={7} className="px-2 py-2 text-right text-slate-600">TOTALES</td>
                    <td className="px-2 py-2 text-blue-700">{fmt(totalPercepciones)}</td>
                    <td className="px-2 py-2 text-slate-500">{fmt(totalISS)}</td>
                    <td className="px-2 py-2 text-slate-500">{fmt(totalISR)}</td>
                    <td className="px-2 py-2 text-red-500">{fmt(totalDeducciones)}</td>
                    <td className="px-2 py-2 text-green-700 text-sm">{fmt(totalNeto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Nota ISR */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            📋 ISR calculado con tabla quincenal 2024 SAT · IMSS obrero: 2.125% del SBC · Para aplicar subsidio al empleo o deducciones adicionales edita &quot;Otras percepciones&quot; por empleado.
          </div>

          <div className="flex gap-3">
            <button onClick={() => guardarNomina(false)} disabled={saving || incluidos.length === 0} className="px-6 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              {saving ? 'Generando…' : 'Generar nómina'}
            </button>
            <button onClick={() => guardarNomina(true)} disabled={saving || incluidos.length === 0} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Guardando…' : '✓ Generar y marcar pagada'}
            </button>
            <button onClick={() => setTab('nominas')} className="px-6 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── DETALLE NÓMINA ── */}
      {tab === 'detalle' && selected && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-xl font-bold text-red-600 mb-1">{selected.folio}</div>
                <div className="text-slate-500 text-sm">{fmtDate(selected.periodo_inicio)} – {fmtDate(selected.periodo_fin)} · <span className="capitalize">{selected.periodicidad}</span></div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block', statusBadge(selected.status))}>{selected.status}</span>
              </div>
              <button onClick={() => setTab('nominas')} className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">← Volver</button>
            </div>

            {/* KPIs detalle */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-500 mb-0.5">Empleados</div>
                <div className="font-bold text-blue-700">{selected.total_empleados}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-0.5">Percepciones</div>
                <div className="font-bold">{fmt(selected.total_percepciones)}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xs text-red-500 mb-0.5">Deducciones</div>
                <div className="font-bold text-red-600">{fmt(selected.total_deducciones)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-500 mb-0.5">Neto pagado</div>
                <div className="font-bold text-green-700">{fmt(selected.total_neto)}</div>
              </div>
            </div>

            {/* Detalle por empleado */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                    {['Empleado', 'Días', 'Percepciones', 'IMSS', 'ISR', 'Deducciones', 'Neto'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {detalleRows.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{e.nombre}</td>
                      <td className="px-3 py-2 text-center">{e.dias_trabajados}</td>
                      <td className="px-3 py-2 text-blue-700">{fmt(e.total_percepciones)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmt(e.imss_obrero)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmt(e.isr)}</td>
                      <td className="px-3 py-2 text-red-500">{fmt(e.total_deducciones)}</td>
                      <td className="px-3 py-2 font-semibold text-green-700">{fmt(e.neto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
