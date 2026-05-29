import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success:false, error:'No autorizado' }, { status:401 })

  const body = await req.json()
  const { type, origin_label, destination_label, departure_date, departure_time, capacity, vehicle_id, driver_id, client_name, notes } = body

  if (!origin_label || !destination_label || !departure_date || !departure_time || !capacity)
    return NextResponse.json({ success:false, error:'Faltan campos obligatorios' }, { status:400 })

  const { data: u } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!u) return NextResponse.json({ success:false, error:'Usuario no encontrado' }, { status:404 })

  const { count } = await supabase.from('trips').select('*', { count:'exact', head:true }).eq('organization_id', u.organization_id)
  const tripNum = `VJ-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: trip, error } = await supabase.from('trips').insert({
    organization_id: u.organization_id, trip_number: tripNum,
    type: type ?? 'tourism', origin_label, destination_label, departure_date, departure_time,
    capacity, vehicle_id: vehicle_id ?? null, driver_id: driver_id ?? null,
    client_name: client_name ?? null, notes: notes ?? null, status:'scheduled', created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ success:false, error:'Error al crear' }, { status:500 })
  return NextResponse.json({ success:true, data: trip })
}
