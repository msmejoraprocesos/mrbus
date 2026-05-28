import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { type, origin_label, destination_label, departure_date, departure_time,
          capacity, vehicle_id, driver_id, client_name, notes } = body

  if (!origin_label || !destination_label || !departure_date || !departure_time || !capacity) {
    return NextResponse.json({ success: false, error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  if (capacity < 1 || capacity > 300) {
    return NextResponse.json({ success: false, error: 'Capacidad inválida (1-300)' }, { status: 400 })
  }

  // Obtener org del usuario
  const { data: userRow } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })

  // Generar número de viaje
  const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true })
    .eq('organization_id', userRow.organization_id)
  const tripNum = `VJ-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`

  // Validar vehículo si se especificó
  if (vehicle_id) {
    const { data: veh } = await supabase.from('vehicles').select('status,capacity').eq('id', vehicle_id).single()
    if (!veh || veh.status !== 'active') {
      return NextResponse.json({ success: false, error: 'La unidad no está disponible' }, { status: 422 })
    }
    if (capacity > veh.capacity) {
      return NextResponse.json({
        success: false,
        error: `La capacidad (${capacity}) no puede superar la de la unidad (${veh.capacity})`
      }, { status: 422 })
    }
  }

  // Validar operador si se especificó
  if (driver_id) {
    const { data: drv } = await supabase.from('drivers').select('status').eq('id', driver_id).single()
    if (!drv || drv.status !== 'active') {
      return NextResponse.json({ success: false, error: 'El operador no está disponible' }, { status: 422 })
    }
  }

  const { data: trip, error } = await supabase.from('trips').insert({
    organization_id: userRow.organization_id,
    trip_number:     tripNum,
    type:            type ?? 'tourism',
    origin_label,
    destination_label,
    departure_date,
    departure_time,
    capacity,
    vehicle_id:      vehicle_id ?? null,
    driver_id:       driver_id  ?? null,
    client_name:     client_name ?? null,
    notes:           notes ?? null,
    status:          'scheduled',
    created_by:      user.id,
  }).select().single()

  if (error) {
    console.error('Error creating trip:', error)
    return NextResponse.json({ success: false, error: 'Error al crear el viaje' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: trip })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const date   = searchParams.get('date')

  let query = supabase
    .from('trips')
    .select('*, vehicle:vehicles(plate,type), driver:drivers(first_name,last_name)')
    .order('departure_date', { ascending: false })

  if (status) query = query.eq('status', status)
  if (date)   query = query.eq('departure_date', date)

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}
