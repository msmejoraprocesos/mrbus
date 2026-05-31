import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Metadata } from 'next'
export const metadata: Metadata = { title: 'Contratos' }
export const dynamic = 'force-dynamic'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-green-100 text-green-700', active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-500', cancelled: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviado', signed: 'Firmado',
  active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
}

export default async function ContractsPage() {
  const supabase = createClient()
  const { data } = await supabase.from('contracts')
    .select('*, lead:leads(first_name,last_name,company)')
    .order('created_at', { ascending: false }).limit(100)
  const contracts = data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
        <Link href="/comercial/cotizacion/list" className="btn-secondary text-sm">Ver cotizaciones</Link>
      </div>
      <div className="card">
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p>No hay contratos aún</p>
            <p className="text-xs mt-1">Los contratos se generan desde una cotización aprobada</p>
            <Link href="/comercial/cotizacion/list" className="btn-primary mt-4">Ver cotizaciones</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                  {['Número','Cliente','Monto total','Anticipo','Estado','Vigencia',''].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contracts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 group">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{c.contract_number}</td>
                    <td className="px-4 py-3">
                      {c.lead
                        ? <div><p className="font-medium text-gray-900">{c.lead.first_name} {c.lead.last_name}</p>{c.lead.company && <p className="text-xs text-gray-400">{c.lead.company}</p>}</div>
                        : <span className="text-gray-400 text-xs">Sin cliente</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(c.total_amount ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(c.advance_amount ?? 0)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>{STATUS_LABELS[c.status] ?? c.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.valid_from && c.valid_until
                        ? `${new Date(c.valid_from + 'T12:00:00').toLocaleDateString('es-MX')} → ${new Date(c.valid_until + 'T12:00:00').toLocaleDateString('es-MX')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3"><Link href={`/comercial/contratos/${c.id}`} className="text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100">Ver →</Link></td>
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
