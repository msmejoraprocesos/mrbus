'use client'
import { useState } from 'react'
import { Package, AlertTriangle, Plus, Search, Wrench, Droplet, Zap, Settings } from 'lucide-react'

interface Articulo {
  id: string
  codigo: string
  nombre: string
  categoria: 'refaccion' | 'consumible' | 'herramienta' | 'lubricante'
  unidad: string
  stock: number
  stock_minimo: number
  stock_maximo: number
  costo_unitario: number
  ubicacion: string
  proveedor?: string
  aplicable?: string[] // unidades que usan esto
}

const DATA: Articulo[] = [
  { id: '1',  codigo: 'REF-001', nombre: 'Filtro aceite motor Volvo B11R', categoria: 'refaccion', unidad: 'pza', stock: 8, stock_minimo: 5, stock_maximo: 20, costo_unitario: 420, ubicacion: 'A1-01', proveedor: 'Tracsa', aplicable: ['VOL-001','VOL-002'] },
  { id: '2',  codigo: 'REF-002', nombre: 'Pastillas freno delanteras Mercedes', categoria: 'refaccion', unidad: 'jgo', stock: 3, stock_minimo: 4, stock_maximo: 12, costo_unitario: 1_850, ubicacion: 'A1-02', proveedor: 'Estrella Roja' },
  { id: '3',  codigo: 'REF-003', nombre: 'Banda alternador universal', categoria: 'refaccion', unidad: 'pza', stock: 12, stock_minimo: 6, stock_maximo: 24, costo_unitario: 280, ubicacion: 'A1-03', proveedor: 'AutoMex' },
  { id: '4',  codigo: 'REF-004', nombre: 'Filtro combustible Scania K360', categoria: 'refaccion', unidad: 'pza', stock: 2, stock_minimo: 5, stock_maximo: 15, costo_unitario: 680, ubicacion: 'A1-04', proveedor: 'Scania México' },
  { id: '5',  codigo: 'CON-001', nombre: 'Aceite motor 15W40 Shell Rimula', categoria: 'consumible', unidad: 'lt', stock: 120, stock_minimo: 50, stock_maximo: 200, costo_unitario: 65, ubicacion: 'B1-01', proveedor: 'Shell' },
  { id: '6',  codigo: 'CON-002', nombre: 'Líquido frenos DOT4', categoria: 'consumible', unidad: 'lt', stock: 18, stock_minimo: 10, stock_maximo: 40, costo_unitario: 95, ubicacion: 'B1-02' },
  { id: '7',  codigo: 'CON-003', nombre: 'Refrigerante anticongelante verde', categoria: 'consumible', unidad: 'lt', stock: 45, stock_minimo: 20, stock_maximo: 80, costo_unitario: 48, ubicacion: 'B1-03' },
  { id: '8',  codigo: 'CON-004', nombre: 'Grasa chassis alemana EP-2', categoria: 'lubricante', unidad: 'kg', stock: 8, stock_minimo: 5, stock_maximo: 20, costo_unitario: 125, ubicacion: 'B2-01' },
  { id: '9',  codigo: 'HER-001', nombre: 'Torquímetro 0-300 Nm digital', categoria: 'herramienta', unidad: 'pza', stock: 2, stock_minimo: 1, stock_maximo: 3, costo_unitario: 3_200, ubicacion: 'C1-01' },
  { id: '10', codigo: 'HER-002', nombre: 'Gato hidráulico 20 ton', categoria: 'herramienta', unidad: 'pza', stock: 1, stock_minimo: 1, stock_maximo: 2, costo_unitario: 8_500, ubicacion: 'C1-02' },
  { id: '11', codigo: 'REF-005', nombre: 'Llanta radial 295/80 R22.5 Michelin', categoria: 'refaccion', unidad: 'pza', stock: 6, stock_minimo: 8, stock_maximo: 24, costo_unitario: 4_800, ubicacion: 'D1-01', proveedor: 'Llantazo' },
  { id: '12', codigo: 'CON-005', nombre: 'Aditivo limpiador inyectores', categoria: 'consumible', unidad: 'lt', stock: 30, stock_minimo: 12, stock_maximo: 50, costo_unitario: 180, ubicacion: 'B1-04' },
]

