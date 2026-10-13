'use client'
import { useState } from 'react'
import { Warehouse, MapPin, Package, ArrowRight, Plus, ArrowLeftRight } from 'lucide-react'

interface Almacen {
  id: string
  nombre: string
  tipo: 'central' | 'sucursal' | 'taller' | 'bodega'
  ciudad: string
  responsable: string
  articulos: number
  capacidad_pct: number
  activo: boolean
}

interface Movimiento {
  id: string
  fecha: string
  articulo: string
  tipo: 'entrada' | 'salida' | 'transferencia'
  cantidad: number
  unidad: string
  origen?: string
  destino?: string
  motivo: string
}

const ALMACENES: Almacen[] = [
  { id: '1', nombre: 'Taller Central', tipo: 'central', ciudad: 'Ciudad de México', responsable: 'Carlos Mendoza', articulos: 187, capacidad_pct: 72, activo: true },
  { id: '2', nombre: 'Taller Norte', tipo: 'taller', ciudad: 'Querétaro', responsable: 'Juan Vázquez', articulos: 64, capacidad_pct: 45, activo: true },
  { id: '3', nombre: 'Bodega Cancún', tipo: 'sucursal', ciudad: 'Cancún', responsable: 'Ana Torres', articulos: 38, capacidad_pct: 31, activo: true },
  { id: '4', nombre: 'Depósito Temporal', tipo: 'bodega', ciudad: 'Ciudad de México', responsable: 'Luis Herrera', articulos: 12, capacidad_pct: 15, activo: false },
]

const MOVIMIENTOS: Movimiento[] = [
  { id: '1', fecha: '2026-10-12', articulo: 'Filtro aceite Volvo B11R', tipo: 'salida',       cantidad: 2, unidad: 'pza', destino: 'Taller Central', motivo: 'Mantenimiento VOL-001' },
  { id: '2', fecha: '2026-10-12', articulo: 'Aceite motor 15W40', tipo: 'entrada',            cantidad: 60, unidad: 'lt',  origen: 'Shell México', motivo: 'Compra #PO-441' },
  { id: '3', fecha: '2026-10-11', articulo: 'Pastillas freno Mercedes', tipo: 'transferencia', cantidad: 1, unidad: 'jgo', origen: 'Taller Central', destino: 'Taller Norte', motivo: 'Reabastecimiento norte' },
  { id: '4', fecha: '2026-10-11', articulo: 'Filtro combustible Scania', tipo: 'entrada',       cantidad: 6, unidad: 'pza', origen: 'Scania México', motivo: 'Compra #PO-440' },
  { id: '5', fecha: '2026-10-10', articulo: 'Líquido frenos DOT4', tipo: 'salida',             cantidad: 4, unidad: 'lt',  destino: 'Taller Central', motivo: 'Mantenimiento MER-003' },
  { id: '6', fecha: '2026-10-09', articulo: 'Llanta Michelin 295/80', tipo: 'salida',          cantidad: 4, unidad: 'pza', destino: 'Operación', motivo: 'Cambio preventivo SCA-001' },
]

