'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { Plus, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient()

type Fondo = {
  id: string; fund_name: string; custodian_id?: string; custodian_name?: string
  initial_amount: number; current_balance: number; status: 'active' | 'replenishing' | 'closed'
  min_balance?: number; created_at: string
}

type Movimiento = {
  id: string; petty_cash_id: string; fund_name?: string
  movement_date: string; description: string; category: string
  amount: number; tipo: 'egreso' | 'reposicion' | 'ajuste'
  receipt_number?: string; authorized_by?: string; created_at: string
}

const CATEGORIAS = ['Combustible','Viáticos','Material oficina','Limpieza','Mensajería','Comidas','Refacciones menores','Ferretería','Varios']

export default function CajaPage() {
  const [tab, setTab] = useState<'fondos'|'movimientos'|'nuevo_mov'|'nuevo_fondo'>('fondos')
  const [fondos, setFondos] = useState<Fondo[]>([])
  const [movs, setMovs] = useState<Movimiento[]>([])
  const [selectedFondo, setSelectedFondo] = useState<string>('')
  const [movForm, setMovForm] = useState<{ petty_cash_id: string; description: string; category: string; amount: number; tipo: 'egreso' | 'reposicion' | 'ajuste'; receipt_number: string; authorized_by: string }>({ petty_cash_id: '', description: '', category: 'Varios', amount: 0, tipo: 'egreso', receipt_number: '', authorized_by: '' })
  const [fondoForm, setFondoForm] = useState({ fund_name: '', initial_amount: 0, min_balance: 0 })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const [{ data: f }, { data: m }] = await Promise.all([
      supabase.from('petty_cash').select('*').order('fund_name'),
      supabase.from('petty_cash_movements').select('*, petty_cash:petty_cash(fund_name)').order('movement_date', { ascending: false }).limit(100),
    ])
    const fondosMapped = (f ?? []).map((x: any) => ({
      ...x, fund_name: x.fund_name ?? x.nombre ?? '',
      initial_amount: x.initial_amount ?? x.monto_inicial ?? 0,
      current_balance: x.current_balance ?? x.saldo_actual ?? 0,
    }))
    setFondos(fondosMapped)
    const movsMapped = (m ?? []).map((x: any) => ({
      id: x.id, petty_cash_id: x.petty_cash_id,
      fund_name: x.petty_cash?.fund_name ?? '',
      movement_date: x.movement_date ?? x.fecha ?? x.created_at?.slice(0,10),
      description: x.description ?? x.descripcion ?? '',
      category: x.category ?? x.categoria ?? 'Varios',
      amount: x.amount ?? x.monto ?? 0,
      tipo: x.tipo ?? (x.movement_type === 'replenishment' ? 'reposicion' : 'egreso'),
      receipt_number: x.receipt_number ?? x.numero_recibo,
      authorized_by: x.authorized_by,
      created_at: x.created_at,
    }))
    setMovs(movsMapped)
  }, [])

  useEffect(() => { load() }, [load])

  const movsFiltrados = selectedFondo ? movs.filter(m => m.petty_cash_id === selectedFondo) : movs

  async function guardarMov() {
    if (!movForm.petty_cash_id) { toast.error('Selecciona un fondo'); return }
    if (!movForm.description) { toast.error('Ingresa una descripción'); return }
    if (!movForm.amount || movForm.amount <= 0) { toast.error('Monto inválido'); return }
    const fondo = fondos.find(f => f.id === movForm.petty_cash_id)
    if (!fondo) { toast.error('Fondo no encontrado'); return }
    if ((movForm.tipo as string) === 'egreso' && movForm.amount > fondo.current_balance + 0.01) {
      toast.error(`Saldo insuficiente (${fmt(fondo.current_balance)})`); return
    }
    setLoading(true)
    try {
      const delta = movForm.tipo === 'egreso' ? -movForm.amount : movForm.amount
      const newBalance = fondo.current_balance + delta

      const { data, error } = await supabase.from('petty_cash_movements').insert({
        petty_cash_id: movForm.petty_cash_id,
        movement_date: new Date().toISOString().slice(0,10),
        description: movForm.description, category: movForm.category,
        amount: movForm.amount, tipo: movForm.tipo,
        receipt_number: movForm.receipt_number || null,
        authorized_by: movForm.authorized_by || null,
        movement_type: movForm.tipo === 'reposicion' ? 'replenishment' : 'expense',
      }).select().single()
      if (error) throw error

      // Update balance
      const newStatus = newBalance < (fondo.min_balance ?? fondo.initial_amount * 0.2) ? 'replenishing' : 'active'
      await supabase.from('petty_cash').update({ current_balance: newBalance, status: newStatus }).eq('id', fondo.id)

      await auditLog({ action: 'INSERT', module: 'CAJA', table_name: 'petty_cash_movements', record_id: data.id })
      toast.success('Movimiento registrado')
      setMovForm({ petty_cash_id: '', description: '', category: 'Varios', amount: 0, tipo: 'egreso', receipt_number: '', authorized_by: '' })
      setTab('movimientos')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function crearFondo() {
    if (!fondoForm.fund_name || !fondoForm.initial_amount) { toast.error('Completa nombre y monto'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('petty_cash').insert({
        fund_name: fondoForm.fund_name,
        initial_amount: fondoForm.initial_amount,
        current_balance: fondoForm.initial_amount,
        min_balance: fondoForm.min_balance || fondoForm.initial_amount * 0.2,
        status: 'active',
      }).select().single()
      if (error) throw error
      await auditLog({ action: 'INSERT', module: 'CAJA', table_name: 'petty_cash', record_id: data.id })
      toast.success('Fondo creado')
      setFondoForm({ fund_name: '', initial_amount: 0, min_balance: 0 })
      setTab('fondos')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al crear fondo')
    } finally { setLoading(false) }
  }

  async function reponerFondo(fondo: Fondo) {
    const montoStr = prompt(`Monto de reposición para "${fondo.fund_name}":`)
    if (!montoStr) return
    const monto = parseFloat(montoStr)
    if (isNaN(monto) || monto <= 0) { toast.error('Monto inválido'); return }
    const newBalance = fondo.current_balance + monto
    if (newBalance > fondo.initial_amount * 1.01) {
      if (!confirm(`El saldo (${fmt(newBalance)}) supera el fondo inicial (${fmt(fondo.initial_amount)}). ¿Continuar?`)) return
    }
    try {
      await supabase.from('petty_cash_movements').insert({
        petty_cash_id: fondo.id,
        movement_date: new Date().toISOString().slice(0,10),
        description: `Reposición de fondo`,
        category: 'Reposición', amount: monto, tipo: 'reposicion', movement_type: 'replenishment',
      })
      await supabase.from('petty_cash').update({ current_balance: newBalance, status: 'active' }).eq('id', fondo.id)
      toast.success('Fondo repuesto correctamente')
      load()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    }
  }

  // KPIs
  const totalDisponible = fondos.filter(f => f.status !== 'closed').reduce((s,f) => s + f.current_balance, 0)
  const fondosAlerta = fondos.filter(f => f.current_balance < (f.min_balance ?? f.initial_amount * 0.2) && f.status !== 'closed').length
  const gastoHoy = movs.filter(m => m.movement_date === new Date().toISOString().slice(0,10) && m.tipo === 'egreso').reduce((s,m) => s + m.amount, 0)
  const mesInicio = new Date(); mesInicio.setDate(1)
  const gastoMes = movs.filter(m => new Date(m.movement_date) >= mesInicio && m.tipo === 'egreso').reduce((s,m) => s + m.amount, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">💵</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Caja Chica</h1>
            <p className="text-sm text-slate-500">{fondos.length} fondos activos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('nuevo_mov')}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
            <Plus size={14} /> Gasto
          </button>
          <button onClick={() => setTab('nuevo_fondo')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800">
            <Plus size={14} /> Nuevo fondo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Disponible total', val: fmt(totalDisponible), color:'text-teal-700', bg:'bg-teal-50' },
          { label:'Fondos con alerta', val: String(fondosAlerta), color: fondosAlerta > 0 ? 'text-red-700' : 'text-slate-600', bg: fondosAlerta > 0 ? 'bg-red-50' : 'bg-slate-50' },
          { label:'Gasto hoy', val: fmt(gastoHoy), color:'text-slate-700', bg:'bg-slate-50' },
          { label:'Gasto este mes', val: fmt(gastoMes), color:'text-amber-700', bg:'bg-amber-50' },
        ].map(k => (
          <div key={k.label} className={cn('rounded-xl border border-slate-100 p-4', k.bg)}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={cn('text-xl font-bold mt-1', k.color)}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit text-sm">
        {(['fondos','movimientos','nuevo_mov','nuevo_fondo'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-md font-medium transition-colors',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'fondos' ? 'Fondos' : t === 'movimientos' ? 'Movimientos' : t === 'nuevo_mov' ? 'Nuevo gasto' : 'Nuevo fondo'}
          </button>
        ))}
      </div>

      {/* FONDOS */}
      {tab === 'fondos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fondos.length === 0 ? (
            <div className="col-span-3 bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
              <span className="text-5xl">💵</span>
              <p className="mt-3">Sin fondos de caja chica</p>
            </div>
          ) : fondos.map(f => {
            const pct = Math.round((f.current_balance / f.initial_amount) * 100)
            const alerta = f.current_balance < (f.min_balance ?? f.initial_amount * 0.2)
            return (
              <div key={f.id} className={cn('bg-white rounded-xl border shadow-sm p-5', alerta ? 'border-red-200' : 'border-slate-100')}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-900">{f.fund_name}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                    f.status === 'active' ? 'bg-green-100 text-green-700' :
                    f.status === 'replenishing' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                    {f.status === 'active' ? 'Activo' : f.status === 'replenishing' ? 'Reponiendo' : 'Cerrado'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400">Fondo</p>
                    <p className="font-bold text-slate-800">{fmt(f.initial_amount)}</p>
                  </div>
                  <div className={cn('rounded-lg p-3 text-center', alerta ? 'bg-red-50' : 'bg-green-50')}>
                    <p className="text-xs text-slate-400">Disponible</p>
                    <p className={cn('font-bold', alerta ? 'text-red-600' : 'text-green-700')}>{fmt(f.current_balance)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                  <div className={cn('h-2 rounded-full transition-all', pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-teal-500')}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">{pct}% disponible</p>
                  {alerta && (
                    <button onClick={() => reponerFondo(f)}
                      className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded hover:bg-amber-100">
                      <RefreshCw size={11} /> Reponer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MOVIMIENTOS */}
      {tab === 'movimientos' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <select value={selectedFondo} onChange={e => setSelectedFondo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Todos los fondos</option>
              {fondos.map(f => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
            </select>
            <span className="text-xs text-slate-500">{movsFiltrados.length} movimientos</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-400 uppercase bg-slate-50 border-b">
                    {['Fecha','Fondo','Descripción','Categoría','Tipo','Monto','Recibo'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movsFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Sin movimientos</td></tr>
                  ) : movsFiltrados.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(m.movement_date)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{m.fund_name}</td>
                      <td className="px-4 py-3 text-slate-700">{m.description}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{m.category}</span></td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                          m.tipo === 'egreso' ? 'bg-red-100 text-red-700' :
                          m.tipo === 'reposicion' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>
                          {m.tipo === 'egreso' ? 'Egreso' : m.tipo === 'reposicion' ? 'Reposición' : 'Ajuste'}
                        </span>
                      </td>
                      <td className={cn('px-4 py-3 font-bold', m.tipo === 'egreso' ? 'text-red-600' : 'text-green-700')}>
                        {m.tipo === 'egreso' ? '-' : '+'}{fmt(m.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{m.receipt_number ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO GASTO */}
      {tab === 'nuevo_mov' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-lg">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Registrar Gasto / Movimiento</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fondo *</label>
              <select value={movForm.petty_cash_id} onChange={e => setMovForm({...movForm, petty_cash_id: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Seleccionar fondo…</option>
                {fondos.filter(f => f.status !== 'closed').map(f => (
                  <option key={f.id} value={f.id}>{f.fund_name} — {fmt(f.current_balance)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <div className="flex gap-2">
                {(['egreso','ajuste'] as const).map(t => (
                  <button key={t} onClick={() => setMovForm({...movForm, tipo: t})}
                    className={cn('flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
                      movForm.tipo === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
                    {t === 'egreso' ? 'Gasto / Egreso' : 'Ajuste'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción *</label>
              <input value={movForm.description} onChange={e => setMovForm({...movForm, description: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="¿En qué se gastó?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                <select value={movForm.category} onChange={e => setMovForm({...movForm, category: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Monto *</label>
                <input type="number" min="0" step="0.01" value={movForm.amount || ''}
                  onChange={e => setMovForm({...movForm, amount: parseFloat(e.target.value)||0})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">No. recibo / factura</label>
                <input value={movForm.receipt_number} onChange={e => setMovForm({...movForm, receipt_number: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Autorizado por</label>
                <input value={movForm.authorized_by} onChange={e => setMovForm({...movForm, authorized_by: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={guardarMov} disabled={loading}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setTab('movimientos')}
              className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* NUEVO FONDO */}
      {tab === 'nuevo_fondo' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-md">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Crear Fondo de Caja Chica</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del fondo *</label>
              <input value={fondoForm.fund_name} onChange={e => setFondoForm({...fondoForm, fund_name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej: Caja operaciones, Caja taller" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto inicial *</label>
              <input type="number" min="0" step="100" value={fondoForm.initial_amount || ''}
                onChange={e => setFondoForm({...fondoForm, initial_amount: parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Saldo mínimo para alerta</label>
              <input type="number" min="0" step="100" value={fondoForm.min_balance || ''}
                onChange={e => setFondoForm({...fondoForm, min_balance: parseFloat(e.target.value)||0})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Dejar en 0 para usar 20% del fondo" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={crearFondo} disabled={loading}
              className="px-5 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Creando…' : 'Crear fondo'}
            </button>
            <button onClick={() => setTab('fondos')}
              className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
