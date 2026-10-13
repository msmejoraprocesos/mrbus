'use client'
import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, ChevronDown, ChevronUp } from 'lucide-react'

interface LineaPresupuesto {
  id: string
  categoria: string
  subcategoria: string
  presupuesto: number
  real: number
  tipo: 'ingreso' | 'gasto'
}

const DATA: LineaPresupuesto[] = [
  // Ingresos
  { id: '1', categoria: 'Ingresos', subcategoria: 'Servicios Charter',    presupuesto: 850_000, real: 924_500, tipo: 'ingreso' },
  { id: '2', categoria: 'Ingresos', subcategoria: 'Turismo',              presupuesto: 420_000, real: 381_200, tipo: 'ingreso' },
  { id: '3', categoria: 'Ingresos', subcategoria: 'Renta de autobuses',   presupuesto: 180_000, real: 194_800, tipo: 'ingreso' },
  { id: '4', categoria: 'Ingresos', subcategoria: 'Paquetería',           presupuesto: 65_000,  real: 58_300,  tipo: 'ingreso' },
  // Gastos
  { id: '5', categoria: 'Costos',   subcategoria: 'Combustible',          presupuesto: 320_000, real: 347_200, tipo: 'gasto' },
  { id: '6', categoria: 'Costos',   subcategoria: 'Casetas y peajes',     presupuesto: 45_000,  real: 41_600,  tipo: 'gasto' },
  { id: '7', categoria: 'Nómina',   subcategoria: 'Operadores',           presupuesto: 280_000, real: 278_400, tipo: 'gasto' },
  { id: '8', categoria: 'Nómina',   subcategoria: 'Administrativo',       presupuesto: 95_000,  real: 95_000,  tipo: 'gasto' },
  { id: '9', categoria: 'Mantenimiento', subcategoria: 'Preventivo',      presupuesto: 80_000,  real: 112_000, tipo: 'gasto' },
  { id: '10',categoria: 'Mantenimiento', subcategoria: 'Correctivo',      presupuesto: 40_000,  real: 68_500,  tipo: 'gasto' },
  { id: '11',categoria: 'Gastos Fijos', subcategoria: 'Seguros',          presupuesto: 55_000,  real: 55_000,  tipo: 'gasto' },
  { id: '12',categoria: 'Gastos Fijos', subcategoria: 'Renta y servicios',presupuesto: 28_000,  real: 28_000,  tipo: 'gasto' },
  { id: '13',categoria: 'Gastos Fijos', subcategoria: 'Publicidad',       presupuesto: 30_000,  real: 18_500,  tipo: 'gasto' },
]

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function PresupuestosPage() {
  const [mes, setMes] = useState(9) // Octubre (0-indexed)
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})

  const toggle = (cat: string) => setExpandido(e => ({ ...e, [cat]: !e[cat] }))

  const ingresos = DATA.filter(d => d.tipo === 'ingreso')
  const gastos   = DATA.filter(d => d.tipo === 'gasto')

  const totalIngP = ingresos.reduce((s, d) => s + d.presupuesto, 0)
  const totalIngR = ingresos.reduce((s, d) => s + d.real, 0)
  const totalGasP = gastos.reduce((s, d) => s + d.presupuesto, 0)
  const totalGasR = gastos.reduce((s, d) => s + d.real, 0)
  const utilidadP = totalIngP - totalGasP
  const utilidadR = totalIngR - totalGasR

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
  const pct = (real: number, pres: number) => pres === 0 ? 0 : (real / pres) * 100

  const categorias = Array.from(new Set(gastos.map(d => d.categoria)))

  function BarraAvance({ real, presupuesto, tipo }: { real: number; presupuesto: number; tipo: 'ingreso' | 'gasto' }) {
    const p = Math.min(pct(real, presupuesto), 120)
    const over = real > presupuesto
    const color = tipo === 'ingreso'
      ? (over ? '#16A34A' : '#F59E0B')
      : (over ? '#DC2626' : '#16A34A')
    return (
      <div className="flex items-center gap-2 w-32">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color }}>{p.toFixed(0)}%</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Presupuestos</h1>
          <p className="text-sm text-slate-500">Presupuesto vs real por categoría</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none bg-white"
          >
            {MESES.map((m, i) => <option key={i} value={i}>{m} 2026</option>)}
          </select>
          <select className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none bg-white">
            <option>Anual 2026</option>
            <option>Q4 2026</option>
            <option>Q3 2026</option>
          </select>
        </div>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos presupuestados', value: fmt(totalIngP), sub: fmt(totalIngR) + ' real', icon: Target, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Gastos presupuestados',   value: fmt(totalGasP), sub: fmt(totalGasR) + ' real', icon: TrendingDown, color: '#DC2626', bg: '#FFF1F2' },
          { label: 'Utilidad presupuestada',  value: fmt(utilidadP), sub: fmt(utilidadR) + ' real', icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
          {
            label: 'Variación utilidad',
            value: (utilidadR >= utilidadP ? '+' : '') + fmt(utilidadR - utilidadP),
            sub: ((utilidadR - utilidadP) / Math.abs(utilidadP) * 100).toFixed(1) + '% vs presupuesto',
            icon: utilidadR >= utilidadP ? CheckCircle : AlertTriangle,
            color: utilidadR >= utilidadP ? '#16A34A' : '#F59E0B',
            bg: utilidadR >= utilidadP ? '#F0FDF4' : '#FFFBEB',
          },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla — Ingresos */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Ingresos — {MESES[mes]} 2026</h2>
          <span className="text-xs text-slate-500">{fmt(totalIngR)} / {fmt(totalIngP)}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-5 py-2.5 text-left">Línea</th>
              <th className="px-5 py-2.5 text-right">Presupuesto</th>
              <th className="px-5 py-2.5 text-right">Real</th>
              <th className="px-5 py-2.5 text-right">Variación</th>
              <th className="px-5 py-2.5 text-right">Avance</th>
            </tr>
          </thead>
          <tbody>
            {ingresos.map(d => {
              const v = d.real - d.presupuesto
              return (
                <tr key={d.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 text-slate-700">{d.subcategoria}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmt(d.presupuesto)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmt(d.real)}</td>
                  <td className={`px-5 py-2.5 text-right text-xs font-semibold ${v >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {v >= 0 ? '+' : ''}{fmt(v)}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end"><BarraAvance real={d.real} presupuesto={d.presupuesto} tipo="ingreso" /></div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Tabla — Gastos por categoría */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">Gastos — {MESES[mes]} 2026</h2>
          <span className="text-xs text-slate-500">{fmt(totalGasR)} / {fmt(totalGasP)}</span>
        </div>
        {categorias.map(cat => {
          const items = gastos.filter(d => d.categoria === cat)
          const catP  = items.reduce((s, d) => s + d.presupuesto, 0)
          const catR  = items.reduce((s, d) => s + d.real, 0)
          const open  = expandido[cat] !== false // default open
          const over  = catR > catP
          return (
            <div key={cat}>
              <button
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-t border-slate-100"
              >
                <div className="flex items-center gap-2">
                  {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  <span className="font-semibold text-slate-700 text-sm">{cat}</span>
                  {over && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Sobre presupuesto</span>}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">{fmt(catP)}</span>
                  <span className={`font-semibold ${over ? 'text-red-600' : 'text-green-600'}`}>{fmt(catR)}</span>
                </div>
              </button>
              {open && items.map(d => {
                const v = d.real - d.presupuesto
                return (
                  <div key={d.id} className="flex items-center border-t border-slate-50 hover:bg-slate-50/50 px-5 py-2.5 text-sm">
                    <span className="flex-1 pl-5 text-slate-600">{d.subcategoria}</span>
                    <span className="w-28 text-right text-slate-400 text-xs">{fmt(d.presupuesto)}</span>
                    <span className="w-28 text-right font-medium text-slate-800">{fmt(d.real)}</span>
                    <span className={`w-28 text-right text-xs font-semibold ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {v > 0 ? '+' : ''}{fmt(v)}
                    </span>
                    <div className="w-36 flex justify-end"><BarraAvance real={d.real} presupuesto={d.presupuesto} tipo="gasto" /></div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
