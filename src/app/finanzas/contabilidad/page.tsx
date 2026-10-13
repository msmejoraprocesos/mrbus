'use client'

/**
 * Contabilidad — MrBus
 * Libro Diario, Mayor, Catálogo de Cuentas SAT, Balanza, Estado de Resultados
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'

// ── Catálogo de cuentas SAT (transporte) ─────────────────────────────────────
const CUENTAS_SAT = [
  // Activo
  { cuenta: '1110', nombre: 'Bancos', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo circulante' },
  { cuenta: '1120', nombre: 'Clientes', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo circulante' },
  { cuenta: '1130', nombre: 'Deudores diversos', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo circulante' },
  { cuenta: '1140', nombre: 'IVA Acreditable', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo circulante' },
  { cuenta: '1150', nombre: 'Anticipo a proveedores', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo circulante' },
  { cuenta: '1160', nombre: 'Inventario de refacciones', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo circulante' },
  { cuenta: '1210', nombre: 'Equipo de transporte', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo fijo' },
  { cuenta: '1211', nombre: 'Dep. acum. equipo transporte', tipo: 'activo', naturaleza: 'acreedora', grupo: 'Activo fijo' },
  { cuenta: '1220', nombre: 'Mobiliario y equipo', tipo: 'activo', naturaleza: 'deudora', grupo: 'Activo fijo' },
  { cuenta: '1221', nombre: 'Dep. acum. mob. y equipo', tipo: 'activo', naturaleza: 'acreedora', grupo: 'Activo fijo' },
  // Pasivo
  { cuenta: '2110', nombre: 'Proveedores', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo circulante' },
  { cuenta: '2120', nombre: 'Acreedores diversos', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo circulante' },
  { cuenta: '2130', nombre: 'IVA Trasladado', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo circulante' },
  { cuenta: '2140', nombre: 'IMSS por pagar', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo circulante' },
  { cuenta: '2150', nombre: 'ISR por pagar', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo circulante' },
  { cuenta: '2160', nombre: 'Anticipos de clientes', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo circulante' },
  { cuenta: '2210', nombre: 'Préstamos bancarios L/P', tipo: 'pasivo', naturaleza: 'acreedora', grupo: 'Pasivo largo plazo' },
  // Capital
  { cuenta: '3110', nombre: 'Capital social', tipo: 'capital', naturaleza: 'acreedora', grupo: 'Capital contable' },
  { cuenta: '3120', nombre: 'Resultados de ejercicios ant.', tipo: 'capital', naturaleza: 'acreedora', grupo: 'Capital contable' },
  { cuenta: '3130', nombre: 'Resultado del ejercicio', tipo: 'capital', naturaleza: 'acreedora', grupo: 'Capital contable' },
  // Ingresos
  { cuenta: '4110', nombre: 'Ingresos por transporte', tipo: 'ingreso', naturaleza: 'acreedora', grupo: 'Ingresos' },
  { cuenta: '4120', nombre: 'Ingresos por renta de unidades', tipo: 'ingreso', naturaleza: 'acreedora', grupo: 'Ingresos' },
  { cuenta: '4130', nombre: 'Ingresos por servicios charter', tipo: 'ingreso', naturaleza: 'acreedora', grupo: 'Ingresos' },
  { cuenta: '4140', nombre: 'Otros ingresos', tipo: 'ingreso', naturaleza: 'acreedora', grupo: 'Ingresos' },
  // Costos
  { cuenta: '5110', nombre: 'Combustible', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5120', nombre: 'Mantenimiento y reparaciones', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5130', nombre: 'Refacciones y accesorios', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5140', nombre: 'Llantas', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5150', nombre: 'Peajes y casetas', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5160', nombre: 'Sueldos y salarios operadores', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5170', nombre: 'IMSS y prestaciones', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  { cuenta: '5180', nombre: 'Depreciación flotilla', tipo: 'costo', naturaleza: 'deudora', grupo: 'Costos operativos' },
  // Gastos
  { cuenta: '6110', nombre: 'Sueldos administración', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6120', nombre: 'Renta de instalaciones', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6130', nombre: 'Servicios públicos', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6140', nombre: 'Comunicaciones y telefonía', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6150', nombre: 'Papelería y artículos de oficina', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6160', nombre: 'Seguros y fianzas', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6170', nombre: 'Gastos de representación', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6180', nombre: 'Honorarios', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
  { cuenta: '6190', nombre: 'Depreciación activos admón.', tipo: 'gasto', naturaleza: 'deudora', grupo: 'Gastos generales' },
]

const TIPOS_POLIZA = ['ingreso', 'egreso', 'diario', 'nomina', 'depreciacion', 'ajuste', 'cierre']

type LineaPoliza = {
  id: string
  cuenta: string
  nombre_cuenta: string
  concepto: string
  debe: number
  haber: number
}

type Poliza = {
  id: string
  folio: string
  fecha: string
  concepto: string
  tipo: string
  lineas: LineaPoliza[]
  status: string
  created_at: string
}

function emptyLinea(): LineaPoliza {
  return { id: crypto.randomUUID(), cuenta: '', nombre_cuenta: '', concepto: '', debe: 0, haber: 0 }
}

function emptyPoliza(): Partial<Poliza> & { lineas: LineaPoliza[] } {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    concepto: '', tipo: 'diario',
    lineas: [emptyLinea(), emptyLinea()],
    status: 'activa',
  }
}

function MiniKPI({ label, value, sub, color = 'slate' }: { label: string; value: string; sub?: string; color?: string }) {
  const cs: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', slate: 'bg-slate-50 text-slate-700', yellow: 'bg-yellow-50 text-yellow-700' }
  return (
    <div className={cn('rounded-xl p-4', cs[color])}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function ContabilidadPage() {
  const sb = createClient()

  const [tab, setTab] = useState<'diario' | 'mayor' | 'balanza' | 'catalogo' | 'nueva' | 'detalle'>('diario')
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyPoliza())
  const [selected, setSelected] = useState<Poliza | null>(null)
  const [cuentaMayor, setCuentaMayor] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7))
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('accounting_entries')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setPolizas((data || []) as Poliza[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Filtros diario ────────────────────────────────────────────────────────
  const polizasFiltradas = polizas.filter(p => {
    const matchMes = !filtroMes || p.fecha?.startsWith(filtroMes)
    const matchTipo = !filtroTipo || p.tipo === filtroTipo
    const matchQ = !busqueda || p.folio?.toLowerCase().includes(busqueda.toLowerCase()) || p.concepto?.toLowerCase().includes(busqueda.toLowerCase())
    return matchMes && matchTipo && matchQ
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const mesActual = new Date().toISOString().slice(0, 7)
  const polizasMes = polizas.filter(p => p.fecha?.startsWith(mesActual))
  const totalDebe = polizasMes.reduce((s, p) => s + (p.lineas || []).reduce((ss: number, l: LineaPoliza) => ss + l.debe, 0), 0)
  const totalIngresos = polizas.filter(p => p.tipo === 'ingreso' && p.fecha?.startsWith(mesActual))
    .reduce((s, p) => s + (p.lineas || []).filter((l: LineaPoliza) => l.cuenta.startsWith('4')).reduce((ss: number, l: LineaPoliza) => ss + l.haber, 0), 0)
  const totalEgresos = polizas.filter(p => p.tipo === 'egreso' && p.fecha?.startsWith(mesActual))
    .reduce((s, p) => s + (p.lineas || []).filter((l: LineaPoliza) => l.cuenta.startsWith('5') || l.cuenta.startsWith('6')).reduce((ss: number, l: LineaPoliza) => ss + l.debe, 0), 0)

  // ── Balanza de comprobación ───────────────────────────────────────────────
  const balanza = CUENTAS_SAT.map(c => {
    const lineasCuenta = polizas
      .filter(p => !filtroMes || p.fecha?.startsWith(filtroMes))
      .flatMap(p => (p.lineas || []).filter((l: LineaPoliza) => l.cuenta === c.cuenta))
    const debe = lineasCuenta.reduce((s, l) => s + l.debe, 0)
    const haber = lineasCuenta.reduce((s, l) => s + l.haber, 0)
    const saldo = c.naturaleza === 'deudora' ? debe - haber : haber - debe
    return { ...c, debe, haber, saldo, movimientos: lineasCuenta.length }
  }).filter(c => c.debe > 0 || c.haber > 0 || true)

  // ── Mayor de una cuenta ───────────────────────────────────────────────────
  const movimientosMayor = cuentaMayor ? polizas.flatMap(p =>
    (p.lineas || [])
      .filter((l: LineaPoliza) => l.cuenta === cuentaMayor)
      .map((l: LineaPoliza) => ({ ...l, fecha: p.fecha, folio: p.folio, poliza_concepto: p.concepto }))
  ).sort((a, b) => a.fecha > b.fecha ? -1 : 1) : []

  // ── Validar cuadre ────────────────────────────────────────────────────────
  const sumaDebe = form.lineas.reduce((s, l) => s + (l.debe || 0), 0)
  const sumaHaber = form.lineas.reduce((s, l) => s + (l.haber || 0), 0)
  const cuadrada = Math.abs(sumaDebe - sumaHaber) < 0.01

  // ── Guardar póliza ────────────────────────────────────────────────────────
  async function guardar() {
    if (!form.concepto || !cuadrada || sumaDebe === 0) return
    setSaving(true)
    try {
      const folio = await getNextFolio('accounting_entry')
      const lineasLimpias = form.lineas.filter(l => l.cuenta && (l.debe > 0 || l.haber > 0))
      const { data, error } = await sb.from('accounting_entries').insert({
        folio, fecha: form.fecha, concepto: form.concepto,
        tipo: form.tipo, lineas: lineasLimpias, status: 'activa',
      }).select().single()
      if (!error && data) {
        await auditLog({ action: 'INSERT', module: 'contabilidad', table_name: 'accounting_entries', record_id: data.id, record_folio: folio, after_data: data })
        await cargar()
        setForm(emptyPoliza())
        setTab('diario')
      }
    } finally { setSaving(false) }
  }

  // ── Actualizar línea ──────────────────────────────────────────────────────
  function setLinea(idx: number, campo: keyof LineaPoliza, valor: string | number) {
    setForm(p => {
      const lineas = [...p.lineas]
      if (campo === 'cuenta') {
        const cat = CUENTAS_SAT.find(c => c.cuenta === valor)
        lineas[idx] = { ...lineas[idx], cuenta: String(valor), nombre_cuenta: cat?.nombre || '' }
      } else {
        lineas[idx] = { ...lineas[idx], [campo]: valor }
      }
      return { ...p, lineas }
    })
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contabilidad</h1>
            <p className="text-slate-400 text-sm">Libro diario · Mayor · Balanza · Catálogo SAT</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyPoliza()); setTab('nueva') }} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700">
          <span className="text-lg leading-none">+</span> Nueva póliza
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI label="Pólizas este mes" value={String(polizasMes.length)} sub={`Total mes anterior: ${polizas.filter(p => p.fecha?.startsWith(new Date(Date.now() - 2592000000).toISOString().slice(0, 7))).length}`} color="slate" />
        <MiniKPI label="Movimiento total" value={fmt(totalDebe)} sub="Debe = Haber" color="blue" />
        <MiniKPI label="Ingresos (mes)" value={fmt(totalIngresos)} color="green" />
        <MiniKPI label="Egresos (mes)" value={fmt(totalEgresos)} sub={`Resultado: ${fmt(totalIngresos - totalEgresos)}`} color={totalIngresos >= totalEgresos ? 'green' : 'red'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {(['diario', 'mayor', 'balanza', 'catalogo'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {{ diario: 'Libro diario', mayor: 'Mayor', balanza: 'Balanza', catalogo: 'Catálogo' }[t]}
          </button>
        ))}
        {(tab === 'nueva' || tab === 'detalle') && (
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow text-slate-900">
            {tab === 'nueva' ? 'Nueva póliza' : selected?.folio}
          </button>
        )}
      </div>

      {/* ── LIBRO DIARIO ── */}
      {tab === 'diario' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={cn(inp, 'w-auto')} />
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={cn(inp, 'w-auto')}>
              <option value="">Todos los tipos</option>
              {TIPOS_POLIZA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar póliza…" className={cn(inp, 'max-w-xs')} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                  {['Folio', 'Fecha', 'Tipo', 'Concepto', 'Debe', 'Haber', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
                ) : polizasFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Sin pólizas</td></tr>
                ) : polizasFiltradas.map(p => {
                  const debe = (p.lineas || []).reduce((s: number, l: LineaPoliza) => s + l.debe, 0)
                  const haber = (p.lineas || []).reduce((s: number, l: LineaPoliza) => s + l.haber, 0)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelected(p); setTab('detalle') }}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.folio}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(p.fecha)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{p.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 max-w-xs truncate">{p.concepto}</td>
                      <td className="px-4 py-3 text-blue-700 font-medium">{fmt(debe)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmt(haber)}</td>
                      <td className="px-4 py-3 text-blue-600 hover:underline text-xs">Ver</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MAYOR ── */}
      {tab === 'mayor' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta</label>
              <select value={cuentaMayor} onChange={e => setCuentaMayor(e.target.value)} className={cn(inp, 'w-72')}>
                <option value="">Seleccionar cuenta…</option>
                {CUENTAS_SAT.map(c => <option key={c.cuenta} value={c.cuenta}>{c.cuenta} – {c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
              <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={cn(inp, 'w-auto')} />
            </div>
          </div>
          {cuentaMayor && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b">
                <div className="font-semibold text-slate-800">{cuentaMayor} – {CUENTAS_SAT.find(c => c.cuenta === cuentaMayor)?.nombre}</div>
                <div className="text-xs text-slate-400">{CUENTAS_SAT.find(c => c.cuenta === cuentaMayor)?.grupo} · naturaleza {CUENTAS_SAT.find(c => c.cuenta === cuentaMayor)?.naturaleza}</div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-500 uppercase border-b bg-slate-50/50">
                    {['Fecha', 'Folio', 'Concepto', 'Debe', 'Haber', 'Saldo'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movimientosMayor.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin movimientos para esta cuenta</td></tr>
                  ) : (() => {
                    const nat = CUENTAS_SAT.find(c => c.cuenta === cuentaMayor)?.naturaleza
                    let saldo = 0
                    return movimientosMayor.slice().reverse().map((m, i) => {
                      saldo += nat === 'deudora' ? m.debe - m.haber : m.haber - m.debe
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{fmtDate(m.fecha)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.folio}</td>
                          <td className="px-4 py-3 text-slate-700">{m.concepto || m.poliza_concepto}</td>
                          <td className="px-4 py-3 text-blue-700">{m.debe > 0 ? fmt(m.debe) : ''}</td>
                          <td className="px-4 py-3 text-slate-500">{m.haber > 0 ? fmt(m.haber) : ''}</td>
                          <td className="px-4 py-3 font-semibold">{fmt(saldo)}</td>
                        </tr>
                      )
                    }).reverse()
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold border-t">
                    <td colSpan={3} className="px-4 py-3 text-slate-600">Totales</td>
                    <td className="px-4 py-3 text-blue-700">{fmt(movimientosMayor.reduce((s, m) => s + m.debe, 0))}</td>
                    <td className="px-4 py-3">{fmt(movimientosMayor.reduce((s, m) => s + m.haber, 0))}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BALANZA ── */}
      {tab === 'balanza' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={cn(inp, 'w-auto')} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b flex justify-between items-center">
              <div className="font-semibold text-slate-800">Balanza de comprobación — {filtroMes}</div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase border-b bg-slate-50/50">
                  {['Cuenta', 'Nombre', 'Tipo', 'Debe', 'Haber', 'Saldo'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(() => {
                  const grupos = Array.from(new Set(balanza.map(c => c.grupo)))
                  return grupos.flatMap(grupo => {
                    const cuentasGrupo = balanza.filter(c => c.grupo === grupo)
                    const conMov = cuentasGrupo.filter(c => c.debe > 0 || c.haber > 0)
                    if (conMov.length === 0) return []
                    return [
                      <tr key={grupo} className="bg-slate-50/70">
                        <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{grupo}</td>
                      </tr>,
                      ...conMov.map(c => (
                        <tr key={c.cuenta} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setCuentaMayor(c.cuenta); setTab('mayor') }}>
                          <td className="px-4 py-3 font-mono text-sm text-slate-500">{c.cuenta}</td>
                          <td className="px-4 py-3 text-slate-800">{c.nombre}</td>
                          <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{c.tipo}</span></td>
                          <td className="px-4 py-3 text-blue-700">{c.debe > 0 ? fmt(c.debe) : ''}</td>
                          <td className="px-4 py-3 text-slate-500">{c.haber > 0 ? fmt(c.haber) : ''}</td>
                          <td className="px-4 py-3 font-semibold">{fmt(c.saldo)}</td>
                        </tr>
                      )),
                    ]
                  })
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2">
                  <td colSpan={3} className="px-4 py-3">TOTALES</td>
                  <td className="px-4 py-3 text-blue-700">{fmt(balanza.reduce((s, c) => s + c.debe, 0))}</td>
                  <td className="px-4 py-3">{fmt(balanza.reduce((s, c) => s + c.haber, 0))}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── CATÁLOGO ── */}
      {tab === 'catalogo' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b font-semibold text-slate-800">Catálogo de cuentas SAT — Transporte</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase border-b bg-slate-50/50">
                {['Cuenta', 'Nombre', 'Tipo', 'Naturaleza', 'Grupo'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {CUENTAS_SAT.map(c => (
                <tr key={c.cuenta} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setCuentaMayor(c.cuenta); setTab('mayor') }}>
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">{c.cuenta}</td>
                  <td className="px-4 py-2.5 text-slate-900">{c.nombre}</td>
                  <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{c.tipo}</span></td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.naturaleza}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{c.grupo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── NUEVA PÓLIZA ── */}
      {tab === 'nueva' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-5xl">
          <h2 className="text-lg font-semibold text-slate-800">Nueva póliza contable</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className={inp}>
                {TIPOS_POLIZA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Concepto *</label>
              <input value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))} className={inp} placeholder="Descripción del movimiento" />
            </div>
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Líneas del asiento</h3>
              <button onClick={() => setForm(p => ({ ...p, lineas: [...p.lineas, emptyLinea()] }))} className="text-xs text-blue-600 hover:underline">+ Agregar línea</button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                    {['Cuenta', 'Nombre de cuenta', 'Concepto', 'Debe', 'Haber', ''].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.lineas.map((linea, i) => (
                    <tr key={linea.id}>
                      <td className="px-2 py-1.5 w-28">
                        <input list={`cuentas-${i}`} value={linea.cuenta} onChange={e => setLinea(i, 'cuenta', e.target.value)} className={cn(inp, 'font-mono')} placeholder="1110" />
                        <datalist id={`cuentas-${i}`}>
                          {CUENTAS_SAT.map(c => <option key={c.cuenta} value={c.cuenta}>{c.cuenta} – {c.nombre}</option>)}
                        </datalist>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={linea.nombre_cuenta} onChange={e => setLinea(i, 'nombre_cuenta', e.target.value)} className={inp} placeholder="Auto al seleccionar cuenta" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={linea.concepto} onChange={e => setLinea(i, 'concepto', e.target.value)} className={inp} placeholder="Detalle" />
                      </td>
                      <td className="px-2 py-1.5 w-32">
                        <input type="number" value={linea.debe || ''} onChange={e => setLinea(i, 'debe', Number(e.target.value))} className={cn(inp, 'text-blue-700')} placeholder="0.00" />
                      </td>
                      <td className="px-2 py-1.5 w-32">
                        <input type="number" value={linea.haber || ''} onChange={e => setLinea(i, 'haber', Number(e.target.value))} className={inp} placeholder="0.00" />
                      </td>
                      <td className="px-2 py-1.5">
                        {form.lineas.length > 2 && (
                          <button onClick={() => setForm(p => ({ ...p, lineas: p.lineas.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200">
                  <tr className={cn('font-semibold text-sm', cuadrada ? 'bg-green-50' : 'bg-red-50')}>
                    <td colSpan={3} className="px-3 py-2 text-right">
                      {cuadrada
                        ? <span className="text-green-700">✓ Asiento cuadrado</span>
                        : <span className="text-red-600">⚠ Diferencia: {fmt(Math.abs(sumaDebe - sumaHaber))}</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-blue-700">{fmt(sumaDebe)}</td>
                    <td className="px-3 py-2">{fmt(sumaHaber)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={guardar} disabled={saving || !form.concepto || !cuadrada || sumaDebe === 0} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Registrar póliza'}
            </button>
            <button onClick={() => setTab('diario')} className="px-6 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── DETALLE PÓLIZA ── */}
      {tab === 'detalle' && selected && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-sm text-slate-400 mb-1">{selected.folio}</div>
                <div className="text-xl font-bold text-slate-900">{selected.concepto}</div>
                <div className="text-slate-500 text-sm mt-1">{fmtDate(selected.fecha)} · <span className="capitalize">{selected.tipo}</span></div>
              </div>
              <button onClick={() => setTab('diario')} className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">← Volver</button>
            </div>
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                  {['Cuenta', 'Nombre', 'Concepto', 'Debe', 'Haber'].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selected.lineas || []).map((l: LineaPoliza, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-slate-500">{l.cuenta}</td>
                    <td className="px-4 py-2">{l.nombre_cuenta}</td>
                    <td className="px-4 py-2 text-slate-500">{l.concepto}</td>
                    <td className="px-4 py-2 text-blue-700 font-medium">{l.debe > 0 ? fmt(l.debe) : ''}</td>
                    <td className="px-4 py-2 text-slate-500">{l.haber > 0 ? fmt(l.haber) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-slate-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Totales</td>
                  <td className="px-4 py-2 text-blue-700">{fmt((selected.lineas || []).reduce((s: number, l: LineaPoliza) => s + l.debe, 0))}</td>
                  <td className="px-4 py-2">{fmt((selected.lineas || []).reduce((s: number, l: LineaPoliza) => s + l.haber, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
