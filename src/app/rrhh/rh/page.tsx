'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, cn } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { Plus, Search, UserCheck, UserX, Clock, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient()

type Empleado = {
  id: string; first_name: string; last_name: string; employee_number?: string
  position?: string; department?: string; hire_date?: string; status: string
  phone?: string; email?: string; imss_number?: string; curp?: string; rfc?: string
  base_salary?: number; daily_rate?: number; turno?: string
}

type Asistencia = {
  id: string; empleado_id: string; nombre?: string
  fecha: string; hora_entrada?: string; hora_salida?: string
  tipo: 'normal' | 'falta' | 'permiso' | 'vacaciones' | 'incapacidad'
  notas?: string
}

type Vacacion = {
  id: string; empleado_id: string; nombre?: string
  fecha_inicio: string; fecha_fin: string; dias: number
  tipo: 'vacaciones' | 'permiso_goce' | 'permiso_sin_goce'
  status: 'solicitado' | 'aprobado' | 'rechazado'
  notas?: string
}

const TIPOS_ASISTENCIA: Record<string,string> = {
  normal: 'Normal', falta: 'Falta', permiso: 'Permiso', vacaciones: 'Vacaciones', incapacidad: 'Incapacidad'
}
const TIPO_COLOR: Record<string,string> = {
  normal: 'bg-green-100 text-green-700', falta: 'bg-red-100 text-red-700',
  permiso: 'bg-blue-100 text-blue-700', vacaciones: 'bg-purple-100 text-purple-700',
  incapacidad: 'bg-amber-100 text-amber-700'
}

const DEPARTAMENTOS = ['Operaciones','Taller','Administración','Logística','Ventas','Dirección']
const TURNOS = ['Mañana','Tarde','Noche','Mixto']

