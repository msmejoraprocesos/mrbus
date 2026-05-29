import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success:false, error:'No autorizado' }, { status:401 })

  const { first_name, last_name, phone, payment_status = 'pending', payment_amount } = await req.json()
  if (!first_name || !last_name) return NextResponse.json({ success:false, error:'Nombre y apellido requeridos' }, { status:400 })

  const { data: trip } = await supabase.from('trips').select('capacity,status,organization_id').eq('id', params.id).single()
  if (!trip) return NextResponse.json({ success:false, error:'Viaje no encontrado' }, { status:404 })
  if (!['draft','scheduled','boarding'].includes(trip.status))
    return NextResponse.json({ success:false, error:'No se pueden agregar pasajeros en este estado' }, { status:422 })

  const { count } = await supabase.from('trip_passengers').select('*', { count:'exact', head:true }).eq('trip_id', params.id).not('boarding_status','eq','cancelled')
  if ((count ?? 0) >= trip.capacity) return NextResponse.json({ success:false, error:`Cupo lleno (${trip.capacity})` }, { status:422 })

  const { data, error } = await supabase.from('trip_passengers').insert({
    trip_id: params.id, organization_id: trip.organization_id,
    first_name, last_name, phone: phone || null, payment_status,
    payment_amount: payment_amount ?? null, boarding_status:'pending',
    added_by: user.id, added_at: new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ success:false, error:error.message }, { status:500 })
  return NextResponse.json({ success:true, data })
}
