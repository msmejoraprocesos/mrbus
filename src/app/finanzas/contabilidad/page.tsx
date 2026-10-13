'use client'
import { useState } from 'react'
import { BookOpen, ArrowRightLeft, TrendingUp, TrendingDown, FileText, Download } from 'lucide-react'

interface AsientoLinea {
  cuenta: string
  nombre: string
  debe: number
  haber: number
}

interface Asiento {
  id: string
  fecha: string
  folio: string
  concepto: string
  tipo: 'ingreso' | 'egreso' | 'nomina' | 'depreciacion' | 'ajuste'
  lineas: AsientoLinea[]
}

const ASIENTOS: Asiento[] = [
  {
    id: '1', fecha: '2026-10-12', folio: 'AS-0124', concepto: 'Cobro servicio charter PEMEX', tipo: 'ingreso',
    lineas: [
      { cuenta: '1110', nombre: 'Bancos', debe: 45_000, haber: 0 },
      { cuenta: '4110', nombre: 'Ingresos por servicios', debe: 0, haber: 38_793.10 },
      { cuenta: '2140', nombre: 'IVA Trasladado', debe: 0, haber: 6_206.90 },
    ]
  },
  {
    id: '2', fecha: '2026-10-12', folio: 'AS-0123', concepto: 'Gasto combustible operación', tipo: 'egreso',
    lineas: [
      { cuenta: '6210', nombre: 'Combustible y lubricantes', debe: 10_637.93, haber: 0 },
      { cuenta: '1160', nombre: 'IVA Acreditable', debe: 1_702.07, haber: 0 },
      { cuenta: '1110', nombre: 'Bancos', debe: 0, haber: 12_340 },
    ]
  },
  {
    id: '3', fecha: '2026-10-09', folio: 'AS-0122', concepto: 'Nómina quincenal operadores', tipo: 'nomina',
    lineas: [
      { cuenta: '6110', nombre: 'Sueldos y salarios', debe: 87_450, haber: 0 },
      { cuenta: '2210', nombre: 'IMSS por pagar', debe: 0, haber: 8_200 },
      { cuenta: '2220', nombre: 'ISR retenido por pagar', debe: 0, haber: 4_150 },
      { cuenta: '1110', nombre: 'Bancos', debe: 0, haber: 75_100 },
    ]
  },
]

const CUENTAS_SAT: { cuenta: string; nombre: string; nivel: number; debe: number; haber: number; tipo: 'activo'|'pasivo'|'capital'|'ingreso'|'gasto' }[] = [
  { cuenta: '1', nombre: 'ACTIVO', nivel: 0, debe: 0, haber: 0, tipo: 'activo' },
  { cuenta: '1100', nombre: 'Activo Circulante', nivel: 1, debe: 395_200, haber: 0, tipo: 'activo' },
  { cuenta: '1110', nombre: 'Bancos', nivel: 2, debe: 376_450, haber: 0, tipo: 'activo' },
  { cuenta: '1120', nombre: 'Clientes', nivel: 2, debe: 18_750, haber: 0, tipo: 'activo' },
  { cuenta: '1200', nombre: 'Activo Fijo', nivel: 1, debe: 4_820_000, haber: 0, tipo: 'activo' },
  { cuenta: '1210', nombre: 'Equipo de transporte', nivel: 2, debe: 5_800_000, haber: 0, tipo: 'activo' },
  { cuenta: '1215', nombre: 'Dep. acum. equipo transporte', nivel: 2, debe: 0, haber: 980_000, tipo: 'activo' },
  { cuenta: '2', nombre: 'PASIVO', nivel: 0, debe: 0, haber: 0, tipo: 'pasivo' },
  { cuenta: '2100', nombre: 'Pasivo Circulante', nivel: 1, debe: 0, haber: 142_300, tipo: 'pasivo' },
  { cuenta: '2110', nombre: 'Proveedores', nivel: 2, debe: 0, haber: 89_400, tipo: 'pasivo' },
  { cuenta: '2140', nombre: 'IVA Trasladado', nivel: 2, debe: 0, haber: 52_900, tipo: 'pasivo' },
  { cuenta: '3', nombre: 'CAPITAL', nivel: 0, debe: 0, haber: 0, tipo: 'capital' },
  { cuenta: '3100', nombre: 'Capital Social', nivel: 1, debe: 0, haber: 2_000_000, tipo: 'capital' },
  { cuenta: '3200', nombre: 'Utilidad acumulada', nivel: 1, debe: 0, haber: 2_072_900, tipo: 'capital' },
  { cuenta: '4', nombre: 'INGRESOS', nivel: 0, debe: 0, haber: 0, tipo: 'ingreso' },
  { cuenta: '4110', nombre: 'Ingresos por servicios', nivel: 1, debe: 0, haber: 1_558_793, tipo: 'ingreso' },
  { cuenta: '5', nombre: 'GASTOS', nivel: 0, debe: 0, haber: 0, tipo: 'gasto' },
  { cuenta: '6110', nombre: 'Sueldos y salarios', nivel: 1, debe: 372_900, haber: 0, tipo: 'gasto' },
  { cuenta: '6210', nombre: 'Combustible y lubricantes', nivel: 1, debe: 347_206, haber: 0, tipo: 'gasto' },
  { cuenta: '6310', nombre: 'Mantenimiento', nivel: 1, debe: 180_500, haber: 0, tipo: 'gasto' },
  { cuenta: '6410', nombre: 'Depreciaciones', nivel: 1, debe: 98_000, haber: 0, tipo: 'gasto' },
]

