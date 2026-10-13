'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Package, Truck, Archive, ChevronRight, AlertTriangle } from 'lucide-react'

export default function Page() {
  const [guias, setGuias] = useState<any[]>([])
  const [enTransito, setEnTransito] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [guiasRes, entregasRes] = await Promise.all([
      supabase.from('shipping_orders').select('id, status').order('created_at', { ascending: false }).limit(200),
      supabase.from('shipping_orders').select('id, status').in('status', ['in_transit', 'out_for_delivery']),
    ])
    setGuias(guiasRes.data ?? [])
    setEnTransito(entregasRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalGuias = guias.length
  const pendientes = guias.filter(g => g.status === 'pending' || g.status === 'received').length
  const entregadas = guias.filter(g => g.status === 'delivered').length
  const transitoCount = enTransito.length

  const modules = [
    {
      name: 'Guías',
      desc: 'Generación y seguimiento de guías de envío. Folio y trazabilidad.',
      href: '/paqueteria/guias',
      icon: Package,
      color: '#475569',
      bg: '#F1F5F9',
      stats: [`${totalGuias} guías`, `${pendientes} pendientes`, `${entregadas} entregadas`],
      alert: false,
    },
    {
      name: 'Recolección y Entrega',
      desc: 'Rutas de recolección y entrega. Evidencia y firma digital.',
      href: '/paqueteria/entregas',
      icon: Truck,
      color: '#1D4ED8',
      bg: '#DBEAFE',
      stats: [`${transitoCount} en tránsito`],
      alert: false,
    },
    {
      name: 'Consolidación',
      desc: 'Agrupación de paquetes por ruta. Manifiestos por viaje.',
      href: '/paqueteria/consolidacion',
      icon: Archive,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: ['Próximamente'],
      alert: false,
    },
  ]

  if (loading) return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Paquetería</h1>
        <p className="text-sm text-slate-500 mt-0.5">Guías, recolección, entrega y consolidación de envíos</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total guías',    value: String(totalGuias),   color: '#475569', bg: '#F1F5F9', icon: Package },
          { label: 'Pendientes',     value: String(pendientes),   color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
          { label: 'En tránsito',    value: String(transitoCount), color: '#1D4ED8', bg: '#DBEAFE', icon: Truck },
          { label: 'Entregadas',     value: String(entregadas),   color: '#16A34A', bg: '#F0FDF4', icon: Archive },
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
