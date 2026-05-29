import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success:false, error:'No autorizado' }, { status:401 })

  const { trip_id, trip_passenger_id, lat, lng, notes } = await req.json()
  if (!trip_id || !trip_passenger_id) return NextResponse.json({ success:false, error:'Faltan parámetros' }, { status:400 })

  const { data: trip } = await supabase.from('trips').select('id,status,capacity,organization_id').eq('id', trip_id).single()
  if (!trip) return NextResponse.json({ success:false, error:'Viaje no encontrado' }, { status:404 })
  if (!['boarding','in_transit'].includes(trip.status))
    return NextResponse.json({ success:false, error:`El viaje está en estado "${trip.status}"` }, { status:422 })

  const { data: tp } = await supabase.from('trip_passengers').select('id,boarding_status').eq('id', trip_passenger_id).eq('trip_id', trip_id).single()
  if (!tp) return NextResponse.json({ success:false, error:'Pasajero no encontrado en este viaje' }, { status:404 })
  if (tp.boarding_status === 'boarded') return NextResponse.json({ success:false, error:'Este pasajero ya abordó.' }, { status:409 })
  if (['absent','cancelled'].includes(tp.boarding_status))
    return NextResponse.json({ success:false, error:`Estado "${tp.boarding_status}" — contacta un administrador` }, { status:409 })

  const { count: boarded } = await supabase.from('trip_passengers').select('*', { count:'exact', head:true }).eq('trip_id', trip_id).eq('boarding_status','boarded')
  if ((boarded ?? 0) >= trip.capacity) return NextResponse.json({ success:false, error:'Capacidad máxima alcanzada' }, { status:422 })

  const now = new Date().toISOString()
  const { error } = await supabase.from('trip_passengers').update({ boarding_status:'boarded', boarded_at:now, boarded_by:user.id, boarding_lat:lat??null, boarding_lng:lng??null, boarding_notes:notes??null }).eq('id', trip_passenger_id)
  if (error) return NextResponse.json({ success:false, error:'Error al registrar' }, { status:500 })

  await supabase.from('boarding_events').insert({ trip_id, trip_passenger_id, organization_id:trip.organization_id, event_type:'boarded', performed_by:user.id, performed_at:now, lat:lat??null, lng:lng??null })

  const { count: newBoarded } = await supabase.from('trip_passengers').select('*', { count:'exact', head:true }).eq('trip_id', trip_id).eq('boarding_status','boarded')
  return NextResponse.json({ success:true, boarded_count: newBoarded, remaining: trip.capacity - (newBoarded ?? 0) })
}
