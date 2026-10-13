'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'
import { TRIP_TYPE_LABELS } from '@/lib/utils/index'
import { FieldLabel } from '@/components/ui/Tooltip'

export default function NewTripPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<{ id: string; plate: string; economic_number: string | null; capacity: number }[]>([])
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [form, setForm] = useState({ type:'tourism', origin_label:'', destination_label:'', departure_date:'', departure_time:'', capacity:'', vehicle_id:'', driver_id:'', client_name:'', notes:'' })

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: d }] = await Promise.all([
        supabase.from('vehicles').select('id,plate,economic_number,capacity').eq('status','active').order('plate'),
        supabase.from('drivers').select('id,first_name,last_name').eq('status','active').order('last_name'),
      ])
      setVehicles(v ?? [])
      setDrivers(d ?? [])
    }
    load()
  }, [])

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  function onVehicleChange(id: string) {
    set('vehicle_id', id)
    const v = vehicles.find(x => x.id === id)
    if (v && !form.capacity) set('capacity', String(v.capacity))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.origin_label || !form.destination_label || !form.departure_date || !form.departure_time || !form.capacity) {
      toast.error('Completa todos los campos obligatorios'); return
    }
    setLoading(true)
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, capacity: parseInt(form.capacity), vehicle_id: form.vehicle_id || undefined, driver_id: form.driver_id || undefined }),
    })
    const result = await res.json()
    setLoading(false)
    if (!result.success) { toast.error(result.error ?? 'Error al crear'); return }
    toast.success(`Viaje ${result.data.trip_number} creado`)
    router.push(`/trips/${result.data.id}`)
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col" style={{ animation: 'modal-in 0.15s ease-out' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h1 className="text-[15px] font-semibold text-slate-800">Nuevo viaje</h1>
          <button onClick={() => router.back()} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh] p-6 space-y-5">
          <div>
            <FieldLabel required tooltip="Define la categoría del viaje para la operación y facturación">
              Tipo de servicio
            </FieldLabel>
            <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
              {Object.entries(TRIP_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Origen</FieldLabel>
              <input className="input" placeholder="Ej: Ciudad de México" value={form.origin_label} onChange={e => set('origin_label', e.target.value)} />
            </div>
            <div>
              <FieldLabel required>Destino</FieldLabel>
              <input className="input" placeholder="Ej: Cancún" value={form.destination_label} onChange={e => set('destination_label', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Fecha</FieldLabel>
              <input type="date" className="input" value={form.departure_date} onChange={e => set('departure_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <FieldLabel required>Hora de salida</FieldLabel>
              <input type="time" className="input" value={form.departure_time} onChange={e => set('departure_time', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Unidad</FieldLabel>
              <select className="input" value={form.vehicle_id} onChange={e => onVehicleChange(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}{v.economic_number ? ` · #${v.economic_number}` : ''} ({v.capacity})</option>)}
              </select>
            </div>
            <div>
              <FieldLabel required tooltip="Se llena automáticamente al seleccionar la unidad">
                Capacidad
              </FieldLabel>
              <input type="number" className="input" min="1" max="300" placeholder="45" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel tooltip="Solo aparecen operadores con licencia vigente">
              Operador
            </FieldLabel>
            <select className="input" value={form.driver_id} onChange={e => set('driver_id', e.target.value)}>
              <option value="">— Sin asignar —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
            </select>
          </div>
          {['tourism','rental','charter','executive','event'].includes(form.type) && (
            <div>
              <FieldLabel>Cliente / Grupo</FieldLabel>
              <input className="input" placeholder="Nombre del cliente o grupo" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
            </div>
          )}
          <div>
            <FieldLabel>Notas</FieldLabel>
            <textarea className="input resize-none" rows={3} placeholder="Instrucciones especiales..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</> : 'Crear viaje'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
