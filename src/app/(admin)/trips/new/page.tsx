'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { TRIP_TYPE_LABELS } from '@/lib/utils'
import type { TripType, Vehicle, Driver } from '@/lib/types'
import { useEffect } from 'react'

export default function NewTripPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading]     = useState(false)
  const [vehicles, setVehicles]   = useState<Pick<Vehicle, 'id' | 'plate' | 'economic_number' | 'type' | 'capacity'>[]>([])
  const [drivers, setDrivers]     = useState<Pick<Driver, 'id' | 'first_name' | 'last_name'>[]>([])

  const [form, setForm] = useState({
    type:               'tourism' as TripType,
    origin_label:       '',
    destination_label:  '',
    departure_date:     '',
    departure_time:     '',
    capacity:           '',
    vehicle_id:         '',
    driver_id:          '',
    client_name:        '',
    notes:              '',
  })

  useEffect(() => {
    async function loadOptions() {
      const [{ data: v }, { data: d }] = await Promise.all([
        supabase.from('vehicles').select('id,plate,economic_number,type,capacity').eq('status','active').order('plate'),
        supabase.from('drivers').select('id,first_name,last_name').eq('status','active').order('last_name'),
      ])
      setVehicles(v ?? [])
      setDrivers(d ?? [])
    }
    loadOptions()
  }, [supabase])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Auto-llenar capacidad al elegir vehículo
  function handleVehicleChange(vehicleId: string) {
    set('vehicle_id', vehicleId)
    const v = vehicles.find((v: { id: string; capacity: number }) => v.id === vehicleId)
    if (v && !form.capacity) set('capacity', String(v.capacity))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.origin_label || !form.destination_label || !form.departure_date || !form.departure_time || !form.capacity) {
      toast.error('Completa los campos obligatorios: origen, destino, fecha, hora y capacidad')
      return
    }
    if (parseInt(form.capacity) < 1) {
      toast.error('La capacidad debe ser al menos 1')
      return
    }

    setLoading(true)
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        capacity: parseInt(form.capacity),
        vehicle_id: form.vehicle_id || undefined,
        driver_id:  form.driver_id  || undefined,
      }),
    })
    const result = await response.json()
    setLoading(false)

    if (!result.success) {
      toast.error(result.error ?? 'Error al crear el viaje')
      return
    }

    toast.success(`Viaje ${result.data.trip_number} creado exitosamente`)
    router.push(`/trips/${result.data.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo viaje</h1>
          <p className="text-sm text-gray-500">Completa la información del servicio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Tipo de servicio */}
        <div>
          <label className="label">Tipo de servicio *</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(TRIP_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Origen y Destino */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Origen *</label>
            <input className="input" placeholder="Ej: Cancún Centro" value={form.origin_label}
              onChange={e => set('origin_label', e.target.value)} />
          </div>
          <div>
            <label className="label">Destino *</label>
            <input className="input" placeholder="Ej: Tulum Ruinas" value={form.destination_label}
              onChange={e => set('destination_label', e.target.value)} />
          </div>
        </div>

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de salida *</label>
            <input type="date" className="input" value={form.departure_date}
              onChange={e => set('departure_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="label">Hora de salida *</label>
            <input type="time" className="input" value={form.departure_time}
              onChange={e => set('departure_time', e.target.value)} />
          </div>
        </div>

        {/* Unidad y capacidad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Unidad (opcional)</label>
            <select className="input" value={form.vehicle_id}
              onChange={e => handleVehicleChange(e.target.value)}>
              <option value="">— Sin asignar —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plate}{v.economic_number ? ` · #${v.economic_number}` : ''} ({v.capacity} lugares)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Capacidad máxima *</label>
            <input type="number" className="input" min="1" max="300" placeholder="45"
              value={form.capacity} onChange={e => set('capacity', e.target.value)} />
          </div>
        </div>

        {/* Operador */}
        <div>
          <label className="label">Operador (opcional)</label>
          <select className="input" value={form.driver_id}
            onChange={e => set('driver_id', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Cliente (para turismo/renta) */}
        {['tourism','rental','charter','executive','event'].includes(form.type) && (
          <div>
            <label className="label">Nombre del cliente / grupo</label>
            <input className="input" placeholder="Ej: Grupo XXXXXXXXXXX S.A. de C.V."
              value={form.client_name} onChange={e => set('client_name', e.target.value)} />
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="label">Notas internas</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Instrucciones especiales, punto de encuentro, contacto..."
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Link href="/trips" className="btn-secondary flex-1 justify-center">Cancelar</Link>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear viaje'}
          </button>
        </div>
      </form>
    </div>
  )
}
