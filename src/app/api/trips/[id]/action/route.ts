import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  'start-boarding': { from:['scheduled'], to:'boarding' },
  'start-trip':     { from:['boarding'], to:'in_transit' },
  'complete':       { from:['in_transit'], to:'completed' },
  'cancel':         { from:['draft','scheduled','boarding','in_transit'], to:'cancelled' },
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success:false, error:'No autorizado' }, { status:401 })

  const { action } = await req.json()
  const transition = TRANSITIONS[action]
  if (!transition) return NextResponse.json({ success:false, error:'Acción inválida' }, { status:400 })

  const { data: trip } = await supabase.from('trips').select('status,capacity').eq('id', params.id).single()
  if (!trip) return NextResponse.json({ success:false, error:'Viaje no encontrado' }, { status:404 })
  if (!transition.from.includes(trip.status))
    return NextResponse.json({ success:false, error:`No se puede '${action}' desde '${trip.status}'` }, { status:422 })

  if (action === 'start-boarding') {
    const { count } = await supabase.from('trip_passengers').select('*', { count:'exact', head:true }).eq('trip_id', params.id).not('boarding_status','eq','cancelled')
    if ((count ?? 0) === 0) return NextResponse.json({ success:false, error:'Agrega pasajeros antes de abrir el abordaje' }, { status:422 })
  }

  const update: Record<string,unknown> = { status: transition.to }
  if (action === 'start-trip') update.started_at = new Date().toISOString()
  if (action === 'complete') {
    update.completed_at = new Date().toISOString()
    await supabase.from('trip_passengers').update({ boarding_status:'absent' }).eq('trip_id', params.id).eq('boarding_status','pending')
  }

  const { error } = await supabase.from('trips').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ success:false, error:error.message }, { status:500 })
  return NextResponse.json({ success:true, status: transition.to })
}
