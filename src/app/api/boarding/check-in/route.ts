import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  let body: { trip_id: string; trip_passenger_id: string; lat?: number; lng?: number; notes?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 }) }

  const { trip_id, trip_passenger_id, lat, lng, notes } = body

  if (!trip_id || !trip_passenger_id) {
    return NextResponse.json({ success: false, error: 'trip_id y trip_passenger_id son obligatorios' }, { status: 400 })
  }

  // 1. Verificar viaje (RLS garantiza misma organización)
  const { data: trip } = await supabase
    .from('trips')
    .select('id, status, capacity, organization_id')
    .eq('id', trip_id)
    .single()

  if (!trip) return NextResponse.json({ success: false, error: 'Viaje no encontrado' }, { status: 404 })

  // 2. Validar estado del viaje
  if (!['boarding', 'in_transit'].includes(trip.status)) {
    return NextResponse.json({
      success: false,
      error: `El viaje está en estado "${trip.status}". Solo se puede abordar durante el abordaje o en tránsito.`
    }, { status: 422 })
  }

  // 3. Verificar pasajero en el viaje
  const { data: tp } = await supabase
    .from('trip_passengers')
    .select('id, boarding_status')
    .eq('id', trip_passenger_id)
    .eq('trip_id', trip_id)
    .single()

  if (!tp) return NextResponse.json({ success: false, error: 'Pasajero no encontrado en este viaje' }, { status: 404 })

  // 4. Anti-duplicado
  if (tp.boarding_status === 'boarded') {
    return NextResponse.json({ success: false, error: 'Este pasajero ya abordó.' }, { status: 409 })
  }
  if (['absent','cancelled'].includes(tp.boarding_status)) {
    return NextResponse.json({
      success: false,
      error: `El pasajero tiene estado "${tp.boarding_status}". Contacta a un administrador.`
    }, { status: 409 })
  }

  // 5. Anti-sobrecupo
  const { count: boarded } = await supabase
    .from('trip_passengers')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', trip_id)
    .eq('boarding_status', 'boarded')

  if ((boarded ?? 0) >= trip.capacity) {
    return NextResponse.json({ success: false, error: 'La unidad alcanzó su capacidad máxima.' }, { status: 422 })
  }

  // 6. Registrar abordaje
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('trip_passengers')
    .update({
      boarding_status: 'boarded',
      boarded_at:      now,
      boarded_by:      user.id,
      boarding_lat:    lat ?? null,
      boarding_lng:    lng ?? null,
      boarding_notes:  notes ?? null,
    })
    .eq('id', trip_passenger_id)

  if (updateError) return NextResponse.json({ success: false, error: 'Error al registrar' }, { status: 500 })

  // 7. Evento de auditoría
  await supabase.from('boarding_events').insert({
    trip_id,
    trip_passenger_id,
    organization_id: trip.organization_id,
    event_type:      'boarded',
    performed_by:    user.id,
    performed_at:    now,
    lat:             lat ?? null,
    lng:             lng ?? null,
    notes:           notes ?? null,
    metadata: {
      user_agent: req.headers.get('user-agent'),
      platform:   'web',
    }
  })

  // 8. Stats actualizadas
  const { count: newBoarded } = await supabase
    .from('trip_passengers')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', trip_id)
    .eq('boarding_status', 'boarded')

  return NextResponse.json({
    success: true,
    boarded_count: newBoarded ?? (boarded ?? 0) + 1,
    remaining: trip.capacity - (newBoarded ?? 0),
  })
}