const TIPO_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  central:   { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', label: 'Central' },
  sucursal:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', label: 'Sucursal' },
  taller:    { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Taller' },
  bodega:    { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Bodega' },
}

const MOV_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; Icon: any }> = {
  entrada:      { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', label: 'Entrada', Icon: ArrowRight },
  salida:       { color: '#DC2626', bg: '#FFF1F2', border: '#FECDD3', label: 'Salida',  Icon: ArrowRight },
  transferencia:{ color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Transfer', Icon: ArrowLeftRight },
}

export default function AlmacenesPage() {
  const [tab, setTab] = useState<'almacenes' | 'movimientos' | 'transferir'>('almacenes')

  const TABS = [
    { key: 'almacenes', label: 'Almacenes' },
    { key: 'movimientos', label: 'Bitácora de movimientos' },
    { key: 'transferir', label: 'Transferir' },
  ] as const

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Almacenes</h1>
          <p className="text-sm text-slate-500">Ubicaciones físicas de inventario y trazabilidad de movimientos</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
          <Plus size={14} /> Nuevo almacén
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Almacenes activos', value: String(ALMACENES.filter(a => a.activo).length), color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Total artículos', value: String(ALMACENES.reduce((s, a) => s + a.articulos, 0)), color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Movimientos hoy', value: String(MOVIMIENTOS.filter(m => m.fecha === '2026-10-12').length), color: '#D97706', bg: '#FFFBEB' },
          { label: 'Promedio capacidad', value: (ALMACENES.filter(a => a.activo).reduce((s, a) => s + a.capacidad_pct, 0) / ALMACENES.filter(a => a.activo).length).toFixed(0) + '%', color: '#7C3AED', bg: '#F5F3FF' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-2">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
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
                ? { color: '#1D4ED8', borderBottom: '2px solid #1D4ED8', marginBottom: -1 }
                : { color: '#64748B' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Almacenes grid */}
        {tab === 'almacenes' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALMACENES.map(a => {
              const tc = TIPO_CONFIG[a.tipo]
              return (
                <div key={a.id} className={`rounded-xl border p-4 ${a.activo ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tc.bg }}>
                        <Warehouse size={18} style={{ color: tc.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{a.nombre}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin size={10} /> {a.ciudad}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                      style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>
                      {tc.label}
                    </span>
                  </div>

                  {/* Capacidad */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Capacidad utilizada</span>
                      <span className="font-semibold">{a.capacidad_pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${a.capacidad_pct}%`,
                          backgroundColor: a.capacidad_pct > 85 ? '#DC2626' : a.capacidad_pct > 65 ? '#D97706' : '#16A34A'
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Package size={11} /> {a.articulos} artículos</span>
                    <span>Resp: {a.responsable}</span>
                    {!a.activo && <span className="text-slate-400 font-medium">Inactivo</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bitácora */}
        {tab === 'movimientos' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-2.5 text-left">Fecha</th>
                <th className="px-5 py-2.5 text-left">Artículo</th>
                <th className="px-5 py-2.5 text-left">Tipo</th>
                <th className="px-5 py-2.5 text-left">Origen / Destino</th>
                <th className="px-5 py-2.5 text-center">Cantidad</th>
                <th className="px-5 py-2.5 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {MOVIMIENTOS.map(m => {
                const mc = MOV_CONFIG[m.tipo]
                return (
                  <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(m.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">{m.articulo}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                        style={{ background: mc.bg, color: mc.color, borderColor: mc.border }}>
                        {mc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {m.tipo === 'transferencia'
                        ? <span className="flex items-center gap-1">{m.origen} <ArrowRight size={10} /> {m.destino}</span>
                        : m.tipo === 'entrada' ? m.origen : m.destino
                      }
                    </td>
                    <td className="px-5 py-3 text-center font-semibold text-slate-800">
                      {m.cantidad} <span className="text-xs font-normal text-slate-400">{m.unidad}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{m.motivo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Transferencia */}
        {tab === 'transferir' && (
          <div className="p-5 max-w-md">
            <p className="text-sm text-slate-600 mb-4">Mueve artículos entre almacenes con registro automático en bitácora.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Artículo</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
                  <option value="">Selecciona artículo…</option>
                  <option>Filtro aceite motor Volvo B11R</option>
                  <option>Pastillas freno delanteras Mercedes</option>
                  <option>Aceite motor 15W40 Shell Rimula</option>
                  <option>Llanta radial 295/80 R22.5 Michelin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Almacén origen</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
                    {ALMACENES.filter(a => a.activo).map(a => <option key={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Almacén destino</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 bg-white">
                    {ALMACENES.filter(a => a.activo).map(a => <option key={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad</label>
                <input type="number" min="1" placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo</label>
                <input placeholder="Razón de la transferencia" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
              </div>
              <button className="w-full py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                <ArrowLeftRight size={15} /> Registrar transferencia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