const TIPO_COLOR: Record<string, { bg: string; text: string }> = {
  ingreso:     { bg: '#F0FDF4', text: '#16A34A' },
  egreso:      { bg: '#FFF1F2', text: '#E11D48' },
  nomina:      { bg: '#FFF7ED', text: '#C2410C' },
  depreciacion:{ bg: '#F5F3FF', text: '#7C3AED' },
  ajuste:      { bg: '#F8FAFC', text: '#475569' },
}

export default function ContabilidadPage() {
  const [tab, setTab] = useState<'diario' | 'mayor' | 'balance'>('diario')
  const [asientoOpen, setAsientoOpen] = useState<string | null>(null)

  const fmt = (n: number) => n === 0 ? '' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  const TABS = [
    { key: 'diario', label: 'Diario', icon: BookOpen },
    { key: 'mayor', label: 'Mayor / Catálogo', icon: ArrowRightLeft },
    { key: 'balance', label: 'Balance', icon: TrendingUp },
  ] as const

  const totalIngresos = CUENTAS_SAT.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + c.haber, 0)
  const totalGastos   = CUENTAS_SAT.filter(c => c.tipo === 'gasto').reduce((s, c) => s + c.debe, 0)
  const utilidad      = totalIngresos - totalGastos
  const totalActivo   = CUENTAS_SAT.find(c => c.cuenta === '1100')?.debe ?? 0 + (CUENTAS_SAT.find(c => c.cuenta === '1200')?.debe ?? 0)
  const totalPasivo   = CUENTAS_SAT.find(c => c.cuenta === '2100')?.haber ?? 0
  const totalCapital  = (CUENTAS_SAT.find(c => c.cuenta === '3100')?.haber ?? 0) + (CUENTAS_SAT.find(c => c.cuenta === '3200')?.haber ?? 0) + utilidad

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Contabilidad</h1>
          <p className="text-sm text-slate-500">Libro diario, mayor y estados financieros</p>
        </div>
        <div className="flex gap-2">
          <select className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none bg-white">
            <option>Octubre 2026</option>
            <option>Septiembre 2026</option>
            <option>Agosto 2026</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos del período', value: fmt(totalIngresos), icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Gastos del período', value: fmt(totalGastos), icon: TrendingDown, color: '#DC2626', bg: '#FFF1F2' },
          { label: 'Utilidad del período', value: fmt(utilidad), icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Asientos del mes', value: String(ASIENTOS.length), icon: FileText, color: '#7C3AED', bg: '#F5F3FF' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
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
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors"
              style={tab === t.key
                ? { color: '#7C3AED', borderBottom: '2px solid #7C3AED', marginBottom: -1 }
                : { color: '#64748B' }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Libro Diario */}
        {tab === 'diario' && (
          <div>
            {ASIENTOS.map(a => {
              const c = TIPO_COLOR[a.tipo]
              const open = asientoOpen === a.id
              const total = a.lineas.reduce((s, l) => s + l.debe, 0)
              return (
                <div key={a.id} className="border-b border-slate-50">
                  <button
                    onClick={() => setAsientoOpen(open ? null : a.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="text-xs text-slate-400 w-20">
                      {new Date(a.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })}
                    </div>
                    <div className="font-mono text-xs text-slate-500 w-20">{a.folio}</div>
                    <div className="flex-1 font-medium text-slate-700 text-sm">{a.concepto}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
                      {a.tipo}
                    </span>
                    <div className="text-sm font-semibold text-slate-800 w-28 text-right">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(total)}
                    </div>
                  </button>
                  {open && (
                    <div className="px-5 pb-3 bg-slate-50/50">
                      <table className="w-full text-xs mt-1">
                        <thead>
                          <tr className="text-slate-400 uppercase tracking-wide">
                            <th className="py-1.5 text-left pl-4">Cuenta</th>
                            <th className="py-1.5 text-left">Nombre</th>
                            <th className="py-1.5 text-right">Debe</th>
                            <th className="py-1.5 text-right">Haber</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.lineas.map((l, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-1.5 pl-4 font-mono text-slate-500">{l.cuenta}</td>
                              <td className="py-1.5 text-slate-700">{l.nombre}</td>
                              <td className="py-1.5 text-right font-medium text-slate-800">{fmt(l.debe)}</td>
                              <td className="py-1.5 text-right font-medium text-slate-500">{fmt(l.haber)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Catálogo de cuentas */}
        {tab === 'mayor' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-2.5 text-left">Cuenta</th>
                <th className="px-5 py-2.5 text-left">Nombre</th>
                <th className="px-5 py-2.5 text-right">Debe</th>
                <th className="px-5 py-2.5 text-right">Haber</th>
                <th className="px-5 py-2.5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {CUENTAS_SAT.map(c => (
                <tr key={c.cuenta} className={`border-t border-slate-50 ${c.nivel === 0 ? 'bg-slate-100 font-bold' : c.nivel === 1 ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-5 py-2 font-mono text-xs text-slate-500" style={{ paddingLeft: `${20 + c.nivel * 16}px` }}>{c.cuenta}</td>
                  <td className="px-5 py-2 text-slate-700">{c.nombre}</td>
                  <td className="px-5 py-2 text-right text-slate-600">{c.debe ? fmt(c.debe) : ''}</td>
                  <td className="px-5 py-2 text-right text-slate-600">{c.haber ? fmt(c.haber) : ''}</td>
                  <td className="px-5 py-2 text-right font-semibold text-slate-800">
                    {(c.debe || c.haber) ? fmt(c.debe - c.haber) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Balance */}
        {tab === 'balance' && (
          <div className="p-5 grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-slate-700 mb-3 text-sm border-b pb-2">ACTIVO</h3>
              {CUENTAS_SAT.filter(c => c.tipo === 'activo' && c.nivel >= 1).map(c => (
                <div key={c.cuenta} className="flex justify-between py-1.5 text-sm" style={{ paddingLeft: c.nivel === 2 ? '20px' : '0' }}>
                  <span className={c.nivel === 1 ? 'font-semibold text-slate-700' : 'text-slate-600'}>{c.nombre}</span>
                  <span className={c.nivel === 1 ? 'font-semibold text-slate-800' : 'text-slate-600'}>
                    {fmt(c.debe - c.haber)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-2 mt-2 border-t font-bold text-slate-800">
                <span>TOTAL ACTIVO</span>
                <span className="text-blue-700">
                  {fmt(CUENTAS_SAT.filter(c => c.tipo === 'activo' && c.nivel === 1).reduce((s, c) => s + c.debe - c.haber, 0))}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 mb-3 text-sm border-b pb-2">PASIVO + CAPITAL</h3>
              {CUENTAS_SAT.filter(c => (c.tipo === 'pasivo' || c.tipo === 'capital') && c.nivel >= 1).map(c => (
                <div key={c.cuenta} className="flex justify-between py-1.5 text-sm" style={{ paddingLeft: c.nivel === 2 ? '20px' : '0' }}>
                  <span className={c.nivel === 1 ? 'font-semibold text-slate-700' : 'text-slate-600'}>{c.nombre}</span>
                  <span className={c.nivel === 1 ? 'font-semibold text-slate-800' : 'text-slate-600'}>{fmt(c.haber)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 text-sm">
                <span className="font-semibold text-slate-700">Utilidad del período</span>
                <span className="font-semibold text-green-700">{fmt(utilidad)}</span>
              </div>
              <div className="flex justify-between py-2 mt-2 border-t font-bold text-slate-800">
                <span>TOTAL PASIVO + CAPITAL</span>
                <span className="text-blue-700">{fmt(totalPasivo + totalCapital)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
