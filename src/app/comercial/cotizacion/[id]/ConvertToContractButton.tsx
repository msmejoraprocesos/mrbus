'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'

export default function ConvertToContractButton({ quotationId, leadId, serviceType, totalAmount }: {
  quotationId: string; leadId?: string; serviceType: string; totalAmount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function convert() {
    setLoading(true)
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quotation_id: quotationId,
        lead_id: leadId ?? null,
        service_type: serviceType,
        total_amount: totalAmount,
        advance_amount: totalAmount * 0.5,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      }),
    })
    const result = await res.json()
    setLoading(false)
    if (!result.success) { toast.error(result.error ?? 'Error'); return }
    toast.success('Contrato generado ✓')
    router.push(`/comercial/contratos/${result.data.id}`)
  }

  return (
    <button onClick={convert} disabled={loading} className="btn-primary">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      Convertir a contrato
    </button>
  )
}
