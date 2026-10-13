'use client'

/**
 * Tesorería / Bancos — MrBus
 * Cuentas bancarias, movimientos, transferencias, conciliación
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, cn } from '@/lib/utils/index'
import { auditLog } from '@/lib/audit'
import { TrendingUp, TrendingDown, ArrowRightLeft, Plus, Wallet, AlertCircle } from 'lucide-react'

type Cuenta = {
  id: string
  nombre: string
  banco: string
  tipo: 'cheques' | 'ahorro' | 'efectivo' | 'tarjeta' | 'inversion'
  moneda: string
  saldo: number
  numero_cuenta: string
  clabe: string
  activa: boolean
  created_at: string
}

type Movimiento = {
  id: string
  cuenta_id: string
  cuenta_nombre?: string
  fecha: string
  descripcion: string
  tipo: 'ingreso' | 'egreso' | 'transferencia'
  monto: number
  saldo_despues: number
  referencia: string
  categoria: string
  conciliado: boolean
  created_at: string
}

const BANCOS_MX = ['BBVA', 'Santander', 'Banamex', 'Banorte', 'HSBC', 'Inbursa', 'Scotiabank', 'BanBajío', 'Efectivo', 'Otro']
const TIPOS_CUENTA = ['cheques', 'ahorro', 'efectivo', 'tarjeta', 'inversion']
const CATEGORIAS = ['Operación', 'Nómina', 'Combustible', 'Mantenimiento', 'Casetas', 'Seguros', 'Renta', 'Cobranza', 'Transferencia', 'Otro']

const TIPO_COLOR: Record<string, string> = {
  ingreso: 'bg-green-100 text-green-700',
  egreso: 'bg-red-100 text-red-600',
  transferencia: 'bg-blue-100 text-blue-700',
}
const TIPO_ICON: Record<string, string> = { cheques: '🏦', ahorro: '🏦', efectivo: '💵', tarjeta: '💳', inversion: '📈' }

function emptyCuenta(): Partial<Cuenta> {
  return { nombre: '', banco: 'BBVA', tipo: 'cheques', moneda: 'MXN', saldo: 0, numero_cuenta: '', clabe: '', activa: true }
}

function emptyMov(cuentaId = ''): Partial<Movimiento> {
  return { cuenta_id: cuentaId, fecha: new Date().toISOString().slice(0, 10), descripcion: '', tipo: 'egreso', monto: 0, referencia: '', categoria: 'Operación', conciliado: false }
}

export default function TesoreriaPage() {
  const sb = createClient()
  const [tab, setTab] = useState<'cuentas' | 'movimientos' | 'nuevo_mov' | 'nueva_cuenta' | 'transferencia'>('cuentas')
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formCuenta, setFormCuenta] = useState<Partial<Cuenta>>(emptyCuenta())
  const [formMov, setFormMov] = useState<Partial<Movimiento>>(emptyMov())
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7))
  const [busqueda, setBusqueda] = useState('')
  // Transferencia
  const [trf, setTrf] = useState({ origen: '', destino: '', monto: 0, concepto: '' })

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: m }] = await Promise.all([
      sb.from('bank_accounts').select('*').eq('activa', true).order('nombre'),
      sb.from('bank_movements').select('*, cuenta:bank_accounts(nombre)').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(200),
    ])
    const movs = (m || []).map((x: Movimiento & { cuenta: { nombre: string } | null }) => ({ ...x, cuenta_nombre: x.cuenta?.nombre || '' }))
    setCuentas((c || []) as Cuenta[])
    setMovimientos(movs as Movimiento[])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalActivos = cuentas.filter(c => c.saldo >= 0).reduce((s, c) => s + c.saldo, 0)
  const totalPasivos = cuentas.filter(c => c.saldo < 0).reduce((s, c) => s + c.saldo, 0)
  const mesActual = new Date().toISOString().slice(0, 7)
  const movMes = movimientos.filter(m => m.fecha?.startsWith(mesActual))
  const ingresosMes = movMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresosMes  = movMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const sinConciliar = movimientos.filter(m => !m.conciliado).length

  // ── Filtros movimientos ───────────────────────────────────────────────────
  const movFiltrados = movimientos.filter(m => {
    const matchTipo = !filtroTipo || m.tipo === filtroTipo
    const matchMes  = !filtroMes  || m.fecha?.startsWith(filtroMes)
    const matchQ    = !busqueda   || m.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) || m.referencia?.toLowerCase().includes(busqueda.toLowerCase())
    return matchTipo && matchMes && matchQ
  })

  // ── Guardar cuenta ────────────────────────────────────────────────────────
  async function guardarCuenta() {
    if (!formCuenta.nombre || !formCuenta.banco) return
    setSaving(true)
    try {
      const { data, error } = await sb.from('bank_accounts').insert({ ...formCuenta }).select().single()
      if (!error && data) {
        await auditLog({ action: 'INSERT', module: 'tesoreria', table_name: 'bank_accounts', record_id: data.id, after_data: data })
        await cargar(); setFormCuenta(emptyCuenta()); setTab('cuentas')
      }
    } finally { setSaving(false) }
  }

  // ── Guardar movimiento ────────────────────────────────────────────────────
  async function guardarMov() {
    if (!formMov.cuenta_id || !formMov.descripcion || !formMov.monto) return
    setSaving(true)
    try {
      const cuenta = cuentas.find(c => c.id === formMov.cuenta_id)
      const saldoAntes = cuenta?.saldo || 0
      const delta = formMov.tipo === 'egreso' ? -(formMov.monto || 0) : (formMov.monto || 0)
      const saldoDespues = saldoAntes + delta

      // Registrar movimiento
      const { data: mov, error } = await sb.from('bank_movements').insert({
        ...formMov, saldo_despues: saldoDespues,
      }).select().single()
      if (error) { setSaving(false); return }

      // Actualizar saldo de cuenta
      await sb.from('bank_accounts').update({ saldo: saldoDespues }).eq('id', formMov.cuenta_id)
      await auditLog({ action: 'INSERT', module: 'tesoreria', table_name: 'bank_movements', record_id: mov.id, after_data: { ...mov, delta, saldo_anterior: saldoAntes } })
      await cargar(); setFormMov(emptyMov()); setTab('movimientos')
    } finally { setSaving(false) }
  }

  // ── Transferencia ─────────────────────────────────────────────────────────
  async function ejecutarTransferencia() {
    if (!trf.origen || !trf.destino || !trf.monto || trf.origen === trf.destino) return
    setSaving(true)
    try {
      const cOrigen = cuentas.find(c => c.id === trf.origen)
      const cDestino = cuentas.find(c => c.id === trf.destino)
      if (!cOrigen || !cDestino) return

      const fecha = new Date().toISOString().slice(0, 10)
      const ref = `TRF-${Date.now().toString(36).toUpperCase()}`

      // Egreso en cuenta origen
      await sb.from('bank_movements').insert({ cuenta_id: trf.origen, fecha, descripcion: `Transferencia a ${cDestino.nombre}: ${trf.concepto}`, tipo: 'transferencia', monto: trf.monto, referencia: ref, categoria: 'Transferencia', conciliado: false, saldo_despues: cOrigen.saldo - trf.monto })
      await sb.from('bank_accounts').update({ saldo: cOrigen.saldo - trf.monto }).eq('id', trf.origen)
      // Ingreso en cuenta destino
      await sb.from('bank_movements').insert({ cuenta_id: trf.destino, fecha, descripcion: `Transferencia desde ${cOrigen.nombre}: ${trf.concepto}`, tipo: 'transferencia', monto: trf.monto, referencia: ref, categoria: 'Transferencia', conciliado: false, saldo_despues: cDestino.saldo + trf.monto })
      await sb.from('bank_accounts').update({ saldo: cDestino.saldo + trf.monto }).eq('id', trf.destino)

      await cargar(); setTrf({ origen: '', destino: '', monto: 0, concepto: '' }); setTab('movimientos')
    } finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent'

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tesorería</h1>
            <p className="text-slate-400 text-sm">{cuentas.length} cuentas · Posición neta {fmt(totalActivos + totalPasivos)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('nueva_cuenta')} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
            <Plus size={14} /> Cuenta
          </button>
          <button onClick={() => { setFormMov(emptyMov()); setTab('nuevo_mov') }} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
            <Plus size={14} /> Movimiento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-teal-50 rounded-xl p-4">
          <div className="text-xs text-teal-600 mb-1 font-medium">Posición neta</div>
          <div className="text-2xl font-bold text-teal-700">{fmt(totalActivos + totalPasivos)}</div>
          <div className="text-xs text-teal-500 mt-0.5">{cuentas.length} cuentas activas</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-xs text-green-600 mb-1 font-medium">Ingresos {mesActual}</div>
          <div className="text-2xl font-bold text-green-700">{fmt(ingresosMes)}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-xs text-red-500 mb-1 font-medium">Egresos {mesActual}</div>
          <div className="text-2xl font-bold text-red-600">{fmt(egresosMes)}</div>
          <div className="text-xs text-red-400 mt-0.5">Flujo neto: {fmt(ingresosMes - egresosMes)}</div>
        </div>
        <div className={cn('rounded-xl p-4', sinConciliar > 0 ? 'bg-yellow-50' : 'bg-slate-50')}>
          <div className={cn('text-xs mb-1 font-medium', sinConciliar > 0 ? 'text-yellow-600' : 'text-slate-500')}>Sin conciliar</div>
          <div className={cn('text-2xl font-bold', sinConciliar > 0 ? 'text-yellow-700' : 'text-slate-600')}>{sinConciliar}</div>
          <div className="text-xs text-slate-400 mt-0.5">movimientos pendientes</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {(['cuentas', 'movimientos', 'transferencia'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {{ cuentas: 'Cuentas', movimientos: 'Movimientos', transferencia: 'Transferencia' }[t]}
          </button>
        ))}
        {(tab === 'nuevo_mov' || tab === 'nueva_cuenta') && (
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow text-slate-900">
            {tab === 'nuevo_mov' ? 'Nuevo movimiento' : 'Nueva cuenta'}
          </button>
        )}
      </div>

      {/* ── CUENTAS ── */}
      {tab === 'cuentas' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-slate-400">Cargando…</div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-3">🏦</div>
              <p>Sin cuentas registradas</p>
              <button onClick={() => setTab('nueva_cuenta')} className="mt-3 text-teal-600 hover:underline text-sm">+ Agregar primera cuenta</button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuentas.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{TIPO_ICON[c.tipo]}</span>
                      <div>
                        <div className="font-semibold text-slate-800">{c.nombre}</div>
                        <div className="text-xs text-slate-400">{c.banco} {c.numero_cuenta && `· ${c.numero_cuenta}`}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-600 rounded-full">{c.moneda}</span>
                  </div>
                  <div className={cn('text-2xl font-bold', c.saldo >= 0 ? 'text-slate-800' : 'text-red-600')}>
                    {fmt(c.saldo)}
                  </div>
                  {c.saldo < 10_000 && c.saldo > 0 && (
                    <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                      <AlertCircle size={12} /> Saldo bajo
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MOVIMIENTOS ── */}
      {tab === 'movimientos' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={cn(inp, 'w-auto')} />
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={cn(inp, 'w-auto')}>
              <option value="">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
              <option value="transferencia">Transferencias</option>
            </select>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar…" className={cn(inp, 'max-w-xs')} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                  {['Fecha', 'Descripción', 'Cuenta', 'Categoría', 'Tipo', 'Monto', 'Saldo post', ''].map(h => <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Cargando…</td></tr>
                ) : movFiltrados.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Sin movimientos</td></tr>
                ) : movFiltrados.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{fmtDate(m.fecha)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{m.descripcion}</div>
                      {m.referencia && <div className="text-xs text-slate-400">{m.referencia}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{m.cuenta_nombre}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{m.categoria}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TIPO_COLOR[m.tipo])}>{m.tipo}</span>
                    </td>
                    <td className={cn('px-4 py-3 font-semibold', m.tipo === 'egreso' ? 'text-red-600' : 'text-green-700')}>
                      {m.tipo === 'egreso' ? '-' : '+'}{fmt(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.saldo_despues != null ? fmt(m.saldo_despues) : '—'}</td>
                    <td className="px-4 py-3">
                      {!m.conciliado && (
                        <button onClick={async () => {
                          await sb.from('bank_movements').update({ conciliado: true }).eq('id', m.id)
                          await cargar()
                        }} className="text-xs text-teal-600 hover:underline">Conciliar</button>
                      )}
                      {m.conciliado && <span className="text-xs text-slate-300">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── NUEVO MOVIMIENTO ── */}
      {tab === 'nuevo_mov' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-lg">
          <h2 className="text-base font-semibold text-slate-700">Registrar movimiento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta *</label>
              <select value={formMov.cuenta_id} onChange={e => setFormMov(p => ({ ...p, cuenta_id: e.target.value }))} className={inp}>
                <option value="">Seleccionar…</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.saldo)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select value={formMov.tipo} onChange={e => setFormMov(p => ({ ...p, tipo: e.target.value as Movimiento['tipo'] }))} className={inp}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
              <input type="date" value={formMov.fecha} onChange={e => setFormMov(p => ({ ...p, fecha: e.target.value }))} className={inp} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripción *</label>
              <input value={formMov.descripcion} onChange={e => setFormMov(p => ({ ...p, descripcion: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Monto *</label>
              <input type="number" value={formMov.monto || ''} onChange={e => setFormMov(p => ({ ...p, monto: Number(e.target.value) }))} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Categoría</label>
              <select value={formMov.categoria} onChange={e => setFormMov(p => ({ ...p, categoria: e.target.value }))} className={inp}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Referencia</label>
              <input value={formMov.referencia} onChange={e => setFormMov(p => ({ ...p, referencia: e.target.value }))} className={inp} placeholder="N° de cheque, factura, etc." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={guardarMov} disabled={saving || !formMov.cuenta_id || !formMov.descripcion || !formMov.monto} className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
            <button onClick={() => setTab('movimientos')} className="px-6 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── NUEVA CUENTA ── */}
      {tab === 'nueva_cuenta' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-lg">
          <h2 className="text-base font-semibold text-slate-700">Agregar cuenta bancaria</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de la cuenta *</label>
              <input value={formCuenta.nombre || ''} onChange={e => setFormCuenta(p => ({ ...p, nombre: e.target.value }))} className={inp} placeholder="Cuenta Operativa, Nómina…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Banco *</label>
              <select value={formCuenta.banco} onChange={e => setFormCuenta(p => ({ ...p, banco: e.target.value }))} className={inp}>
                {BANCOS_MX.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select value={formCuenta.tipo} onChange={e => setFormCuenta(p => ({ ...p, tipo: e.target.value as Cuenta['tipo'] }))} className={inp}>
                {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">N° de cuenta</label>
              <input value={formCuenta.numero_cuenta || ''} onChange={e => setFormCuenta(p => ({ ...p, numero_cuenta: e.target.value }))} className={inp} placeholder="Últimos 4 dígitos" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Saldo inicial</label>
              <input type="number" value={formCuenta.saldo || ''} onChange={e => setFormCuenta(p => ({ ...p, saldo: Number(e.target.value) }))} className={inp} placeholder="0.00" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">CLABE interbancaria</label>
              <input value={formCuenta.clabe || ''} onChange={e => setFormCuenta(p => ({ ...p, clabe: e.target.value }))} className={inp} placeholder="18 dígitos" maxLength={18} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={guardarCuenta} disabled={saving || !formCuenta.nombre} className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Agregar cuenta'}
            </button>
            <button onClick={() => setTab('cuentas')} className="px-6 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── TRANSFERENCIA ── */}
      {tab === 'transferencia' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-md">
          <div className="flex items-center gap-2 text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5 text-sm">
            <ArrowRightLeft size={15} /> Transferencia entre cuentas propias
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta origen</label>
              <select value={trf.origen} onChange={e => setTrf(p => ({ ...p, origen: e.target.value }))} className={inp}>
                <option value="">Seleccionar…</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.saldo)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cuenta destino</label>
              <select value={trf.destino} onChange={e => setTrf(p => ({ ...p, destino: e.target.value }))} className={inp}>
                <option value="">Seleccionar…</option>
                {cuentas.filter(c => c.id !== trf.origen).map(c => <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.saldo)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Monto *</label>
              <input type="number" value={trf.monto || ''} onChange={e => setTrf(p => ({ ...p, monto: Number(e.target.value) }))} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Concepto</label>
              <input value={trf.concepto} onChange={e => setTrf(p => ({ ...p, concepto: e.target.value }))} className={inp} placeholder="Motivo de la transferencia" />
            </div>
            <button onClick={ejecutarTransferencia} disabled={saving || !trf.origen || !trf.destino || !trf.monto || trf.origen === trf.destino} className="w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <ArrowRightLeft size={15} /> {saving ? 'Ejecutando…' : 'Ejecutar transferencia'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
