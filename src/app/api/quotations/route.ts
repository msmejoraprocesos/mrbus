import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await supabase.from('quotations')
    .select('*, lead:leads(first_name,last_name,company)')
    .order('created_at', { ascending: false })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { data: u } = await supabase.from('users').select('organization_id').eq('id', user.id).single()

  // Calcular versión
  let version = 1
  if (body.lead_id) {
    const { count } = await supabase.from('quotations')
      .select('*', { count: 'exact', head: true }).eq('lead_id', body.lead_id)
    version = (count ?? 0) + 1
  }

  const { data, error } = await supabase.from('quotations').insert({
    organization_id: u?.organization_id,
    lead_id: body.lead_id ?? null,
    version,
    service_type: body.service_type,
    tentative_date: body.tentative_date ?? null,
    cost_breakdown: body.cost_breakdown ?? {},
    client_price: body.client_price,
    margin_pct: body.margin_pct,
    payment_terms: body.payment_terms ?? {},
    notes: body.notes ?? null,
    status: 'draft',
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Guardar ruta si viene
  if (body.route) {
    await supabase.from('quotation_routes').insert({
      quotation_id: data.id,
      origin_name: body.route.origin_name,
      origin_lat: body.route.origin_lat ?? null,
      origin_lng: body.route.origin_lng ?? null,
      destination_name: body.route.destination_name,
      destination_lat: body.route.destination_lat ?? null,
      destination_lng: body.route.destination_lng ?? null,
      waypoints: body.route.waypoints ?? [],
      distance_km: body.route.distance_km ?? null,
      duration_min: body.route.duration_min ?? null,
      toll_cost: body.route.toll_cost ?? 0,
      round_trip: body.route.round_trip ?? false,
    })
  }

  // Actualizar stage del lead
  if (body.lead_id) {
    await supabase.from('leads').update({ pipeline_stage: 'quoted' }).eq('id', body.lead_id)
  }

  return NextResponse.json({ success: true, data })
}
