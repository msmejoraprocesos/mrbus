import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TripStatus } from '@/lib/types'

// Cambios de estado permitidos
const TRANSITIONS: Record<string, { from: TripStatus[], to: TripStatus }> = {
  'start-boarding': { from: ['scheduled'],              to: 'boarding' },
  'start-trip':     { from: ['boarding'],               to: 'in_transit' },
  'complete':       { from: ['in_transit'],             to: 'completed' },
  'cancel':         { from: ['draft','scheduled','boarding','in_transit'], to: 'cancelled' },
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const { id, action } = params
  const transition = TRANSITIONS[action]

  if (!transition) {
    return NextResponse.json({ success: false, error: 'Acción inválida' }, { status: 400 })
  }

  // Obtener viaje actual
  const { data: trip } = await supabase.from('trips').select('status, capacity').eq('id', id).single()
  if (!trip) return NextResponse.json({ success: false, error: 'Viaje no encontrado' }, { status: 404 })

  if (!transition.from.includes(trip.status as TripStatus)) {
    return NextResponse.json({
      success: false,
      error: `No se puede ejecutar '${action}' desde el estado '${trip.status}'`
    }, { status: 422 })
  }

  // Validaciones adicionales
  if (action === 'start-boarding') {
    const { count } = await supabase
      .from('trip_passengers')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', id)
      .not('boarding_status', 'eq', 'cancelled')
    if ((count ?? 0) === 0) {
      return NextResponse.json({
        success: false,
        error: 'Agrega al menos un pasajero antes de abrir el abordaje'
      }, { status: 422 })
    }
  }

  const updateData: Record<string, unknown> = {
    status: transition.to,
    updated_at: new Date().toISOString(),
  }

  if (action === 'start-trip')  updateData.started_at   = new Date().toISOString()
  if (action === 'complete')    updateData.completed_at  = new Date().toISOString()

  // Marcar ausentes al completar
  if (action === 'complete') {
    await supabase
      .from('trip_passengers')
      .update({ boarding_status: 'absent', updated_at: new Date().toISOString() })
      .eq('trip_id', id)
      .eq('boarding_status', 'pending')
  }

  const { error } = await supabase.from('trips').update(updateData).eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status: transition.to })
}
