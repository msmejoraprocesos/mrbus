import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, FileText } from 'lucide-react'
export const dynamic = 'force-dynamic'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

const STATUS_STEPS = ['draft','sent','signed','active','completed']
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviado al cliente', signed: 'Firmado',
  active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
}

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: c } = await supabase.from('contracts')
    .select('*, lead:leads(*), quotation:quotations(client_price,service_type,cost_breakdown,margin_pct)')
    .eq('id', params.id).single()
  if (!c) return notFound()

  const lead = c.lead as any
  const q = Array.isArray(c.quotation) ? c.quotation[0] : c.quotation as any
  const currentIdx = STATUS_STEPS.indexOf(c.status)

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/comercial/contratos" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{c.contract_number}</h1>
          {lead && <p className="text-sm text-gray-400">{lead.first_name} {lead.last_name} {lead.company ? `· ${lead.company}` : ''}</p>}
        </div>
      </div>

      {/* Stepper */}
      <div className="card p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_STEPS.map((s, idx) => {
            const isActive = c.status === s
            const isPast = currentIdx > idx
            return (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${isActive ? 'bg-green-600 text-white' : isPast ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                  {isPast && <CheckCircle className="w-3 h-3" />}
                  {STATUS_LABELS[s]}
                </div>
                {idx < STATUS_STEPS.length - 1 && <div className={`w-4 h-0.5 ${isPast ? 'bg-green-200' : 'bg-gray-100'}`} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Financiero */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Monto total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(c.total_amount ?? 0)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Anticipo (50%)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(c.advance_amount ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{c.advance_paid ? '✅ Pagado' : '⏳ Pendiente'}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Saldo restante</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{fmt((c.total_amount ?? 0) - (c.advance_amount ?? 0))}</p>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Datos del contrato</h3>
          {[
            ['Número', c.contract_number],
            ['Vigencia inicio', c.valid_from ? new Date(c.valid_from + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : null],
            ['Vigencia fin', c.valid_until ? new Date(c.valid_until + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : null],
            ['Firmado el', c.signed_at ? new Date(c.signed_at + 'T12:00:00').toLocaleDateString('es-MX') : 'Pendiente de firma'],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l as string}>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">{l}</p>
              <p className="text-sm text-gray-800 mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        {lead && (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Cliente</h3>
            {[
              ['Nombre', `${lead.first_name} ${lead.last_name}`],
              ['Empresa', lead.company],
              ['RFC', lead.rfc],
              ['Teléfono', lead.phone],
              ['Email', lead.email],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string}>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">{l}</p>
                <p className="text-sm text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        {c.quotation_id && (
          <Link href={`/comercial/cotizacion/${c.quotation_id}`} className="btn-secondary">
            <FileText className="w-4 h-4" />Ver cotización original
          </Link>
        )}
        {lead && (
          <Link href={`/comercial/crm/${lead.id}`} className="btn-secondary">
            Ver lead en CRM
          </Link>
        )}
      </div>
    </div>
  )
}
