import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import { MapPin, Clock, Users, CheckCircle, Plus, TrendingUp, DollarSign, UserCheck, CalendarDays, ArrowRight } from 'lucide-react'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, formatDate, formatTime, cn } from '@/lib/utils/index'

export const metadata: Metadata = { title: 'Dashboard — MrBus' }
export const dynamic = 'force-dynamic'

const fmtMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

export default async function DashboardPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // ── Datos operativos ────────────────────────────────────────────
  const [
    { data: trips },
    { data: leadsData },
    { data: pendientesData },
    { data: cotizacionesData },
  ] = await Promise.all([
    supabase.from('trips')
      .select('*, vehicle:vehicles(plate), driver:drivers(first_name, last_name)')
      .eq('departure_date', today)
      .neq('status', 'cancelled')
      .order('departure_time'),
    supabase.from('leads')
      .select('id, pipeline_stage, valor_estimado, ultimo_contacto')
      .neq('pipeline_stage', 'lost'),
    supabase.from('lead_actividades')
      .select('id, tipo, titulo, fecha, leads(first_name, last_name, company)')
      .gte('fecha', today + 'T00:00:00')
      .lte('fecha', today + 'T23:59:59')
      .eq('estatus', 'pendiente')
      .order('fecha', { ascending: true }),
    supabase.from('quotations')
      .select('id, total_amount, status, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }),
  ])

  const tripList = trips ?? []
  const tripIds = tripList.map((t: { id: string }) => t.id)

  const { data: paxData } = tripIds.length > 0
    ? await supabase.from('trip_passengers').select('trip_id, boarding_status').in('trip_id', tripIds)
    : { data: [] }

  const counts = (paxData ?? []).reduce((acc: Record<string, { total: number; boarded: number }>, p: { trip_id: string; boarding_status: string }) => {
    if (!acc[p.trip_id]) acc[p.trip_id] = { total: 0, boarded: 0 }
    acc[p.trip_id].total++
    if (p.boarding_status === 'boarded') acc[p.trip_id].boarded++
    return acc
  }, {})

  // ── KPIs operativos ─────────────────────────────────────────────
  const kpisOp = {
    total: tripList.length,
    active: tripList.filter((t: { status: string }) => ['boarding', 'in_transit'].includes(t.status)).length,
    passengers: Object.values(counts).reduce((s: number, c) => s + (c as { total: number; boarded: number }).total, 0),
    boarded: Object.values(counts).reduce((s: number, c) => s + (c as { total: number; boarded: number }).boarded, 0),
  }

  // ── KPIs CRM ────────────────────────────────────────────────────
  const leads = leadsData ?? []
  const totalPipeline = leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0)
  const leadsActivos = leads.filter(l => !['lost', 'confirmed'].includes(l.pipeline_stage)).length
  const leadsConfirmados = leads.filter(l => l.pipeline_stage === 'confirmed').length

  // Semáforo: leads sin contacto hace ≥7 días
  const ahora = new Date()
  const sinContacto = leads.filter(l => {
    if (!l.ultimo_contacto) return true
    const dias = (ahora.getTime() - new Date(l.ultimo_contacto).getTime()) / (1000 * 60 * 60 * 24)
    return dias >= 7
  }).length

  // ── KPIs cotizaciones últimos 30 días ────────────────────────────
  const cotz = cotizacionesData ?? []
  const montoCotz30 = cotz.filter(c => c.status !== 'rejected').reduce((s, c) => s + (c.total_amount ?? 0), 0)
  const cotzAprobadas = cotz.filter(c => c.status === 'approved').length

  const pendientes = pendientesData ?? []

  const TIPO_ICONS: Record<string, string> = { llamada: '📞', cita: '📅', email: '✉️', whatsapp: '💬', nota: '📝' }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(today)}</p>
        </div>
        <Link href="/comercial/cotizacion" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva cotización
        </Link>
      </div>

      {/* Alerta leads sin contacto */}
      {sinContacto > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔴</span>
            <div>
              <span className="font-700 text-red-800 font-bold">{sinContacto} {sinContacto === 1 ? 'lead sin' : 'leads sin'} contacto</span>
              <span className="text-red-700 text-sm ml-2">hace 7+ días</span>
            </div>
          </div>
          <Link href="/comercial/crm" className="text-sm font-semibold text-red-700 hover:text-red-900 flex items-center gap-1">
            Ver CRM <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPIs fila 1: operativos */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Operaciones hoy</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { label: 'Viajes hoy', value: kpisOp.total as React.ReactNode, icon: <MapPin className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50', href: '/operacion' },
            { label: 'En movimiento', value: kpisOp.active as React.ReactNode, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50', href: '/operacion' },
            { label: 'Pasajeros', value: kpisOp.passengers as React.ReactNode, icon: <Users className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50', href: '/operacion' },
            { label: 'Abordaron', value: kpisOp.boarded as React.ReactNode, icon: <CheckCircle className="w-5 h-5 text-green-500" />, bg: 'bg-green-50', href: '/operacion' },
          ] as const).map(k => (
            <Link key={k.label} href={k.href} className="card p-5 hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{k.value}</p>
                </div>
                <div className={cn('p-2.5 rounded-xl', k.bg)}>{k.icon}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs fila 2: comercial */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comercial</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pipeline activo', value: fmtMXN(totalPipeline), icon: <TrendingUp className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50', href: '/comercial/crm' },
            { label: 'Leads activos', value: leadsActivos, icon: <UserCheck className="w-5 h-5 text-cyan-500" />, bg: 'bg-cyan-50', href: '/comercial/crm' },
            { label: 'Confirmados', value: leadsConfirmados, icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50', href: '/comercial/crm' },
            { label: 'Cotizaciones 30d', value: fmtMXN(montoCotz30), icon: <DollarSign className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50', href: '/comercial/cotizacion/list' },
          ].map(k => (
            <Link key={k.label} href={k.href} className="card p-5 hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1 leading-tight">{k.value}</p>
                </div>
                <div className={cn('p-2.5 rounded-xl', k.bg)}>{k.icon}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Grid: viajes del día + pendientes hoy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Viajes del día */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Viajes del día</h2>
              <Link href="/operacion" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {tripList.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <MapPin className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No hay viajes programados para hoy</p>
                <Link href="/comercial/cotizacion" className="btn-primary mt-4 text-sm">Nueva cotización</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                      {['Folio', 'Ruta', 'Hora', 'Unidad', 'Abordaje', 'Estado'].map(h => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tripList.map((trip: { id: string; trip_number: string; origin_label: string; destination_label: string; departure_time: string; status: string; vehicle: { plate: string } | null; driver: { first_name: string; last_name: string } | null }) => {
                      const c = counts[trip.id] ?? { total: 0, boarded: 0 }
                      const pct = c.total > 0 ? Math.round(c.boarded / c.total * 100) : 0
                      const statusColor = TRIP_STATUS_COLORS[trip.status] ?? 'bg-gray-100 text-gray-600'
                      return (
                        <tr key={trip.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{trip.trip_number}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-xs leading-tight">{trip.origin_label}</div>
                            <div className="text-gray-400 text-xs">→ {trip.destination_label}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{formatTime(trip.departure_time)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{trip.vehicle?.plate ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{c.boarded}/{c.total}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor)}>
                              {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                            </span>
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

        {/* Pendientes hoy */}
        <div>
          <div className="card h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                Pendientes hoy
              </h2>
              <Link href="/comercial/seguimiento" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                Agenda <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {pendientes.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <CheckCircle className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Sin pendientes hoy</p>
                <Link href="/comercial/seguimiento" className="text-blue-600 text-xs mt-2 hover:underline">
                  + Agendar actividad
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pendientes.slice(0, 8).map((a: any) => {
                  const hora = new Date(a.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  const lead = a.leads ? `${a.leads.first_name} ${a.leads.last_name}` : null
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50">
                      <span className="text-base mt-0.5">{TIPO_ICONS[a.tipo] ?? '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{a.titulo}</div>
                        {lead && <div className="text-xs text-gray-400 truncate">{lead}</div>}
                      </div>
                      <div className="text-xs text-gray-400 shrink-0 mt-0.5">{hora}</div>
                    </div>
                  )
                })}
                {pendientes.length > 8 && (
                  <div className="px-5 py-3 text-xs text-gray-400 text-center">
                    +{pendientes.length - 8} más en la agenda
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'CRM', href: '/comercial/crm', emoji: '🎯' },
            { label: 'Seguimiento', href: '/comercial/seguimiento', emoji: '📅' },
            { label: 'Cotizaciones', href: '/comercial/cotizacion/list', emoji: '💰' },
            { label: 'Contratos', href: '/comercial/contratos', emoji: '📝' },
            { label: 'Flota', href: '/flota', emoji: '🚌' },
            { label: 'Finanzas', href: '/finanzas', emoji: '📊' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow text-center">
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-xs font-semibold text-gray-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
