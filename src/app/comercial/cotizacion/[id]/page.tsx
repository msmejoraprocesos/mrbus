import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle, Send } from 'lucide-react'
import ConvertToContractButton from './ConvertToContractButton'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo / Excursión B2B', agency_b2c: 'Agencia B2C',
  personnel: 'Transporte de Personal', rental: 'Renta con operador',
  executive: 'Traslado Ejecutivo', parcel_in_trip: 'Paquetería en viaje',
  parcel_dedicated: 'Paquetería dedicada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600', expired: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', viewed: 'Vista',
  approved: 'Aprobada', rejected: 'Rechazada', expired: 'Expirada',
}

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: q } = await supabase.from('quotations')
    .select('*, lead:leads(*), route:quotation_routes(*)')
    .eq('id', params.id).single()
  if (!q) return notFound()

  const cb = q.cost_breakdown as any ?? {}
  const route = Array.isArray(q.route) ? q.route[0] : q.route

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/comercial/contratos" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Cotización V{q.version}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[q.status]}`}>
                {STATUS_LABELS[q.status]}
              </span>
            </div>
            {q.lead && <p className="text-sm text-gray-400">{(q.lead as any).first_name} {(q.lead as any).last_name} · {(q.lead as any).company}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {q.status === 'draft' && (
            <ConvertToContractButton quotationId={q.id} leadId={(q.lead as any)?.id} serviceType={q.service_type ?? ''} totalAmount={q.client_price ?? 0} />
          )}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Costo real</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{fmt(cb.total_cost ?? 0)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Margen</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{q.margin_pct}%</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Precio al cliente</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(q.client_price ?? 0)}</p>
          <p className="text-xs text-green-500">Utilidad: {fmt((q.client_price ?? 0) - (cb.total_cost ?? 0))}</p>
        </div>
      </div>

      {/* Detalle */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Detalle del servicio</h3>
          {[
            ['Tipo', SERVICE_LABELS[q.service_type ?? ''] ?? q.service_type],
            ['Origen', route?.origin_name],
            ['Destino', route?.destination_name],
            ['Distancia', route?.distance_km ? `${route.distance_km} km ${route.round_trip ? '(ida y vuelta)' : '(ida)'}` : null],
            ['Casetas', route?.toll_cost ? fmt(route.toll_cost * (route.round_trip ? 2 : 1)) : null],
            ['Días', cb.days ? `${cb.days} día(s)` : null],
            ['Fecha tentativa', q.tentative_date ? new Date(q.tentative_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : null],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
              <p className="text-sm text-gray-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="card p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Desglose de costos</h3>
          {[
            ['Combustible', cb.fuel],
            ['Casetas', cb.tolls],
            ['Operador', cb.driver],
            ['Mantenimiento', cb.maintenance],
            ['Llantas', cb.tires],
            ['Aceite', cb.oil],
            ['Seguro', cb.insurance],
            ['Permiso SCT', cb.sct],
            ['Registro', cb.registration],
            ['GPS', cb.gps],
            ['Overhead (10%)', cb.overhead],
          ].filter(([, v]) => v > 0).map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-xs">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-700">{fmt(value as number)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold">
            <span>Total costo</span><span className="text-red-500">{fmt(cb.total_cost ?? 0)}</span>
          </div>
        </div>
      </div>

      {q.notes && (
        <div className="card p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Notas</p>
          <p className="text-sm text-gray-700">{q.notes}</p>
        </div>
      )}
    </div>
  )
}
