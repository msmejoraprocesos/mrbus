import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FileText, Truck, Receipt, ChevronRight, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Fiscal — MrBus' }

export default async function Page() {
  const supabase = await createClient()

  const [invoicesRes, cartaPorteRes] = await Promise.all([
    supabase.from('invoices').select('id, status'),
    supabase.from('shipping_orders').select('id, carta_porte_uuid').not('carta_porte_uuid', 'is', null),
  ])

  const invoices = invoicesRes.data ?? []
  const cartaPorte = cartaPorteRes.data ?? []

  const timbrados = invoices.filter(i => i.status === 'stamped').length
  const borradores = invoices.filter(i => i.status === 'draft').length
  const cancelados = invoices.filter(i => i.status === 'cancelled').length
  const cartaPorteCount = cartaPorte.length

  const modules = [
    {
      name: 'Facturación CFDI',
      desc: 'Emisión de facturas electrónicas CFDI 4.0. Timbrado automático.',
      href: '/fiscal/facturas',
      icon: FileText,
      color: '#C2410C',
      bg: '#FFEDD5',
      stats: [`${timbrados} timbradas`, `${borradores} borradores`, cancelados > 0 ? `${cancelados} canceladas` : ''],
      alert: false,
    },
    {
      name: 'Carta Porte',
      desc: 'Complemento Carta Porte 3.0 para transporte de mercancías.',
      href: '/fiscal/cartaporte',
      icon: Truck,
      color: '#7C3AED',
      bg: '#EDE9FE',
      stats: [`${cartaPorteCount} carta(s) porte`],
      alert: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Fiscal</h1>
        <p className="text-sm text-slate-500 mt-0.5">Facturación CFDI y Carta Porte para el SAT</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CFDIs timbrados',  value: String(timbrados),        color: '#C2410C', bg: '#FFEDD5', icon: Receipt },
          { label: 'Borradores',       value: String(borradores),       color: '#D97706', bg: '#FFFBEB', icon: FileText },
          { label: 'Cancelados',       value: String(cancelados),       color: cancelados > 0 ? '#DC2626' : '#16A34A', bg: cancelados > 0 ? '#FFF1F2' : '#F0FDF4', icon: AlertTriangle },
          { label: 'Cartas Porte',     value: String(cartaPorteCount),  color: '#7C3AED', bg: '#EDE9FE', icon: Truck },
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
