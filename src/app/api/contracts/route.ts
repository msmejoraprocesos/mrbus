import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await supabase.from('contracts')
    .select('*, lead:leads(first_name,last_name,company), quotation:quotations(client_price,service_type)')
    .order('created_at', { ascending: false })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { data: u } = await supabase.from('users').select('organization_id').eq('id', user.id).single()

  const { count } = await supabase.from('contracts')
    .select('*', { count: 'exact', head: true }).eq('organization_id', u?.organization_id)
  const contractNumber = `CTR-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`

  const { data, error } = await supabase.from('contracts').insert({
    organization_id: u?.organization_id,
    quotation_id: body.quotation_id,
    lead_id: body.lead_id ?? null,
    contract_number: contractNumber,
    service_type: body.service_type,
    signed_at: body.signed_at ?? null,
    valid_from: body.valid_from ?? null,
    valid_until: body.valid_until ?? null,
    total_amount: body.total_amount,
    advance_amount: body.advance_amount ?? null,
    status: 'draft',
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar cotización a aprobada y lead a confirmado
  if (body.quotation_id) {
    await supabase.from('quotations').update({ status: 'approved' }).eq('id', body.quotation_id)
  }
  if (body.lead_id) {
    await supabase.from('leads').update({ pipeline_stage: 'confirmed' }).eq('id', body.lead_id)
  }

  return NextResponse.json({ success: true, data })
}
