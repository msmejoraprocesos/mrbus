'use client'

/**
 * Activos Fijos — MrBus
 * Gestión completa de activos: vehículos, maquinaria, equipo
 * Depreciación SAT, alertas de vencimiento, mantenimiento
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN, cn } from '@/lib/utils/index'
import { auditLog, getNextFolio } from '@/lib/audit'

// ── Categorías SAT de activos fijos ─────────────────────────────────────────
const SAT_CATEGORIAS = [
  { id: 'vehiculos_transporte',   label: 'Vehículos de transporte',     vida: 4,  tasa: 25 },
  { id: 'autobuses',              label: 'Autobuses y microbuses',       vida: 4,  tasa: 25 },
  { id: 'maquinaria_equipo',      label: 'Maquinaria y equipo',         vida: 10, tasa: 10 },
  { id: 'equipo_computo',         label: 'Equipo de cómputo',           vida: 3,  tasa: 33 },
  { id: 'equipo_oficina',         label: 'Equipo de oficina',           vida: 10, tasa: 10 },
  { id: 'mobiliario',             label: 'Mobiliario y equipo',         vida: 10, tasa: 10 },
  { id: 'herramientas',           label: 'Herramientas y accesorios',   vida: 5,  tasa: 20 },
  { id: 'inmuebles',              label: 'Inmuebles (construcciones)',   vida: 20, tasa: 5  },
  { id: 'otro',                   label: 'Otro activo',                 vida: 10, tasa: 10 },
]

const METODOS_DEPRECIACION = [
  { id: 'linea_recta',     label: 'Línea recta (SAT)' },
  { id: 'acelerada',       label: 'Depreciación acelerada' },
  { id: 'unidades_uso',    label: 'Unidades de uso' },
]

const ESTADOS_ACTIVO = ['activo', 'en_mantenimiento', 'dado_de_baja', 'vendido']

type Activo = {
  id: string
  folio: string
  nombre: string
  descripcion: string
  categoria: string
  numero_serie: string
  numero_economico: string
  marca: string
  modelo: string
  anio: number
  fecha_adquisicion: string
  costo_adquisicion: number
  valor_residual: number
  vida_util_anios: number
  metodo_depreciacion: string
  depreciacion_acumulada: number
  estado: string
  ubicacion: string
  responsable: string
  poliza_seguro: string
  vencimiento_seguro: string
  notas: string
  created_at: string
}

type MovDepreciacion = {
  id: string
  activo_id: string
  periodo: string
  depreciacion_periodo: number
  valor_en_libros: number
  created_at: string
}

const emptyActivo = (): Partial<Activo> => ({
  nombre: '', descripcion: '', categoria: 'autobuses',
  numero_serie: '', numero_economico: '', marca: '', modelo: '',
  anio: new Date().getFullYear(), fecha_adquisicion: new Date().toISOString().slice(0, 10),
  costo_adquisicion: 0, valor_residual: 0, vida_util_anios: 4,
  metodo_depreciacion: 'linea_recta', depreciacion_acumulada: 0,
  estado: 'activo', ubicacion: '', responsable: '', poliza_seguro: '',
  vencimiento_seguro: '', notas: '',
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcDepreciacionAnual(a: Activo) {
  if (a.vida_util_anios <= 0) return 0
  return (a.costo_adquisicion - a.valor_residual) / a.vida_util_anios
}

function calcValorLibros(a: Activo) {
  return Math.max(a.valor_residual, a.costo_adquisicion - a.depreciacion_acumulada)
}

function calcAniosTranscurridos(a: Activo) {
  const desde = new Date(a.fecha_adquisicion)
  const hoy = new Date()
  return Math.floor((hoy.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function calcPorcentajeDepreciado(a: Activo) {
  if (a.costo_adquisicion <= 0) return 0
  return Math.min(100, (a.depreciacion_acumulada / a.costo_adquisicion) * 100)
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    activo: 'bg-green-100 text-green-700',
    en_mantenimiento: 'bg-yellow-100 text-yellow-700',
    dado_de_baja: 'bg-red-100 text-red-700',
    vendido: 'bg-gray-100 text-gray-500',
  }
  return map[estado] || 'bg-gray-100 text-gray-500'
}

// ── Mini KPI ─────────────────────────────────────────────────────────────────
function MiniKPI({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700', red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-50 text-slate-700',
  }
  return (
    <div className={cn('rounded-xl p-4', colors[color])}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Campo helper ─────────────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'

// ── Main Component ────────────────────────────────────────────────────────────
export default function ActivosPage() {
  const sb = createClient()

  const [tab, setTab] = useState<'lista' | 'nuevo' | 'detalle'>('lista')
  const [activos, setActivos] = useState<Activo[]>([])
  const [selected, setSelected] = useState<Activo | null>(null)
  const [movimientos, setMovimientos] = useState<MovDepreciacion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Activo>>(emptyActivo())
  const [editMode, setEditMode] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [deprTab, setDeprTab] = useState<'info' | 'depreciacion' | 'historial'>('info')

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('fixed_assets').select('*').order('created_at', { ascending: false })
    setActivos((data || []) as Activo[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activosActivos = activos.filter(a => a.estado === 'activo')
  const totalCosto = activos.reduce((s, a) => s + a.costo_adquisicion, 0)
  const totalValorLibros = activos.reduce((s, a) => s + calcValorLibros(a), 0)
  const totalDeprAcum = activos.reduce((s, a) => s + a.depreciacion_acumulada, 0)
  const hoy = new Date()
  const vencen30 = activos.filter(a => {
    if (!a.vencimiento_seguro) return false
    const diff = (new Date(a.vencimiento_seguro).getTime() - hoy.getTime()) / 86400000
    return diff >= 0 && diff <= 30
  })
  const vencidos = activos.filter(a => {
    if (!a.vencimiento_seguro) return false
    return new Date(a.vencimiento_seguro) < hoy
  })

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtrados = activos.filter(a => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || a.nombre?.toLowerCase().includes(q) || a.numero_economico?.toLowerCase().includes(q) || a.marca?.toLowerCase().includes(q) || a.folio?.toLowerCase().includes(q)
    const matchCat = !filtroCategoria || a.categoria === filtroCategoria
    const matchEst = !filtroEstado || a.estado === filtroEstado
    return matchQ && matchCat && matchEst
  })

  // ── Guardar activo ────────────────────────────────────────────────────────
  async function guardar() {
    if (!form.nombre || !form.costo_adquisicion) return
    setSaving(true)
    try {
      if (editMode && selected) {
        const { error } = await sb.from('fixed_assets').update({
          ...form, updated_at: new Date().toISOString()
        }).eq('id', selected.id)
        if (!error) {
          await auditLog({ action: 'UPDATE', module: 'activos_fijos', table_name: 'fixed_assets', record_id: selected.id, record_folio: selected.folio, before_data: selected as Record<string, unknown>, after_data: form as Record<string, unknown> })
          await cargar(); setTab('lista')
        }
      } else {
        const folio = await getNextFolio('fixed_asset')
        const { data, error } = await sb.from('fixed_assets').insert({
          ...form, folio, depreciacion_acumulada: 0,
        }).select().single()
        if (!error && data) {
          await auditLog({ action: 'INSERT', module: 'activos_fijos', table_name: 'fixed_assets', record_id: data.id, record_folio: folio, after_data: data })
          await cargar(); setTab('lista')
        }
      }
    } finally { setSaving(false) }
  }

  // ── Calcular y registrar depreciación del período ─────────────────────────
  async function registrarDepreciacion(activo: Activo) {
    const deprAnual = calcDepreciacionAnual(activo)
    const deprMensual = deprAnual / 12
    const periodo = new Date().toISOString().slice(0, 7) // YYYY-MM
    const nuevaAcum = Math.min(activo.costo_adquisicion - activo.valor_residual, activo.depreciacion_acumulada + deprMensual)
    const valorLibros = activo.costo_adquisicion - nuevaAcum

    const { error: e1 } = await sb.from('asset_depreciation_log').insert({
      activo_id: activo.id, periodo, depreciacion_periodo: deprMensual, valor_en_libros: valorLibros,
    })
    if (e1) { alert('Error al registrar depreciación'); return }

    await sb.from('fixed_assets').update({ depreciacion_acumulada: nuevaAcum }).eq('id', activo.id)
    await auditLog({ action: 'UPDATE', module: 'activos_fijos', table_name: 'fixed_assets', record_id: activo.id, record_folio: activo.folio, before_data: { depreciacion_acumulada: activo.depreciacion_acumulada }, after_data: { depreciacion_acumulada: nuevaAcum } })
    await cargar()
    if (selected?.id === activo.id) {
      setSelected(prev => prev ? { ...prev, depreciacion_acumulada: nuevaAcum } : null)
    }
    alert(`Depreciación mensual ${fmt(deprMensual)} registrada. Valor en libros: ${fmt(valorLibros)}`)
  }

  // ── Cargar historial depreciación ─────────────────────────────────────────
  async function cargarMovimientos(activoId: string) {
    const { data } = await sb.from('asset_depreciation_log').select('*').eq('activo_id', activoId).order('periodo', { ascending: false })
    setMovimientos((data || []) as MovDepreciacion[])
  }

  // ── Ver detalle ───────────────────────────────────────────────────────────
  function verDetalle(a: Activo) {
    setSelected(a); setDeprTab('info'); cargarMovimientos(a.id); setTab('detalle')
  }

  // ── Categoría label ───────────────────────────────────────────────────────
  const catLabel = (id: string) => SAT_CATEGORIAS.find(c => c.id === id)?.label || id

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activos Fijos</h1>
            <p className="text-slate-400 text-sm">{activos.length} activos · Valor libros {fmt(totalValorLibros)}</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyActivo()); setEditMode(false); setTab('nuevo') }} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700">
          <span className="text-lg leading-none">+</span> Nuevo activo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI label="Activos registrados" value={fmtN(activos.length)} sub={`${activosActivos.length} activos`} color="slate" />
        <MiniKPI label="Costo de adquisición" value={fmt(totalCosto)} color="blue" />
        <MiniKPI label="Valor en libros" value={fmt(totalValorLibros)} sub={`Depr. acum. ${fmt(totalDeprAcum)}`} color="green" />
        <MiniKPI label="Alertas seguro" value={fmtN(vencidos.length + vencen30.length)} sub={`${vencidos.length} vencidos · ${vencen30.length} en 30d`} color={vencidos.length > 0 ? 'red' : vencen30.length > 0 ? 'yellow' : 'green'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['lista', 'nuevo'] as const).map(t => (
          <button key={t} onClick={() => { if (t === 'nuevo') { setForm(emptyActivo()); setEditMode(false) } setTab(t) }} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'lista' ? 'Activos' : 'Nuevo activo'}
          </button>
        ))}
        {tab === 'detalle' && selected && (
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow text-slate-900">
            {selected.folio || selected.nombre}
          </button>
        )}
      </div>

      {/* ── LISTA ── */}
      {tab === 'lista' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, N° económico…" className={cn(inp, 'max-w-xs')} />
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className={cn(inp, 'w-auto')}>
              <option value="">Todas las categorías</option>
              {SAT_CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={cn(inp, 'w-auto')}>
              <option value="">Todos los estados</option>
              {ESTADOS_ACTIVO.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Alertas de seguro */}
          {(vencidos.length > 0 || vencen30.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
              ⚠️ {vencidos.length > 0 && <span><b>{vencidos.length}</b> activo(s) con seguro VENCIDO. </span>}
              {vencen30.length > 0 && <span><b>{vencen30.length}</b> activo(s) con seguro que vence en los próximos 30 días.</span>}
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                    {['Folio','Activo','Categoría','Adquisición','Costo','Depr. Acum.','Valor Libros','%','Estado',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
                  ) : filtrados.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">Sin activos</td></tr>
                  ) : filtrados.map(a => {
                    const pct = calcPorcentajeDepreciado(a)
                    const vlibros = calcValorLibros(a)
                    const segVencido = a.vencimiento_seguro && new Date(a.vencimiento_seguro) < hoy
                    return (
                      <tr key={a.id} className={cn('hover:bg-slate-50 cursor-pointer', segVencido ? 'bg-red-50/30' : '')}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.folio}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{a.nombre}</div>
                          <div className="text-xs text-slate-400">{a.marca} {a.modelo} {a.anio} · {a.numero_economico}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{catLabel(a.categoria)}</td>
                        <td className="px-4 py-3 text-slate-500">{fmtDate(a.fecha_adquisicion)}</td>
                        <td className="px-4 py-3 font-medium">{fmt(a.costo_adquisicion)}</td>
                        <td className="px-4 py-3 text-red-600">{fmt(a.depreciacion_acumulada)}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{fmt(vlibros)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', estadoBadge(a.estado))}>
                            {a.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => verDetalle(a)} className="text-blue-600 hover:underline text-xs">Ver</button>
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

      {/* ── NUEVO / EDITAR ── */}
      {(tab === 'nuevo' || (tab === 'detalle' && editMode)) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 max-w-4xl">
          <h2 className="text-lg font-semibold text-slate-800">{editMode ? 'Editar activo' : 'Registrar nuevo activo'}</h2>

          {/* Datos generales */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 border-b pb-2">Datos generales</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Campo label="Nombre del activo *">
                  <input value={form.nombre || ''} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={inp} placeholder="Ej. Autobús Mercedes Benz O500" />
                </Campo>
              </div>
              <Campo label="Número económico">
                <input value={form.numero_economico || ''} onChange={e => setForm(p => ({ ...p, numero_economico: e.target.value }))} className={inp} placeholder="Ej. U-001" />
              </Campo>
              <Campo label="Categoría SAT *">
                <select value={form.categoria || 'autobuses'} onChange={e => {
                  const cat = SAT_CATEGORIAS.find(c => c.id === e.target.value)
                  setForm(p => ({ ...p, categoria: e.target.value, vida_util_anios: cat?.vida || 10 }))
                }} className={inp}>
                  {SAT_CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label} ({c.tasa}%/año)</option>)}
                </select>
              </Campo>
              <Campo label="Marca">
                <input value={form.marca || ''} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} className={inp} placeholder="Mercedes Benz, Volvo…" />
              </Campo>
              <Campo label="Modelo">
                <input value={form.modelo || ''} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} className={inp} />
              </Campo>
              <Campo label="Año">
                <input type="number" value={form.anio || ''} onChange={e => setForm(p => ({ ...p, anio: Number(e.target.value) }))} className={inp} />
              </Campo>
              <Campo label="N° de serie">
                <input value={form.numero_serie || ''} onChange={e => setForm(p => ({ ...p, numero_serie: e.target.value }))} className={inp} />
              </Campo>
              <Campo label="Ubicación">
                <input value={form.ubicacion || ''} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} className={inp} placeholder="Base principal, sucursal…" />
              </Campo>
              <Campo label="Responsable">
                <input value={form.responsable || ''} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))} className={inp} />
              </Campo>
            </div>
          </div>

          {/* Valores y depreciación */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 border-b pb-2">Valores y depreciación</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Campo label="Fecha adquisición *">
                <input type="date" value={form.fecha_adquisicion || ''} onChange={e => setForm(p => ({ ...p, fecha_adquisicion: e.target.value }))} className={inp} />
              </Campo>
              <Campo label="Costo adquisición *">
                <input type="number" value={form.costo_adquisicion || ''} onChange={e => setForm(p => ({ ...p, costo_adquisicion: Number(e.target.value) }))} className={inp} placeholder="0.00" />
              </Campo>
              <Campo label="Valor residual">
                <input type="number" value={form.valor_residual || ''} onChange={e => setForm(p => ({ ...p, valor_residual: Number(e.target.value) }))} className={inp} placeholder="0.00" />
              </Campo>
              <Campo label="Vida útil (años)">
                <input type="number" value={form.vida_util_anios || ''} onChange={e => setForm(p => ({ ...p, vida_util_anios: Number(e.target.value) }))} className={inp} />
              </Campo>
              <Campo label="Método depreciación">
                <select value={form.metodo_depreciacion || 'linea_recta'} onChange={e => setForm(p => ({ ...p, metodo_depreciacion: e.target.value }))} className={inp}>
                  {METODOS_DEPRECIACION.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Campo>
              {editMode && (
                <Campo label="Depr. acumulada">
                  <input type="number" value={form.depreciacion_acumulada || ''} onChange={e => setForm(p => ({ ...p, depreciacion_acumulada: Number(e.target.value) }))} className={inp} />
                </Campo>
              )}
              <Campo label="Estado">
                <select value={form.estado || 'activo'} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} className={inp}>
                  {ESTADOS_ACTIVO.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                </select>
              </Campo>
            </div>

            {/* Preview cálculo */}
            {(form.costo_adquisicion || 0) > 0 && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 text-xs mb-1">Depreciación anual</div>
                  <div className="font-semibold">{fmt(((form.costo_adquisicion || 0) - (form.valor_residual || 0)) / (form.vida_util_anios || 1))}</div>
                </div>
                <div>
                  <div className="text-blue-600 text-xs mb-1">Depreciación mensual</div>
                  <div className="font-semibold">{fmt(((form.costo_adquisicion || 0) - (form.valor_residual || 0)) / (form.vida_util_anios || 1) / 12)}</div>
                </div>
                <div>
                  <div className="text-blue-600 text-xs mb-1">Tasa SAT ({SAT_CATEGORIAS.find(c => c.id === form.categoria)?.tasa || 10}%/año)</div>
                  <div className="font-semibold">{fmt((form.costo_adquisicion || 0) * ((SAT_CATEGORIAS.find(c => c.id === form.categoria)?.tasa || 10) / 100))}/año</div>
                </div>
              </div>
            )}
          </div>

          {/* Seguro */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 border-b pb-2">Seguro</h3>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Póliza de seguro">
                <input value={form.poliza_seguro || ''} onChange={e => setForm(p => ({ ...p, poliza_seguro: e.target.value }))} className={inp} placeholder="Número de póliza" />
              </Campo>
              <Campo label="Vencimiento del seguro">
                <input type="date" value={form.vencimiento_seguro || ''} onChange={e => setForm(p => ({ ...p, vencimiento_seguro: e.target.value }))} className={inp} />
              </Campo>
            </div>
          </div>

          <Campo label="Descripción / Notas">
            <textarea value={form.descripcion || ''} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} className={inp} />
          </Campo>

          <div className="flex gap-3 pt-2">
            <button onClick={guardar} disabled={saving || !form.nombre || !form.costo_adquisicion} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Guardando…' : editMode ? 'Guardar cambios' : 'Registrar activo'}
            </button>
            <button onClick={() => setTab(selected ? 'detalle' : 'lista')} className="px-6 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── DETALLE ── */}
      {tab === 'detalle' && selected && !editMode && (
        <div className="space-y-4">
          {/* Header activo */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-slate-400">{selected.folio}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', estadoBadge(selected.estado))}>
                    {selected.estado.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selected.nombre}</h2>
                <p className="text-slate-500 text-sm">{selected.marca} {selected.modelo} {selected.anio} · {catLabel(selected.categoria)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setForm({ ...selected }); setEditMode(true); setTab('nuevo') }} className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">Editar</button>
                <button onClick={() => registrarDepreciacion(selected)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Registrar depr.</button>
              </div>
            </div>

            {/* Barra depreciación */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Depreciación acumulada: {fmt(selected.depreciacion_acumulada)} de {fmt(selected.costo_adquisicion - selected.valor_residual)}</span>
                <span>{calcPorcentajeDepreciado(selected).toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all" style={{ width: `${calcPorcentajeDepreciado(selected)}%` }} />
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit text-sm">
            {(['info', 'depreciacion', 'historial'] as const).map(t => (
              <button key={t} onClick={() => setDeprTab(t)} className={cn('px-3 py-1.5 rounded-md font-medium transition', deprTab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                {{ info: 'Información', depreciacion: 'Cálculo SAT', historial: 'Historial depr.' }[t]}
              </button>
            ))}
          </div>

          {/* Info */}
          {deprTab === 'info' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm border-b pb-2">Identificación</h3>
                {[
                  ['N° económico', selected.numero_economico],
                  ['N° de serie', selected.numero_serie],
                  ['Marca / Modelo', `${selected.marca} ${selected.modelo}`],
                  ['Año', selected.anio],
                  ['Ubicación', selected.ubicacion],
                  ['Responsable', selected.responsable],
                ].map(([k, v]) => v ? (
                  <div key={String(k)} className="flex justify-between text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ) : null)}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm border-b pb-2">Valores</h3>
                {[
                  ['Fecha adquisición', fmtDate(selected.fecha_adquisicion)],
                  ['Costo adquisición', fmt(selected.costo_adquisicion)],
                  ['Valor residual', fmt(selected.valor_residual)],
                  ['Depr. acumulada', fmt(selected.depreciacion_acumulada)],
                  ['Valor en libros', fmt(calcValorLibros(selected))],
                  ['Años transcurridos', calcAniosTranscurridos(selected)],
                  ['Póliza seguro', selected.poliza_seguro],
                  ['Vto. seguro', selected.vencimiento_seguro ? fmtDate(selected.vencimiento_seguro) : '—'],
                ].map(([k, v]) => v !== undefined && v !== null && v !== '' ? (
                  <div key={String(k)} className="flex justify-between text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className={cn('font-medium', String(k) === 'Valor en libros' ? 'text-green-700' : '')}>{String(v)}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Cálculo SAT */}
          {deprTab === 'depreciacion' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-semibold text-slate-700">Tabla de depreciación proyectada (Línea recta)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                      {['Año','Depr. anual','Depr. acumulada','Valor en libros'].map(h => <th key={h} className="px-4 py-2 text-right first:text-left">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Array.from({ length: selected.vida_util_anios }, (_, i) => {
                      const deprAnual = calcDepreciacionAnual(selected)
                      const acum = Math.min(selected.costo_adquisicion - selected.valor_residual, deprAnual * (i + 1))
                      const vlibros = selected.costo_adquisicion - acum
                      const anioCalc = new Date(selected.fecha_adquisicion).getFullYear() + i + 1
                      const esPasado = acum <= selected.depreciacion_acumulada
                      return (
                        <tr key={i} className={esPasado ? 'bg-blue-50/40' : ''}>
                          <td className="px-4 py-2">{anioCalc} {esPasado && <span className="text-xs text-blue-400 ml-1">✓</span>}</td>
                          <td className="px-4 py-2 text-right">{fmt(deprAnual)}</td>
                          <td className="px-4 py-2 text-right">{fmt(acum)}</td>
                          <td className="px-4 py-2 text-right font-medium">{fmt(vlibros)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-slate-400">
                Tasa SAT: {SAT_CATEGORIAS.find(c => c.id === selected.categoria)?.tasa || 10}% anual · Método: {selected.metodo_depreciacion.replace('_', ' ')} · Los períodos marcados con ✓ ya han sido alcanzados
              </div>
            </div>
          )}

          {/* Historial */}
          {deprTab === 'historial' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                    {['Período','Depreciación período','Valor en libros después','Registrado'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Sin movimientos registrados</td></tr>
                  ) : movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{m.periodo}</td>
                      <td className="px-4 py-3 text-red-600">{fmt(m.depreciacion_periodo)}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{fmt(m.valor_en_libros)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
