import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Cotizaciones' }
export const dynamic = 'force-dynamic'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada',
}
const SERVICE_LABELS: Record<string, string> = {
  tourism_b2b: 'Turismo B2B', agency_b2c: 'Agencia B2C', personnel: 'Personal',
  rental: 'Renta', executive: 'Ejecutivo', parcel_in_trip: 'Paquetería',
}

export default async function QuotationsListPage() {
  const supabase = createClient()
  const { data } = await supabase.from('quotations')
    .select('*, lead:leads(first_name,last_name,company)')
    .order('created_at', { ascending: false }).limit(100)
  const quotations = data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
        <Link href="/comercial/cotizacion" className="btn-primary"><Plus className="w-4 h-4" />Nueva cotización</Link>
      </div>
      <div className="card">
        {quotations.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay cotizaciones aún</p>
            <Link href="/comercial/cotizacion" className="btn-primary mt-4">Crear primera cotización</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                  {['Cliente','Servicio','V#','Precio','Estado','Fecha',''].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotations.map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50/50 group">
                    <td className="px-4 py-3">
                      {q.lead
                        ? <div><p className="font-medium text-gray-900">{q.lead.first_name} {q.lead.last_name}</p>{q.lead.company && <p className="text-xs text-gray-400">{q.lead.company}</p>}</div>
                        : <span className="text-gray-400 text-xs">Sin lead</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{SERVICE_LABELS[q.service_type] ?? q.service_type}</td>
                    <td className="px-4 py-3"><span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded font-bold">V{q.version}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(q.client_price ?? 0)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-500'}`}>{STATUS_LABELS[q.status] ?? q.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3"><Link href={`/comercial/cotizacion/${q.id}`} className="text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100">Ver →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
