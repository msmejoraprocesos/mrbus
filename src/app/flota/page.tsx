import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Bus, Fuel, Wrench, Circle, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Flota — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const [vehiclesRes, fuelRes, maintRes, tiresRes] = await Promise.all([
    supabase.from('vehicles').select('id, status, make, model, license_plate').order('license_plate'),
    supabase.from('fuel_loads').select('id, created_at, total_cost').order('created_at', { ascending: false }).limit(5),
    supabase.from('maintenance_orders').select('id, status, blocks_vehicle').eq('status', 'open'),
    supabase.from('tire_inventory').select('id, life_pct, status').eq('status', 'active'),
  ])

  const vehicles = vehiclesRes.data ?? []
  const fuelLoads = fuelRes.data ?? []
  const maintOrders = maintRes.data ?? []
  const tires = tiresRes.data ?? []

  const activeVehicles = vehicles.filter(v => v.status === 'active').length
  const blockedVehicles = vehicles.filter(v => v.status === 'maintenance').length
  const openMaint = maintOrders.length
  const blockingMaint = maintOrders.filter(m => m.blocks_vehicle).length
  const wornTires = tires.filter(t => (t.life_pct ?? 0) > 80).length
  const fuelThisWeek = fuelLoads.reduce((s, f) => s + (f.total_cost ?? 0), 0)

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

  const modules = [
    {
      name: 'Unidades',
      desc: 'Catálogo de autobuses y camionetas.',
      href: '/flota/unidades',
      icon: Bus,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: [`${activeVehicles} activas`, `${blockedVehicles} en mantenimiento`],
      alert: blockedVehicles > 0,
    },
    {
      name: 'Combustible',
      desc: 'Registro de cargas y rendimiento km/litro.',
      href: '/flota/combustible',
      icon: Fuel,
      color: '#0891B2',
      bg: '#ECFEFF',
      stats: [fmt(fuelThisWeek) + ' últimas cargas'],
      alert: false,
    },
    {
      name: 'Mantenimiento',
      desc: 'Órdenes preventivas y correctivas.',
      href: '/flota/mantenimiento',
      icon: Wrench,
      color: '#D97706',
      bg: '#FFFBEB',
      stats: [`${openMaint} órdenes abiertas`, blockingMaint > 0 ? `${blockingMaint} bloquean unidad` : 'Sin bloqueos'],
      alert: blockingMaint > 0,
    },
    {
      name: 'Llantas',
      desc: 'Inventario y desgaste por unidad.',
      href: '/flota/llantas',
      icon: Circle,
      color: '#16A34A',
      bg: '#F0FDF4',
      stats: [`${tires.length} activas`, wornTires > 0 ? `${wornTires} con desgaste >80%` : 'Sin alertas de desgaste'],
      alert: wornTires > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Flota</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de unidades, combustible, mantenimiento y llantas</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Unidades activas',     value: String(activeVehicles),  color: '#7C3AED', bg: '#EDE9FE', icon: Bus },
          { label: 'En mantenimiento',     value: String(blockedVehicles), color: '#D97706', bg: '#FFFBEB', icon: Wrench },
          { label: 'Órdenes abiertas',     value: String(openMaint),       color: '#DC2626', bg: '#FFF1F2', icon: AlertTriangle },
          { label: 'Llantas con desgaste', value: String(wornTires),       color: '#16A34A', bg: '#F0FDF4', icon: Circle },
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
                {m.stats.map(s => (
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
