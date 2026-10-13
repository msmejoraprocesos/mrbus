import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Monitor, ShoppingCart, Warehouse, Box, Boxes, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Administración — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const [assetsRes, purchasesRes, warehousesRes, inventoryRes] = await Promise.all([
    supabase.from('fixed_assets').select('id, status'),
    supabase.from('purchase_orders').select('id, status'),
    supabase.from('warehouses').select('id, name'),
    supabase.from('inventory_items').select('id, stock, min_stock'),
  ])

  const assets = assetsRes.data ?? []
  const purchaseOrders = purchasesRes.data ?? []
  const warehouses = warehousesRes.data ?? []
  const inventory = inventoryRes.data ?? []

  const activeAssets = assets.filter(a => a.status === 'active').length
  const pendingPO = purchaseOrders.filter(p => p.status === 'pending' || p.status === 'approved').length
  const warehouseCount = warehouses.length
  const lowStockItems = inventory.filter(i => (i.stock ?? 0) <= (i.min_stock ?? 0)).length

  const modules = [
    {
      name: 'Activo Fijo',
      desc: 'Registro y depreciación de activos. Valor en libros y vida útil.',
      href: '/admin/activos',
      icon: Monitor,
      color: '#374151',
      bg: '#F3F4F6',
      stats: [`${activeAssets} activos registrados`],
      alert: false,
    },
    {
      name: 'Compras',
      desc: 'Órdenes de compra a proveedores. Aprobación y recepción.',
      href: '/admin/compras',
      icon: ShoppingCart,
      color: '#1D4ED8',
      bg: '#DBEAFE',
      stats: [pendingPO > 0 ? `${pendingPO} OC pendientes` : 'Sin órdenes pendientes'],
      alert: pendingPO > 0,
    },
    {
      name: 'Almacenes',
      desc: 'Control de almacenes de refacciones y materiales.',
      href: '/admin/almacenes',
      icon: Warehouse,
      color: '#D97706',
      bg: '#FFFBEB',
      stats: [`${warehouseCount} almacén(es)`],
      alert: false,
    },
    {
      name: 'Inventarios',
      desc: 'Control de refacciones y consumibles. Semáforo de stock.',
      href: '/admin/inventarios',
      icon: Box,
      color: '#16A34A',
      bg: '#F0FDF4',
      stats: [`${inventory.length} artículos`, lowStockItems > 0 ? `${lowStockItems} bajo mínimo` : 'Stock correcto'],
      alert: lowStockItems > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Activo fijo, compras, almacenes e inventarios</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activos registrados', value: String(activeAssets),   color: '#374151', bg: '#F3F4F6', icon: Monitor },
          { label: 'OC pendientes',       value: String(pendingPO),      color: pendingPO > 0 ? '#1D4ED8' : '#16A34A', bg: pendingPO > 0 ? '#DBEAFE' : '#F0FDF4', icon: ShoppingCart },
          { label: 'Almacenes',           value: String(warehouseCount), color: '#D97706', bg: '#FFFBEB', icon: Warehouse },
          { label: 'Artículos bajo mínimo', value: String(lowStockItems), color: lowStockItems > 0 ? '#DC2626' : '#16A34A', bg: lowStockItems > 0 ? '#FFF1F2' : '#F0FDF4', icon: AlertTriangle },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon size={14} style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(m => (
          <Link key={m.name} href={m.href}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-start gap-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
              <m.icon size={18} style={{ color: m.color }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">{m.name}</h3>
                {m.alert && <AlertTriangle size={12} className="text-amber-500" />}
              </div>
              <p className="text-xs text-slate-500 mb-2">{m.desc}</p>
              <div className="flex flex-wrap gap-2">
                {m.stats.filter(Boolean).map(s => (
                  <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