export default function RHPage() {
  const [tab, setTab] = useState<'personal'|'asistencia'|'vacaciones'|'organigrama'>('personal')
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([])
  const [search, setSearch] = useState('')
  const [filterDep, setFilterDep] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('active')
  const [selectedEmp, setSelectedEmp] = useState<Empleado|null>(null)
  const [showEmpDetail, setShowEmpDetail] = useState(false)
  const [asistFecha, setAsistFecha] = useState(new Date().toISOString().slice(0,10))
  const [asistForm, setAsistForm] = useState<Record<string, { tipo: string; hora_entrada: string; hora_salida: string; notas: string }>>({})
  const [vacForm, setVacForm] = useState({ empleado_id: '', fecha_inicio: '', fecha_fin: '', tipo: 'vacaciones', notas: '' })
  const [showVacForm, setShowVacForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const [{ data: e }, { data: a }, { data: v }] = await Promise.all([
      supabase.from('drivers').select('*').order('last_name'),
      supabase.from('attendance').select('*').order('fecha', { ascending: false }).limit(200),
      supabase.from('employee_leaves').select('*').order('fecha_inicio', { ascending: false }).limit(100),
    ])
    setEmpleados((e ?? []) as Empleado[])
    setAsistencias((a ?? []) as Asistencia[])
    setVacaciones((v ?? []) as Vacacion[])
  }, [])

  useEffect(() => { load() }, [load])

  // Initialize asist form when fecha changes
  useEffect(() => {
    if (tab !== 'asistencia') return
    const existing: Record<string, any> = {}
    asistencias.filter(a => a.fecha === asistFecha).forEach(a => {
      existing[a.empleado_id] = { tipo: a.tipo, hora_entrada: a.hora_entrada ?? '', hora_salida: a.hora_salida ?? '', notas: a.notas ?? '' }
    })
    const init: typeof asistForm = {}
    filteredEmp.forEach(emp => {
      init[emp.id] = existing[emp.id] ?? { tipo: 'normal', hora_entrada: '', hora_salida: '', notas: '' }
    })
    setAsistForm(init)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asistFecha, tab, asistencias])

  const filteredEmp = empleados.filter(e => {
    const q = search.toLowerCase()
    const full = `${e.first_name} ${e.last_name}`.toLowerCase()
    const matchQ = !q || full.includes(q) || (e.employee_number ?? '').toLowerCase().includes(q)
    const matchD = filterDep === 'todos' || e.department === filterDep
    const matchS = filterStatus === 'todos' || e.status === filterStatus
    return matchQ && matchD && matchS
  })

  async function guardarAsistencia() {
    setLoading(true)
    try {
      const records = Object.entries(asistForm).map(([emp_id, data]) => ({
        empleado_id: emp_id, fecha: asistFecha,
        tipo: data.tipo, hora_entrada: data.hora_entrada || null,
        hora_salida: data.hora_salida || null, notas: data.notas || null,
      }))
      // Upsert by empleado_id + fecha
      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'empleado_id,fecha', ignoreDuplicates: false })
      if (error) throw error
      await auditLog({ action: 'UPDATE', module: 'RRHH', table_name: 'attendance' })
      toast.success('Asistencia guardada')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function solicitarVacacion() {
    if (!vacForm.empleado_id || !vacForm.fecha_inicio || !vacForm.fecha_fin) {
      toast.error('Completa los campos requeridos'); return
    }
    const dias = Math.round((new Date(vacForm.fecha_fin).getTime() - new Date(vacForm.fecha_inicio).getTime()) / 86400000) + 1
    if (dias <= 0) { toast.error('Fechas inválidas'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('employee_leaves').insert({
        empleado_id: vacForm.empleado_id,
        fecha_inicio: vacForm.fecha_inicio, fecha_fin: vacForm.fecha_fin,
        dias, tipo: vacForm.tipo, status: 'solicitado', notas: vacForm.notas || null,
      }).select().single()
      if (error) throw error
      await auditLog({ action: 'INSERT', module: 'RRHH', table_name: 'employee_leaves', record_id: data.id })
      toast.success('Solicitud registrada')
      setVacForm({ empleado_id: '', fecha_inicio: '', fecha_fin: '', tipo: 'vacaciones', notas: '' })
      setShowVacForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    } finally { setLoading(false) }
  }

  async function aprobarVacacion(v: Vacacion, aprobado: boolean) {
    await supabase.from('employee_leaves').update({ status: aprobado ? 'aprobado' : 'rechazado' }).eq('id', v.id)
    toast.success(aprobado ? 'Solicitud aprobada' : 'Solicitud rechazada')
    load()
  }

  // KPIs
  const activos = empleados.filter(e => e.status === 'active').length
  const inactivos = empleados.filter(e => e.status === 'inactive').length
  const asistHoy = asistencias.filter(a => a.fecha === new Date().toISOString().slice(0,10))
  const faltasHoy = asistHoy.filter(a => a.tipo === 'falta').length
  const pendVac = vacaciones.filter(v => v.status === 'solicitado').length

  // Group by department for organigrama
  const byDep = DEPARTAMENTOS.map(dep => ({
    dep, members: empleados.filter(e => e.department === dep && e.status === 'active')
  })).filter(g => g.members.length > 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">👥</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Recursos Humanos</h1>
            <p className="text-sm text-slate-500">Gestión de personal y asistencia</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Activos', val: String(activos), color:'text-green-700', bg:'bg-green-50' },
          { label:'Inactivos', val: String(inactivos), color:'text-slate-600', bg:'bg-slate-50' },
          { label:'Faltas hoy', val: String(faltasHoy), color: faltasHoy > 0 ? 'text-red-700' : 'text-slate-500', bg: faltasHoy > 0 ? 'bg-red-50' : 'bg-slate-50' },
          { label:'Vacaciones pend.', val: String(pendVac), color: pendVac > 0 ? 'text-amber-700' : 'text-slate-500', bg: pendVac > 0 ? 'bg-amber-50' : 'bg-slate-50' },
        ].map(k => (
          <div key={k.label} className={cn('rounded-xl border border-slate-100 p-4', k.bg)}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn('text-xl font-bold mt-1', k.color)}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit text-sm overflow-x-auto">
        {(['personal','asistencia','vacaciones','organigrama'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'personal' ? 'Personal' : t === 'asistencia' ? 'Asistencia' : t === 'vacaciones' ? 'Vacaciones' : 'Organigrama'}
          </button>
        ))}
      </div>

      {/* PERSONAL */}
      {tab === 'personal' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <select value={filterDep} onChange={e => setFilterDep(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="todos">Todos los departamentos</option>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase bg-red-50 border-b">
                    {['Nombre','No. Emp','Departamento','Puesto','Turno','IMSS','Alta','Estado'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEmp.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Sin empleados</td></tr>
                  ) : filteredEmp.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => { setSelectedEmp(e); setShowEmpDetail(true) }}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{e.first_name} {e.last_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-red-600">{e.employee_number ?? '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{e.department ?? '—'}</span></td>
                      <td className="px-4 py-3 text-slate-600">{e.position ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{e.turno ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{e.imss_number ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(e.hire_date ?? '')}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                          e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                          {e.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee detail panel */}
          {showEmpDetail && selectedEmp && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowEmpDetail(false)}>
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedEmp.first_name} {selectedEmp.last_name}</h2>
                    <p className="text-sm text-slate-500">{selectedEmp.position} · {selectedEmp.department}</p>
                  </div>
                  <button onClick={() => setShowEmpDetail(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['No. Empleado', selectedEmp.employee_number ?? '—'],
                    ['CURP', selectedEmp.curp ?? '—'],
                    ['RFC', selectedEmp.rfc ?? '—'],
                    ['IMSS', selectedEmp.imss_number ?? '—'],
                    ['Teléfono', selectedEmp.phone ?? '—'],
                    ['Correo', selectedEmp.email ?? '—'],
                    ['Turno', selectedEmp.turno ?? '—'],
                    ['Fecha alta', fmtDate(selectedEmp.hire_date ?? '')],
                    ['Salario base', selectedEmp.base_salary ? `$${selectedEmp.base_salary.toLocaleString('es-MX', {minimumFractionDigits:2})}` : '—'],
                    ['Salario diario', selectedEmp.daily_rate ? `$${selectedEmp.daily_rate.toLocaleString('es-MX', {minimumFractionDigits:2})}` : '—'],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <span className="text-xs text-slate-400">{k}</span>
                      <p className="font-medium text-slate-700 text-xs">{v}</p>
                    </div>
                  ))}
                </div>
                {/* Mini asistencia history */}
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Últimas asistencias</h3>
                  <div className="flex gap-1 flex-wrap">
                    {asistencias.filter(a => a.empleado_id === selectedEmp.id).slice(0,14).map(a => (
                      <div key={a.id} title={`${a.fecha}: ${TIPOS_ASISTENCIA[a.tipo]}`}
                        className={cn('w-7 h-7 rounded flex items-center justify-center text-xs font-bold', TIPO_COLOR[a.tipo] ?? 'bg-slate-100 text-slate-400')}>
                        {a.tipo === 'normal' ? '✓' : a.tipo === 'falta' ? 'F' : a.tipo === 'permiso' ? 'P' : a.tipo === 'vacaciones' ? 'V' : 'I'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ASISTENCIA */}
      {tab === 'asistencia' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Fecha:</label>
            <input type="date" value={asistFecha} onChange={e => setAsistFecha(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
            <button onClick={guardarAsistencia} disabled={loading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Guardando…' : 'Guardar asistencia'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase bg-red-50 border-b">
                    {['Empleado','Departamento','Tipo','Entrada','Salida','Notas'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {empleados.filter(e => e.status === 'active').length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin empleados activos</td></tr>
                  ) : empleados.filter(e => e.status === 'active').map(emp => {
                    const row = asistForm[emp.id] ?? { tipo: 'normal', hora_entrada: '', hora_salida: '', notas: '' }
                    return (
                      <tr key={emp.id} className={cn('hover:bg-slate-50/30', row.tipo === 'falta' && 'bg-red-50/30')}>
                        <td className="px-4 py-2 font-medium text-slate-800">{emp.first_name} {emp.last_name}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{emp.department ?? '—'}</td>
                        <td className="px-4 py-2">
                          <select value={row.tipo} onChange={e => setAsistForm(prev => ({...prev, [emp.id]: {...row, tipo: e.target.value}}))}
                            className={cn('px-2 py-1 text-xs border rounded focus:outline-none', TIPO_COLOR[row.tipo] ?? '', 'border-transparent')}>
                            {Object.entries(TIPOS_ASISTENCIA).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input type="time" value={row.hora_entrada} disabled={row.tipo !== 'normal'}
                            onChange={e => setAsistForm(prev => ({...prev, [emp.id]: {...row, hora_entrada: e.target.value}}))}
                            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-40" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="time" value={row.hora_salida} disabled={row.tipo !== 'normal'}
                            onChange={e => setAsistForm(prev => ({...prev, [emp.id]: {...row, hora_salida: e.target.value}}))}
                            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-40" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={row.notas} onChange={e => setAsistForm(prev => ({...prev, [emp.id]: {...row, notas: e.target.value}}))}
                            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-400 w-36" placeholder="Nota opcional" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen del día */}
          {asistFecha && (
            <div className="flex gap-3 text-xs flex-wrap">
              {Object.entries(TIPOS_ASISTENCIA).map(([tipo, label]) => {
                const count = Object.values(asistForm).filter(r => r.tipo === tipo).length
                return count > 0 ? (
                  <span key={tipo} className={cn('px-3 py-1.5 rounded-full font-semibold', TIPO_COLOR[tipo] ?? 'bg-slate-100 text-slate-600')}>
                    {label}: {count}
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>
      )}

      {/* VACACIONES */}
      {tab === 'vacaciones' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-700">Solicitudes de vacaciones / permisos</h2>
            <button onClick={() => setShowVacForm(!showVacForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
              <Plus size={14} /> Nueva solicitud
            </button>
          </div>

          {showVacForm && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 max-w-lg">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Nueva solicitud</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
                  <select value={vacForm.empleado_id} onChange={e => setVacForm({...vacForm, empleado_id: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">Seleccionar…</option>
                    {empleados.filter(e => e.status === 'active').map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select value={vacForm.tipo} onChange={e => setVacForm({...vacForm, tipo: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="vacaciones">Vacaciones</option>
                    <option value="permiso_goce">Permiso con goce</option>
                    <option value="permiso_sin_goce">Permiso sin goce</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio *</label>
                  <input type="date" value={vacForm.fecha_inicio} onChange={e => setVacForm({...vacForm, fecha_inicio: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha fin *</label>
                  <input type="date" value={vacForm.fecha_fin} onChange={e => setVacForm({...vacForm, fecha_fin: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notas / motivo</label>
                  <textarea value={vacForm.notas} onChange={e => setVacForm({...vacForm, notas: e.target.value})} rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={solicitarVacacion} disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {loading ? 'Guardando…' : 'Registrar'}
                </button>
                <button onClick={() => setShowVacForm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase bg-red-50 border-b">
                    {['Empleado','Tipo','Inicio','Fin','Días','Estado','Acciones'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vacaciones.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Sin solicitudes</td></tr>
                  ) : vacaciones.map(v => {
                    const emp = empleados.find(e => e.id === v.empleado_id)
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {emp ? `${emp.first_name} ${emp.last_name}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            {v.tipo === 'vacaciones' ? 'Vacaciones' : v.tipo === 'permiso_goce' ? 'Permiso c/goce' : 'Permiso s/goce'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(v.fecha_inicio)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(v.fecha_fin)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{v.dias}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                            v.status === 'aprobado' ? 'bg-green-100 text-green-700' :
                            v.status === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                            {v.status === 'aprobado' ? 'Aprobado' : v.status === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {v.status === 'solicitado' && (
                            <div className="flex gap-1">
                              <button onClick={() => aprobarVacacion(v, true)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Aprobar</button>
                              <button onClick={() => aprobarVacacion(v, false)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Rechazar</button>
                            </div>
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

      {/* ORGANIGRAMA */}
      {tab === 'organigrama' && (
        <div className="space-y-4">
          {byDep.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
              Asigna departamentos a los empleados para ver el organigrama
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {byDep.map(({ dep, members }) => (
                <div key={dep} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-100">
                    <p className="text-sm font-bold text-red-800">{dep}</p>
                    <p className="text-xs text-red-500">{members.length} persona{members.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {members.map(e => (
                      <div key={e.id} className="px-4 py-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                          {e.first_name[0]}{e.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{e.first_name} {e.last_name}</p>
                          <p className="text-xs text-slate-400">{e.position ?? 'Sin puesto'} · Turno {e.turno ?? '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
