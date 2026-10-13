'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmt, fmtDate, fmtN } from '@/lib/utils/index'
import { getNextFolio } from '@/lib/audit'
import { trazarMovimientoInventario, validateStockDisponible, redondearMonto } from '@/lib/trazabilidad'
import {
  Warehouse, Package, TrendingUp, TrendingDown, ArrowLeftRight,
  Plus, Search, Loader2, AlertTriangle, Check, X, Eye,
  RefreshCw, ClipboardList, Boxes
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Item = {
  id: string
  nombre: string
  sku: string
  categoria: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  stock_maximo: number
  precio_unitario: number
  ubicacion: string
  proveedor_id: string | null
  activo: boolean
  updated_at: string
}

type Movimiento = {
  id: string
  folio: string
  item_id: string
  item_nombre: string
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  cantidad_anterior: number
  cantidad_nueva: number
  motivo: string
  referencia: string
  created_at: string
  created_by: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = ['Refacciones motor', 'Neumáticos', 'Frenos', 'Eléctrico', 'Lubricantes', 'Carrocería', 'Herramientas', 'Limpieza', 'Seguridad', 'Papelería', 'Otro']
const UNIDADES = ['Pza', 'Lt', 'Kg', 'Ml', 'Par', 'Juego', 'Caja', 'Rollo', 'M', 'Galón']
const MOTIVOS_ENTRADA = ['Compra', 'Transferencia', 'Devolución', 'Ajuste positivo']
const MOTIVOS_SALIDA = ['Uso en mantenimiento', 'Transferencia', 'Merma', 'Ajuste negativo', 'Robo/Pérdida']

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AlmacenesPage() {
  const sb = createClient()

  const [tab, setTab] = useState<'stock' | 'movimientos' | 'nuevo_item' | 'movimiento'>('stock')
  const [items, setItems] = useState<Item[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [errores, setErrores] = useState<string[]>([])

  // Formulario nuevo artículo
  const [itemForm, setItemForm] = useState<Partial<Item>>({
    stock_actual: 0, stock_minimo: 0, stock_maximo: 100, precio_unitario: 0, activo: true,
  })

  // Formulario movimiento
  const [movForm, setMovForm] = useState({
    item_id: '',
    tipo: 'entrada' as 'entrada' | 'salida' | 'ajuste',
    cantidad: 0,
    motivo: '',
    referencia: '',
  })

  // ─── Carga ─────────────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true)
    const [itemsRes, movRes] = await Promise.all([
      sb.from('inventory_items')
        .select('*')
        .eq('activo', true)
        .order('nombre'),
      sb.from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    setItems((itemsRes.data || []) as Item[])
    setMovimientos((movRes.data || []) as Movimiento[])
    setLoading(false)
  }, [sb])

  useEffect(() => { cargar() }, [cargar])

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = {
    totalItems: items.length,
    bajoMinimo: items.filter(i => i.stock_actual <= i.stock_minimo).length,
    sinStock: items.filter(i => i.stock_actual === 0).length,
    valorTotal: items.reduce((s, i) => s + (i.stock_actual * i.precio_unitario), 0),
  }

  // ─── Filtrado ──────────────────────────────────────────────────────────────

  const filtrados = items.filter(i => {
    const match = busqueda === '' ||
      i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.sku?.toLowerCase().includes(busqueda.toLowerCase())
    const cat = filtroCategoria === 'todas' || i.categoria === filtroCategoria
    return match && cat
  })

  // ─── Guardar artículo ──────────────────────────────────────────────────────

  const guardarItem = async () => {
    const errs: string[] = []
    if (!itemForm.nombre?.trim()) errs.push('El nombre es requerido')
    if (!itemForm.unidad) errs.push('La unidad es requerida')
    if (errs.length > 0) { setErrores(errs); return }

    setSaving(true)
    try {
      const sku = itemForm.sku || `SKU-${Date.now().toString().slice(-6)}`
      const { error } = await sb.from('inventory_items').insert({
        nombre: itemForm.nombre,
        sku,
        categoria: itemForm.categoria || 'Otro',
        unidad: itemForm.unidad,
        stock_actual: itemForm.stock_actual || 0,
        stock_minimo: itemForm.stock_minimo || 0,
        stock_maximo: itemForm.stock_maximo || 100,
        precio_unitario: itemForm.precio_unitario || 0,
        ubicacion: itemForm.ubicacion || null,
        activo: true,
      })
      if (error) { setErrores([error.message]); return }
      await cargar()
      setItemForm({ stock_actual: 0, stock_minimo: 0, stock_maximo: 100, precio_unitario: 0, activo: true })
      setTab('stock')
    } finally {
      setSaving(false)
    }
  }

  // ─── Registrar movimiento ──────────────────────────────────────────────────

  const registrarMovimiento = async () => {
    const errs: string[] = []
    if (!movForm.item_id) errs.push('Selecciona un artículo')
    if (movForm.cantidad <= 0) errs.push('La cantidad debe ser mayor a 0')
    if (!movForm.motivo) errs.push('El motivo es requerido')
    if (errs.length > 0) { setErrores(errs); return }

    const item = items.find(i => i.id === movForm.item_id)
    if (!item) return

    // Validar stock en salidas
    if (movForm.tipo === 'salida') {
      const stockVal = await validateStockDisponible(item.id, movForm.cantidad, item.nombre)
      if (!stockVal.valid) { setErrores(stockVal.errors.map(e => e.message)); return }
    }

    setSaving(true)
    try {
      const folio = await getNextFolio('physical_inv')
      const cantAntes = item.stock_actual
      const cantDespues = movForm.tipo === 'entrada'
        ? cantAntes + movForm.cantidad
        : movForm.tipo === 'salida'
          ? cantAntes - movForm.cantidad
          : movForm.cantidad // ajuste = nuevo valor

      // Actualizar stock
      await sb.from('inventory_items')
        .update({ stock_actual: cantDespues, updated_at: new Date().toISOString() })
        .eq('id', item.id)

      // Registrar movimiento
      const { data: { user } } = await sb.auth.getUser()
      await sb.from('inventory_movements').insert({
        folio,
        item_id: item.id,
        item_nombre: item.nombre,
        tipo: movForm.tipo,
        cantidad: movForm.cantidad,
        cantidad_anterior: cantAntes,
        cantidad_nueva: cantDespues,
        motivo: movForm.motivo,
        referencia: movForm.referencia,
        created_by: user?.id,
      })

      // Audit trail
      await trazarMovimientoInventario({
        tipo: movForm.tipo,
        item_id: item.id,
        item_nombre: item.nombre,
        cantidad_antes: cantAntes,
        cantidad_despues: cantDespues,
        motivo: movForm.motivo,
        user_id: user?.id || '',
        reference_folio: folio,
      })

      await cargar()
      setMovForm({ item_id: '', tipo: 'entrada', cantidad: 0, motivo: '', referencia: '' })
      setErrores([])
      setTab('movimientos')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Almacén</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventario de refacciones, materiales y suministros</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setErrores([]); setTab('movimiento') }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <ArrowLeftRight className="w-4 h-4" /> Movimiento
          </button>
          <button
            onClick={() => { setErrores([]); setTab('nuevo_item') }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Nuevo artículo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Artículos en catálogo', value: fmtN(kpis.totalItems), icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Bajo stock mínimo', value: fmtN(kpis.bajoMinimo), icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Sin existencias', value: fmtN(kpis.sinStock), icon: X, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Valor en almacén', value: fmt(kpis.valorTotal), icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
            <k.icon className={`w-6 h-6 ${k.color}`} />
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'stock', label: 'Stock' },
          { id: 'movimientos', label: 'Movimientos' },
          { id: 'nuevo_item', label: 'Nuevo artículo' },
          { id: 'movimiento', label: 'Registrar movimiento' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STOCK ─────────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar artículo o SKU..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="todas">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando inventario...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
                      {['Artículo', 'SKU', 'Categoría', 'Unidad', 'Stock', 'Mín.', 'Precio unit.', 'Valor total', 'Ubicación', ''].map(h => (
                        <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">Sin artículos en almacén</td></tr>
                    ) : filtrados.map(item => {
                      const bajoMin = item.stock_actual <= item.stock_minimo
                      const sinStock = item.stock_actual === 0
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50 ${sinStock ? 'bg-red-50' : bajoMin ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {(bajoMin || sinStock) && (
                                <AlertTriangle className={`w-3.5 h-3.5 ${sinStock ? 'text-red-500' : 'text-yellow-500'}`} />
                              )}
                              <span className="font-medium">{item.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.sku}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{item.categoria}</td>
                          <td className="px-4 py-3 text-gray-500">{item.unidad}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${sinStock ? 'text-red-600' : bajoMin ? 'text-yellow-600' : 'text-gray-800'}`}>
                              {fmtN(item.stock_actual)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{fmtN(item.stock_minimo)}</td>
                          <td className="px-4 py-3">{fmt(item.precio_unitario)}</td>
                          <td className="px-4 py-3 font-medium">{fmt(item.stock_actual * item.precio_unitario)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{item.ubicacion || '—'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setMovForm(f => ({ ...f, item_id: item.id })); setTab('movimiento') }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              title="Registrar movimiento"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MOVIMIENTOS ────────────────────────────────────────────────────────── */}
      {tab === 'movimientos' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b bg-gray-50">
                  {['Folio', 'Fecha', 'Artículo', 'Tipo', 'Cantidad', 'Antes', 'Después', 'Motivo', 'Referencia'].map(h => (
                    <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movimientos.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Sin movimientos registrados</td></tr>
                ) : movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{m.folio}</td>
                    <td className="px-4 py-3">{fmtDate(m.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{m.item_nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                        m.tipo === 'salida' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {m.tipo === 'entrada' ? '↑ Entrada' : m.tipo === 'salida' ? '↓ Salida' : '⟳ Ajuste'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold ${m.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                      {m.tipo === 'salida' ? '-' : '+'}{fmtN(m.cantidad)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{fmtN(m.cantidad_anterior)}</td>
                    <td className="px-4 py-3 font-medium">{fmtN(m.cantidad_nueva)}</td>
                    <td className="px-4 py-3 text-gray-500">{m.motivo}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.referencia || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── NUEVO ARTÍCULO ─────────────────────────────────────────────────────── */}
      {tab === 'nuevo_item' && (
        <div className="max-w-2xl space-y-4">
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-sm text-red-700 space-y-0.5">{errores.map((e, i) => <li key={i}>• {e}</li>)}</ul>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Nuevo artículo de almacén
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={itemForm.nombre || ''} onChange={e => setItemForm(f => ({ ...f, nombre: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Ej. Filtro de aceite Freightliner" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Código</label>
                <input value={itemForm.sku || ''} onChange={e => setItemForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Auto-generado si se deja vacío" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={itemForm.categoria || 'Otro'} onChange={e => setItemForm(f => ({ ...f, categoria: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida *</label>
                <select value={itemForm.unidad || ''} onChange={e => setItemForm(f => ({ ...f, unidad: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">— Selecciona —</option>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                <input type="number" min={0} value={itemForm.stock_actual || ''} onChange={e => setItemForm(f => ({ ...f, stock_actual: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo (alerta)</label>
                <input type="number" min={0} value={itemForm.stock_minimo || ''} onChange={e => setItemForm(f => ({ ...f, stock_minimo: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario</label>
                <input type="number" min={0} value={itemForm.precio_unitario || ''} onChange={e => setItemForm(f => ({ ...f, precio_unitario: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación en almacén</label>
                <input value={itemForm.ubicacion || ''} onChange={e => setItemForm(f => ({ ...f, ubicacion: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Ej. Estante A-3" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setTab('stock')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarItem} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Crear artículo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTRAR MOVIMIENTO ───────────────────────────────────────────────── */}
      {tab === 'movimiento' && (
        <div className="max-w-xl space-y-4">
          {errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="text-sm text-red-700 space-y-0.5">{errores.map((e, i) => <li key={i}>• {e}</li>)}</ul>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
              Registrar movimiento de inventario
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Artículo *</label>
              <select value={movForm.item_id} onChange={e => setMovForm(f => ({ ...f, item_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="">— Selecciona artículo —</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.nombre} (Stock: {fmtN(i.stock_actual)} {i.unidad})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['entrada', 'salida', 'ajuste'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setMovForm(f => ({ ...f, tipo: t, motivo: '' }))}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                      movForm.tipo === t
                        ? t === 'entrada' ? 'bg-green-600 text-white' : t === 'salida' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'entrada' ? '↑ Entrada' : t === 'salida' ? '↓ Salida' : '⟳ Ajuste'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {movForm.tipo === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}
              </label>
              <input
                type="number" min={1}
                value={movForm.cantidad || ''}
                onChange={e => setMovForm(f => ({ ...f, cantidad: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
              <select value={movForm.motivo} onChange={e => setMovForm(f => ({ ...f, motivo: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="">— Selecciona motivo —</option>
                {(movForm.tipo === 'entrada' ? MOTIVOS_ENTRADA : movForm.tipo === 'salida' ? MOTIVOS_SALIDA : [...MOTIVOS_ENTRADA, ...MOTIVOS_SALIDA]).map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (OC, Orden de trabajo, etc.)</label>
              <input value={movForm.referencia} onChange={e => setMovForm(f => ({ ...f, referencia: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Ej. OC-00123" />
            </div>

            {/* Vista previa del movimiento */}
            {movForm.item_id && movForm.cantidad > 0 && (() => {
              const item = items.find(i => i.id === movForm.item_id)
              if (!item) return null
              const despues = movForm.tipo === 'entrada'
                ? item.stock_actual + movForm.cantidad
                : movForm.tipo === 'salida'
                  ? item.stock_actual - movForm.cantidad
                  : movForm.cantidad
              return (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-gray-500 mb-1">Vista previa del movimiento:</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{fmtN(item.stock_actual)} {item.unidad}</span>
                    <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                    <span className={`font-bold ${despues < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {fmtN(Math.max(0, despues))} {item.unidad}
                    </span>
                    {despues < 0 && <span className="text-xs text-red-500">⚠ Stock insuficiente</span>}
                  </div>
                </div>
              )
            })()}

            <div className="flex justify-between pt-2">
              <button onClick={() => setTab('stock')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={registrarMovimiento} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Registrando...' : 'Registrar movimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