const CAT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; Icon: any }> = {
  refaccion:   { label: 'Refacción',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', Icon: Wrench },
  consumible:  { label: 'Consumible',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', Icon: Droplet },
  lubricante:  { label: 'Lubricante',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', Icon: Droplet },
  herramienta: { label: 'Herramienta', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', Icon: Settings },
}

export default function InventariosPage() {
  const [buscar, setBuscar] = useState('')
  const [catFiltro, setCatFiltro] = useState<string>('todos')
  const [articuloSel, setArticuloSel] = useState<Articulo | null>(null)

  const bajoMinimo = DATA.filter(a => a.stock < a.stock_minimo)
  const valorTotal = DATA.reduce((s, a) => s + a.stock * a.costo_unitario, 0)

  const filtrados = DATA.filter(a => {
    const matchCat = catFiltro === 'todos' || a.categoria === catFiltro
    const matchBus = !buscar || a.nombre.toLowerCase().includes(buscar.toLowerCase()) || a.codigo.toLowerCase().includes(buscar.toLowerCase())
    return matchCat && matchBus
  })

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  function SemaforoStock({ a }: { a: Articulo }) {
    if (a.stock === 0)             return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">Agotado</span>
    if (a.stock < a.stock_minimo)  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold border border-amber-200">Bajo mínimo</span>
    if (a.stock > a.stock_maximo)  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">Sobre máximo</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">Normal</span>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inventarios</h1>
          <p className="text-sm text-slate-500">Refacciones, consumibles y herramientas de taller</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
          <Plus size={14} /> Nuevo artículo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Artículos totales', value: String(DATA.length), color: '#2563EB', bg: '#EFF6FF', Icon: Package },
          { label: 'Bajo mínimo / agotado', value: String(bajoMinimo.length), color: '#DC2626', bg: '#FFF1F2', Icon: AlertTriangle },
          { label: 'Valor inventario', value: fmt(valorTotal), color: '#16A34A', bg: '#F0FDF4', Icon: Package },
          { label: 'Categorías activas', value: String(Array.from(new Set(DATA.map(a => a.categoria))).length), color: '#7C3AED', bg: '#F5F3FF', Icon: Settings },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.Icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerta bajo mínimo */}
      {bajoMinimo.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-800">Reabastecimiento requerido: </span>
            <span className="text-amber-700">{bajoMinimo.map(a => a.nombre).join(' · ')}</span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex gap-1">
            {(['todos', ...Object.keys(CAT_CONFIG)] as const).map(c => (
              <button
                key={c}
                onClick={() => setCatFiltro(c)}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
                style={catFiltro === c
                  ? { background: '#0F172A', color: '#fff' }
                  : { background: '#F8FAFC', color: '#64748B' }}
              >
                {c === 'todos' ? 'Todos' : CAT_CONFIG[c].label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left">Código</th>
              <th className="px-4 py-2.5 text-left">Artículo</th>
              <th className="px-4 py-2.5 text-left">Categoría</th>
              <th className="px-4 py-2.5 text-center">Stock</th>
              <th className="px-4 py-2.5 text-center">Mín / Máx</th>
              <th className="px-4 py-2.5 text-right">Costo unit.</th>
              <th className="px-4 py-2.5 text-left">Ubicación</th>
              <th className="px-4 py-2.5 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(a => {
              const cat = CAT_CONFIG[a.categoria]
              return (
                <tr
                  key={a.id}
                  className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => setArticuloSel(a)}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.codigo}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-700">{a.nombre}</p>
                    {a.proveedor && <p className="text-xs text-slate-400">{a.proveedor}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}>
                      {cat.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-semibold text-sm ${a.stock < a.stock_minimo ? 'text-red-600' : 'text-slate-800'}`}>
                      {a.stock}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{a.unidad}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                    {a.stock_minimo} / {a.stock_maximo}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{fmt(a.costo_unitario)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.ubicacion}</td>
                  <td className="px-4 py-2.5"><SemaforoStock a={a} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm">
            No se encontraron artículos con ese filtro.
          </div>
        )}
      </div>

      {/* Drawer detalle artículo */}
      {articuloSel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setArticuloSel(null)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white w-80 h-full shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setArticuloSel(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg">✕</button>
            <div className="mb-4">
              <p className="font-mono text-xs text-slate-400 mb-1">{articuloSel.codigo}</p>
              <h2 className="font-bold text-slate-800 text-base leading-snug">{articuloSel.nombre}</h2>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Categoría', CAT_CONFIG[articuloSel.categoria].label],
                ['Unidad de medida', articuloSel.unidad],
                ['Stock actual', `${articuloSel.stock} ${articuloSel.unidad}`],
                ['Stock mínimo', `${articuloSel.stock_minimo} ${articuloSel.unidad}`],
                ['Stock máximo', `${articuloSel.stock_maximo} ${articuloSel.unidad}`],
                ['Costo unitario', fmt(articuloSel.costo_unitario)],
                ['Valor total', fmt(articuloSel.stock * articuloSel.costo_unitario)],
                ['Ubicación', articuloSel.ubicacion],
                articuloSel.proveedor ? ['Proveedor', articuloSel.proveedor] : null,
              ].filter(Boolean).map(([k, v]: any) => (
                <div key={k} className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <button className="w-full py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700">Registrar entrada</button>
              <button className="w-full py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50">Registrar salida</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
