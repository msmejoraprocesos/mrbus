'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw, Plus, Building2, Wallet, CreditCard, AlertCircle } from 'lucide-react'

interface Cuenta {
  id: string
  nombre: string
  banco: string
  tipo: 'cheques' | 'ahorro' | 'efectivo' | 'tarjeta'
  moneda: string
  saldo: number
  saldo_anterior: number
  activa: boolean
  numero_cuenta?: string
}

interface Movimiento {
  id: string
  fecha: string
  descripcion: string
  tipo: 'ingreso' | 'egreso' | 'transferencia'
  monto: number
  cuenta_nombre: string
  referencia?: string
}

const TIPO_ICON: Record<string, string> = {
  cheques: '🏦', ahorro: '🏦', efectivo: '💵', tarjeta: '💳'
}

const TIPO_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  ingreso:      { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  egreso:       { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  transferencia:{ bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
}

export default function TesoreriaPage() {
  const supabase = createClient()
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'cuentas' | 'movimientos' | 'transferencia'>('cuentas')

  // Datos demo mientras no hay tablas
  useEffect(() => {
    setLoading(false)
    setCuentas([
      { id: '1', nombre: 'Cuenta Operativa', banco: 'BBVA', tipo: 'cheques', moneda: 'MXN', saldo: 284_350.00, saldo_anterior: 260_000, activa: true, numero_cuenta: '****4521' },
      { id: '2', nombre: 'Cuenta Nómina', banco: 'Santander', tipo: 'cheques', moneda: 'MXN', saldo: 92_100.00, saldo_anterior: 110_000, activa: true, numero_cuenta: '****8830' },
      { id: '3', nombre: 'Caja General', banco: 'Efectivo', tipo: 'efectivo', moneda: 'MXN', saldo: 18_750.00, saldo_anterior: 15_000, activa: true },
      { id: '4', nombre: 'AMEX Corporativa', banco: 'American Express', tipo: 'tarjeta', moneda: 'MXN', saldo: -24_800.00, saldo_anterior: -18_000, activa: true, numero_cuenta: '****9947' },
    ])
    setMovimientos([
      { id: '1', fecha: '2026-10-12', descripcion: 'Cobro viaje charter PEMEX', tipo: 'ingreso', monto: 45_000, cuenta_nombre: 'Cuenta Operativa', referencia: 'TRF-2810' },
      { id: '2', fecha: '2026-10-12', descripcion: 'Pago diésel flota norte', tipo: 'egreso', monto: 12_340, cuenta_nombre: 'Cuenta Operativa', referencia: 'FACT-441' },
      { id: '3', fecha: '2026-10-11', descripcion: 'Transferencia a nómina', tipo: 'transferencia', monto: 85_000, cuenta_nombre: 'Cuenta Operativa', referencia: 'INT-001' },
      { id: '4', fecha: '2026-10-11', descripcion: 'Cobro renta autobús eventos', tipo: 'ingreso', monto: 28_500, cuenta_nombre: 'Cuenta Operativa', referencia: 'TRF-2809' },
      { id: '5', fecha: '2026-10-10', descripcion: 'Casetas autopista', tipo: 'egreso', monto: 3_240, cuenta_nombre: 'Caja General', referencia: '' },
      { id: '6', fecha: '2026-10-10', descripcion: 'Mantenimiento preventivo', tipo: 'egreso', monto: 8_900, cuenta_nombre: 'AMEX Corporativa', referencia: 'TLR-009' },
      { id: '7', fecha: '2026-10-09', descripcion: 'Cobro viaje turismo Cancún', tipo: 'ingreso', monto: 95_000, cuenta_nombre: 'Cuenta Operativa', referencia: 'TRF-2808' },
      { id: '8', fecha: '2026-10-09', descripcion: 'Nómina quincenal', tipo: 'egreso', monto: 87_450, cuenta_nombre: 'Cuenta Nómina', referencia: 'NOM-Oct1' },
    ])
  }, [])

  const totalActivos = cuentas.filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0)
  const totalPasivos = cuentas.filter(c => c.saldo < 0).reduce((s, c) => s + c.saldo, 0)
  const posicionNeta = totalActivos + totalPasivos

  const ingresosMes = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresosMes  = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  const TABS = [
    { key: 'cuentas', label: 'Cuentas' },
    { key: 'movimientos', label: 'Movimientos' },
    { key: 'transferencia', label: 'Transferencia' },
  ] as const

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tesorería</h1>
          <p className="text-sm text-slate-500">Posición de liquidez y flujo de efectivo</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            <Plus size={14} /> Nuevo movimiento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Posición neta', value: fmt(posicionNeta), icon: Wallet, color: '#0D9488', bg: '#F0FDFA', note: 'Activos - pasivos' },
          { label: 'Total activos', value: fmt(totalActivos), icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4', note: `${cuentas.filter(c => c.saldo > 0).length} cuentas` },
          { label: 'Ingresos (período)', value: fmt(ingresosMes), icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF', note: 'Últimos 7 días' },
          { label: 'Egresos (período)', value: fmt(egresosMes), icon: TrendingDown, color: '#DC2626', bg: '#FFF1F2', note: 'Últimos 7 días' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-3 text-sm font-medium transition-colors"
              style={tab === t.key
                ? { color: '#0D9488', borderBottom: '2px solid #0D9488', marginBottom: -1 }
                : { color: '#64748B' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Cuentas */}
        {tab === 'cuentas' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cuentas.map(c => {
                const delta = c.saldo - c.saldo_anterior
                const pct   = c.saldo_anterior !== 0 ? (delta / Math.abs(c.saldo_anterior)) * 100 : 0
                return (
                  <div key={c.id} className="border border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{TIPO_ICON[c.tipo]}</span>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                          <p className="text-xs text-slate-400">{c.banco} {c.numero_cuenta && `· ${c.numero_cuenta}`}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium border border-teal-100">
                        {c.moneda}
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${c.saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                      {fmt(c.saldo)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {delta >= 0
                        ? <TrendingUp size={12} className="text-green-500" />
                        : <TrendingDown size={12} className="text-red-500" />
                      }
                      <span className={`text-xs font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {delta >= 0 ? '+' : ''}{fmt(delta)} ({pct.toFixed(1)}%)
                      </span>
                      <span className="text-xs text-slate-400">vs período ant.</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Movimientos */}
        {tab === 'movimientos' && (
          <div>
            <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-3">
              <input placeholder="Buscar movimiento..." className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400" />
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none">
                <option>Todos los tipos</option>
                <option>Ingreso</option>
                <option>Egreso</option>
                <option>Transferencia</option>
              </select>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Descripción</th>
                  <th className="px-5 py-3 text-left">Cuenta</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => {
                  const c = TIPO_COLOR[m.tipo]
                  return (
                    <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {new Date(m.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-700">{m.descripcion}</p>
                        {m.referencia && <p className="text-xs text-slate-400">{m.referencia}</p>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{m.cuenta_nombre}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                          style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                          {m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${m.tipo === 'egreso' ? 'text-red-600' : m.tipo === 'ingreso' ? 'text-green-600' : 'text-blue-600'}`}>
                        {m.tipo === 'egreso' ? '-' : '+'}{fmt(m.monto)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Transferencia */}
        {tab === 'transferencia' && (
          <div className="p-5 max-w-md">
            <div className="flex items-center gap-2 mb-5 text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5 text-sm">
              <ArrowRightLeft size={15} />
              <span>Transferencia entre cuentas propias</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cuenta origen</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.saldo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cuenta destino</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.saldo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" placeholder="0.00" className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm outline-none focus:border-teal-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto</label>
                <input placeholder="Descripción de la transferencia" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-400" />
              </div>
              <button className="w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                <ArrowRightLeft size={15} /> Ejecutar transferencia
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerta de saldo bajo */}
      {cuentas.some(c => c.saldo < 10_000 && c.saldo > 0) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
          <span className="text-amber-800">
            {cuentas.filter(c => c.saldo < 10_000 && c.saldo > 0).map(c => c.nombre).join(', ')} tiene saldo bajo.
            Considera hacer un traspaso.
          </span>
        </div>
      )}
    </div>
  )
}
