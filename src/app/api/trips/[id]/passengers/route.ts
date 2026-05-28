import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const tripId = params.id
  const body = await req.json()
  const { first_name, last_name, phone, payment_status = 'pending', payment_amount } = body

  if (!first_name || !last_name) {
    return NextResponse.json({ success: false, error: 'Nombre y apellido son obligatorios' }, { status: 400 })
  }

  // Obtener datos del viaje
  const { data: trip } = await supabase
    .from('trips')
    .select('capacity, status, organization_id')
    .eq('id', tripId)
    .single()

  if (!trip) return NextResponse.json({ success: false, error: 'Viaje no encontrado' }, { status: 404 })

  if (!['draft','scheduled','boarding'].includes(trip.status)) {
    return NextResponse.json({
      success: false,
      error: 'No se pueden agregar pasajeros a un viaje en tránsito o completado'
    }, { status: 422 })
  }

  // Verificar cupo
  const { count: current } = await supabase
    .from('trip_passengers')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .not('boarding_status', 'eq', 'cancelled')

  if ((current ?? 0) >= trip.capacity) {
    return NextResponse.json({
      success: false,
      error: `El viaje está lleno (capacidad: ${trip.capacity})`
    }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('trip_passengers')
    .insert({
      trip_id: tripId,
      organization_id: trip.organization_id,
      first_name,
      last_name,
      phone: phone || null,
      payment_status,
      payment_amount: payment_amount ?? null,
      boarding_status: 'pending',
      added_by: user.id,
      added_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
